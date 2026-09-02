/**
 * Radial Graph Component
 * D3.js force-directed graph visualization
 * Per PRD: Central user node, connected domain nodes, 60fps @ 500 nodes
 */

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { getGeoCache } from '../utils/db.js';
import { TRACKING_PLATFORMS } from '../../lib/tracking-platforms.js';
import '../styles/RadialGraph.css';

function RadialGraph({
  footprints,
  stats,
  externalPlatformFocus,
  onPlatformFocusChange,
}) {
  const svgRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [focusedPlatform, setFocusedPlatform] = useState(null); // Track platform-centric view
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    data: null,
  });
  const prevNodesRef = useRef([]);

  // Sync external platform focus with internal state
  useEffect(() => {
    if (!externalPlatformFocus) {
      setFocusedPlatform(null);
      return;
    }

    const platformId =
      externalPlatformFocus.platform || externalPlatformFocus.platformId;

    if (!platformId) {
      setFocusedPlatform(null);
      return;
    }

    const selectedDomainId =
      externalPlatformFocus.selectedDomainId ||
      externalPlatformFocus.id ||
      null;

    setFocusedPlatform({
      platform: platformId,
      selectedDomainId,
    });
  }, [externalPlatformFocus]);

  useEffect(() => {
    if (!footprints || footprints.length === 0 || !svgRef.current) {
      return;
    }

    // Incremental data-join: previous positions preserved via prevNodesRef
    // The SVG and defs are rebuilt/reused as needed by the join below.

    // Prepare data - group by domain, track platform and per-platform counts
    const domainCounts = {};
    const domainPlatforms = {}; // Track which platform each domain uses
    const platformDomainCounts = {}; // Track domain counts scoped to each platform

    footprints.forEach(fp => {
      const platform = fp.platform || 'facebook';
      domainCounts[fp.domain] = (domainCounts[fp.domain] || 0) + 1;

      // Store the first platform seen for this domain
      if (!domainPlatforms[fp.domain]) {
        domainPlatforms[fp.domain] = platform;
      }

      if (!platformDomainCounts[platform]) {
        platformDomainCounts[platform] = {};
      }
      platformDomainCounts[platform][fp.domain] =
        (platformDomainCounts[platform][fp.domain] || 0) + 1;
    });

    let nodes, links, centerNode;

    // Platform-centric view: show selected platform at center with its domains
    if (focusedPlatform) {
      const platformId = focusedPlatform.platform || focusedPlatform.platformId;
      const platformConfig = TRACKING_PLATFORMS[platformId] || {
        color: '#4a90e2',
        name: 'Unknown',
      };

      const platformDomainMap = platformDomainCounts[platformId] || {};
      const centerDomainCount = Object.values(platformDomainMap).reduce(
        (sum, count) => sum + count,
        0
      );
      const domainTotal = Object.keys(platformDomainMap).length;

      // Center node represents the platform itself
      centerNode = {
        id: platformId,
        type: 'platform-center',
        label: platformConfig.name,
        platform: platformId,
        platformName: platformConfig.name,
        size: 25,
        color: platformConfig.color,
        count: centerDomainCount,
        domainTotal,
      };

      // Get all domains from the same platform using scoped counts
      const platformDomains = Object.keys(platformDomainMap).map(
        (domain, index) => {
          const config = TRACKING_PLATFORMS[platformId] || {
            color: '#4a90e2',
            name: 'Unknown',
          };
          const count = platformDomainMap[domain];

          return {
            id: domain,
            type: 'domain',
            label: domain,
            platform: platformId,
            platformName: config.name,
            count,
            size: Math.min(Math.max(count * 2, 8), 20),
            color: config.color,
            index,
          };
        }
      );

      nodes = [centerNode, ...platformDomains];
      links = platformDomains.map(node => ({
        source: centerNode.id,
        target: node.id,
        value: node.count,
      }));
    } else {
      // User-centric view: show user at center with all domains
      centerNode = {
        id: 'user',
        type: 'user',
        label: 'You',
        size: 20,
        color: '#00d4aa',
      };

      const domainNodes = Object.keys(domainCounts).map((domain, index) => {
        const platform = domainPlatforms[domain] || 'facebook';
        const platformConfig = TRACKING_PLATFORMS[platform] || {
          color: '#4a90e2',
          name: 'Unknown',
        };

        return {
          id: domain,
          type: 'domain',
          label: domain,
          platform: platform,
          platformName: platformConfig.name,
          count: domainCounts[domain],
          size: Math.min(Math.max(domainCounts[domain] * 2, 8), 20),
          color: platformConfig.color, // Use platform-specific color
          index,
        };
      });

      nodes = [centerNode, ...domainNodes];
      links = domainNodes.map(node => ({
        source: 'user',
        target: node.id,
        value: node.count,
      }));
    }

    // Preserve previous node positions for smooth incremental updates
    const prevNodesMap = new Map(
      (prevNodesRef.current || []).map(n => [n.id, n])
    );
    nodes = nodes.map(n => {
      const prev = prevNodesMap.get(n.id);
      if (prev && typeof prev.x === 'number' && typeof prev.y === 'number') {
        return {
          ...n,
          x: prev.x,
          y: prev.y,
          vx: prev.vx || 0,
          vy: prev.vy || 0,
          fx: prev.fx !== undefined ? prev.fx : null,
          fy: prev.fy !== undefined ? prev.fy : null,
        };
      }
      return n;
    });

    // Setup SVG
    const svg = d3.select(svgRef.current);
    const container = svg.node().parentElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    svg.attr('width', width).attr('height', height);

    // Fix user node at center
    centerNode.fx = width / 2;
    centerNode.fy = height / 2;

    // Create force simulation
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink(links)
          .id(d => d.id)
          .distance(d => 150 - d.value * 2)
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'collision',
        d3.forceCollide().radius(d => d.size + 10)
      );

    // Create/reuse arrow markers (only once)
    if (svg.select('defs').empty()) {
      svg
        .append('defs')
        .append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '-0 -5 10 10')
        .attr('refX', 15)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .append('svg:path')
        .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
        .attr('fill', '#666');
    }

    // Create/reuse zoom group (only set up zoom behavior once)
    let g = svg.select('g.zoom-group');
    if (g.empty()) {
      g = svg.append('g').attr('class', 'zoom-group');
      const zoom = d3
        .zoom()
        .scaleExtent([0.5, 3])
        .on('zoom', event => {
          g.attr('transform', event.transform);
        });
      svg.call(zoom);
    }

    // Reuse links subgroup; create only if missing
    let linksGroup = g.select('g.links');
    if (linksGroup.empty()) {
      linksGroup = g.append('g').attr('class', 'links');
    }

    // Reuse nodes subgroup; create only if missing
    let nodesGroup = g.select('g.nodes');
    if (nodesGroup.empty()) {
      nodesGroup = g.append('g').attr('class', 'nodes');
    }

    // Helper to format node label text
    function formatNodeLabel(d) {
      if (d.type === 'user') return d.label;
      if (d.type === 'platform-center') return d.platformName;
      let domain = d.label;
      if (domain.startsWith('www.')) domain = domain.substring(4);
      const parts = domain.split('.');
      if (parts.length > 2) domain = parts.slice(-2).join('.');
      return domain;
    }

    // Keyed identity for links: source-target pair
    function linkKey(d) {
      const s =
        d.source && d.source.id
          ? d.source.id
          : typeof d.source === 'string'
            ? d.source
            : '';
      const t =
        d.target && d.target.id
          ? d.target.id
          : typeof d.target === 'string'
            ? d.target
            : '';
      return s + '-' + t;
    }

    // Incremental data-join for links
    const link = linksGroup
      .selectAll('line')
      .data(links, linkKey)
      .join(
        enter =>
          enter
            .append('line')
            .attr('stroke', '#666')
            .attr('stroke-opacity', 0.6)
            .attr('stroke-width', d => Math.min(d.value / 2, 3))
            .attr('marker-end', 'url(#arrowhead)'),
        update => update.attr('stroke-width', d => Math.min(d.value / 2, 3)),
        exit =>
          exit.transition().duration(300).attr('stroke-opacity', 0).remove()
      );

    // Keyed identity for nodes
    function nodeKey(d) {
      return d.id;
    }

    // Incremental data-join for nodes (keyed by node.id)
    const node = nodesGroup
      .selectAll('g.node')
      .data(nodes, nodeKey)
      .join(
        enter => {
          const enterG = enter
            .append('g')
            .attr('class', 'node')
            .attr('opacity', 0)
            .attr(
              'transform',
              d =>
                `translate(${typeof d.x === 'number' ? d.x : width / 2},${
                  typeof d.y === 'number' ? d.y : height / 2
                })`
            )
            .call(
              d3
                .drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended)
            )
            .on('mouseenter', function (event, d) {
              setTooltip({
                visible: true,
                x: event.pageX,
                y: event.pageY,
                data: d,
              });
              d3.select(this).select('circle').attr('stroke-width', 3);
            })
            .on('mouseleave', function () {
              setTooltip({ visible: false, x: 0, y: 0, data: null });
              d3.select(this).select('circle').attr('stroke-width', 2);
            })
            .on('click', (event, d) => {
              if (d.type === 'domain') {
                const now = Date.now();
                if (d.lastClickTime && now - d.lastClickTime < 300) {
                  const platformFocus = {
                    platform: d.platform,
                    platformId: d.platform,
                    selectedDomainId: d.id,
                  };
                  setFocusedPlatform(platformFocus);
                  setSelectedNode(null);
                  if (onPlatformFocusChange) {
                    onPlatformFocusChange(platformFocus);
                  }
                } else {
                  d.lastClickTime = now;
                  setSelectedNode(d);
                }
              } else {
                setSelectedNode(d);
              }
            });
          enterG
            .append('circle')
            .attr('r', d => d.size)
            .attr('fill', d => d.color)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);
          enterG
            .append('text')
            .attr('class', 'node-label')
            .text(formatNodeLabel)
            .attr('x', 0)
            .attr('y', d => d.size + 15)
            .attr('text-anchor', 'middle')
            .attr('font-size', d =>
              d.type === 'platform-center' ? '14px' : '12px'
            )
            .attr('font-weight', d =>
              d.type === 'platform-center' ? 'bold' : 'normal'
            )
            .attr('fill', '#e0e0e0')
            .attr('pointer-events', 'none');
          enterG
            .filter(d => d.type === 'domain' || d.type === 'platform-center')
            .append('text')
            .attr('class', 'node-count')
            .text(d => d.count)
            .attr('x', 0)
            .attr('y', 5)
            .attr('text-anchor', 'middle')
            .attr('font-size', d =>
              d.type === 'platform-center' ? '12px' : '10px'
            )
            .attr('font-weight', 'bold')
            .attr('fill', '#fff')
            .attr('pointer-events', 'none');
          return enterG.transition().duration(500).attr('opacity', 1);
        },
        update => {
          // Update existing nodes' inner attributes smoothly
          update
            .select('circle')
            .attr('r', d => d.size)
            .attr('fill', d => d.color);
          update
            .select('.node-label')
            .text(formatNodeLabel)
            .attr('font-size', d =>
              d.type === 'platform-center' ? '14px' : '12px'
            )
            .attr('font-weight', d =>
              d.type === 'platform-center' ? 'bold' : 'normal'
            );
          update
            .select('.node-count')
            .filter(d => d.type === 'domain' || d.type === 'platform-center')
            .text(d => d.count);
          return update;
        },
        exit => exit.transition().duration(300).attr('opacity', 0).remove()
      );

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      // Don't allow dragging the center node (user or platform-center)
      if (d.type !== 'user' && d.type !== 'platform-center') {
        d.fx = d.x;
        d.fy = d.y;
      }
    }

    function dragged(event, d) {
      // Don't allow dragging the center node (user or platform-center)
      if (d.type !== 'user' && d.type !== 'platform-center') {
        d.fx = event.x;
        d.fy = event.y;
      }
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      // Don't allow dragging the center node (user or platform-center)
      if (d.type !== 'user' && d.type !== 'platform-center') {
        d.fx = null;
        d.fy = null;
      }
    }

    // Cleanup
    return () => {
      simulation.stop();
      // Persist final node positions for smooth incremental updates on next render
      prevNodesRef.current = nodes.map(n => ({ ...n }));
    };
  }, [footprints, focusedPlatform]);

  // Calculate which platforms are detected
  const detectedPlatforms = React.useMemo(() => {
    if (!footprints || footprints.length === 0) return [];
    const platforms = new Set(footprints.map(fp => fp.platform || 'facebook'));
    return Array.from(platforms).map(platformId => ({
      id: platformId,
      ...(TRACKING_PLATFORMS[platformId] || {
        name: 'Unknown',
        color: '#4a90e2',
      }),
    }));
  }, [footprints]);

  const platformViewLabel = React.useMemo(() => {
    if (!focusedPlatform) return null;
    const platformId = focusedPlatform.platform || focusedPlatform.platformId;
    if (!platformId) return null;
    return TRACKING_PLATFORMS[platformId]?.name || platformId;
  }, [focusedPlatform]);

  return (
    <div className="radial-graph-container">
      <div className="graph-controls">
        {focusedPlatform && (
          <button
            className="control-button back-button"
            onClick={() => {
              setFocusedPlatform(null);
              if (onPlatformFocusChange) {
                onPlatformFocusChange(null);
              }
            }}
            title="Back to user view"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"
              />
            </svg>
            <span style={{ marginLeft: '5px' }}>Back to User View</span>
          </button>
        )}
        <button
          className="control-button"
          onClick={() => {
            const svg = d3.select(svgRef.current);
            svg
              .transition()
              .duration(750)
              .call(d3.zoom().transform, d3.zoomIdentity);
          }}
          title="Reset zoom"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z" />
            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
          </svg>
        </button>
        <div className="zoom-hint">
          {focusedPlatform
            ? `Platform view: ${platformViewLabel || 'Selected Platform'} • Double-click domain to explore`
            : 'Drag to pan • Scroll to zoom • Double-click domain to explore platform'}
        </div>
      </div>

      {/* Platform Legend */}
      {detectedPlatforms.length > 0 && (
        <div className="platform-legend">
          <div className="legend-title">Platforms Detected:</div>
          {detectedPlatforms.map(platform => (
            <div key={platform.id} className="legend-item">
              <div
                className="legend-color"
                style={{ backgroundColor: platform.color }}
              ></div>
              <span className="legend-label">{platform.name}</span>
            </div>
          ))}
        </div>
      )}

      <svg ref={svgRef} className="radial-graph-svg"></svg>

      {tooltip.visible && tooltip.data && (
        <div
          className="graph-tooltip"
          style={{
            left: `${tooltip.x + 10}px`,
            top: `${tooltip.y + 10}px`,
          }}
        >
          <div className="tooltip-header">
            {tooltip.data.type === 'user' ? (
              <>
                <strong>Your Identity</strong>
                <p>Central node in tracking network</p>
              </>
            ) : tooltip.data.type === 'platform-center' ? (
              <>
                <strong>{tooltip.data.label}</strong>
                <p>{tooltip.data.count} tracking events</p>
                <p style={{ color: tooltip.data.color }}>
                  Platform: {tooltip.data.platformName}
                </p>
                {typeof tooltip.data.domainTotal === 'number' && (
                  <p style={{ fontSize: '11px', marginTop: '5px' }}>
                    Showing {tooltip.data.domainTotal} domain
                    {tooltip.data.domainTotal === 1 ? '' : 's'} from this
                    platform
                  </p>
                )}
              </>
            ) : (
              <>
                <strong>{tooltip.data.label}</strong>
                <p>{tooltip.data.count} tracking events</p>
                {tooltip.data.platformName && (
                  <p style={{ color: tooltip.data.color }}>
                    Platform: {tooltip.data.platformName}
                  </p>
                )}
                <p style={{ fontSize: '11px', marginTop: '5px' }}>
                  Double-click to explore platform
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {selectedNode && selectedNode.type === 'domain' && (
        <div className="node-detail-panel">
          <div className="detail-panel-header">
            <h3>{selectedNode.label}</h3>
            <button
              className="close-button"
              onClick={() => setSelectedNode(null)}
            >
              ×
            </button>
          </div>
          <div className="detail-panel-body">
            {selectedNode.platformName && (
              <div className="detail-stat">
                <span className="detail-label">Platform:</span>
                <span
                  className="detail-value"
                  style={{ color: selectedNode.color }}
                >
                  {selectedNode.platformName}
                </span>
              </div>
            )}
            <div className="detail-stat">
              <span className="detail-label">Tracking Events:</span>
              <span className="detail-value">{selectedNode.count}</span>
            </div>
            <div className="detail-stat">
              <span className="detail-label">First Seen:</span>
              <span className="detail-value">
                {new Date(
                  footprints.find(f => f.domain === selectedNode.id)?.timestamp
                ).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RadialGraph;
