/**
 * Radial Graph Component
 * D3.js force-directed graph visualization
 * Per PRD: Central user node, connected domain nodes, 60fps @ 500 nodes
 */

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { getGeoCache } from '../utils/db.js';
import { TRACKING_PLATFORMS } from '../../lib/pixel-detector.js';
import '../styles/RadialGraph.css';

function RadialGraph({ footprints, stats }) {
  const svgRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [focusedPlatform, setFocusedPlatform] = useState(null); // Track platform-centric view
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    data: null,
  });

  useEffect(() => {
    if (!footprints || footprints.length === 0 || !svgRef.current) {
      return;
    }

    // Clear previous graph
    d3.select(svgRef.current).selectAll('*').remove();

    // Prepare data - group by domain and track platform
    const domainCounts = {};
    const domainPlatforms = {}; // Track which platform each domain uses

    footprints.forEach(fp => {
      domainCounts[fp.domain] = (domainCounts[fp.domain] || 0) + 1;
      // Store the first platform seen for this domain
      if (!domainPlatforms[fp.domain]) {
        domainPlatforms[fp.domain] = fp.platform || 'facebook';
      }
    });

    let nodes, links, centerNode;

    // Platform-centric view: show selected domain/platform at center
    if (focusedPlatform) {
      const platformConfig = TRACKING_PLATFORMS[focusedPlatform.platform] || {
        color: '#4a90e2',
        name: 'Unknown',
      };

      // Center node is the selected domain
      centerNode = {
        id: focusedPlatform.id,
        type: 'platform-center',
        label: focusedPlatform.label,
        platform: focusedPlatform.platform,
        platformName: platformConfig.name,
        size: 25,
        color: platformConfig.color,
        count: focusedPlatform.count,
      };

      // Get all domains from the same platform
      const platformDomains = Object.keys(domainCounts)
        .filter(domain => {
          const platform = domainPlatforms[domain] || 'facebook';
          return platform === focusedPlatform.platform && domain !== focusedPlatform.id;
        })
        .map((domain, index) => {
          const platform = domainPlatforms[domain] || 'facebook';
          const config = TRACKING_PLATFORMS[platform] || {
            color: '#4a90e2',
            name: 'Unknown',
          };

          return {
            id: domain,
            type: 'domain',
            label: domain,
            platform: platform,
            platformName: config.name,
            count: domainCounts[domain],
            size: Math.min(Math.max(domainCounts[domain] * 2, 8), 20),
            color: config.color,
            index,
          };
        });

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

    // Create arrow markers for links
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

    // Create container for zoom
    const g = svg.append('g');

    // Add zoom behavior
    const zoom = d3
      .zoom()
      .scaleExtent([0.5, 3])
      .on('zoom', event => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Create links
    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#666')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.min(d.value / 2, 3))
      .attr('marker-end', 'url(#arrowhead)');

    // Create node groups
    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .call(
        d3
          .drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
      )
      .on('mouseenter', function (event, d) {
        // Show tooltip
        setTooltip({
          visible: true,
          x: event.pageX,
          y: event.pageY,
          data: d,
        });

        // Highlight node
        d3.select(this).select('circle').attr('stroke-width', 3);
      })
      .on('mouseleave', function () {
        // Hide tooltip
        setTooltip({ visible: false, x: 0, y: 0, data: null });

        // Remove highlight
        d3.select(this).select('circle').attr('stroke-width', 2);
      })
      .on('click', (event, d) => {
        // Double-click on domain node to focus on platform
        if (d.type === 'domain') {
          // Check if this is a double-click (within 300ms)
          const now = Date.now();
          if (d.lastClickTime && now - d.lastClickTime < 300) {
            // Double-click: switch to platform-centric view
            setFocusedPlatform({
              id: d.id,
              label: d.label,
              platform: d.platform,
              count: d.count,
            });
            setSelectedNode(null);
          } else {
            // Single click: show detail panel
            d.lastClickTime = now;
            setSelectedNode(d);
          }
        } else {
          setSelectedNode(d);
        }
      });

    // Add circles to nodes
    node
      .append('circle')
      .attr('r', d => d.size)
      .attr('fill', d => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Add labels to nodes
    node
      .append('text')
      .text(d => {
        if (d.type === 'user') return d.label;
        if (d.type === 'platform-center') return d.platformName;

        // Extract meaningful domain name
        let domain = d.label;

        // Remove www. prefix
        if (domain.startsWith('www.')) {
          domain = domain.substring(4);
        }

        // For very long domains, show just the main part (e.g., "google.com" instead of "analytics.google.com")
        const parts = domain.split('.');
        if (parts.length > 2) {
          // Show last 2 parts (e.g., "linkedin.com" from "snap.linkedin.com")
          domain = parts.slice(-2).join('.');
        }

        return domain;
      })
      .attr('x', 0)
      .attr('y', d => d.size + 15)
      .attr('text-anchor', 'middle')
      .attr('font-size', d => (d.type === 'platform-center' ? '14px' : '12px'))
      .attr('font-weight', d => (d.type === 'platform-center' ? 'bold' : 'normal'))
      .attr('fill', '#e0e0e0')
      .attr('pointer-events', 'none');

    // Add count badges for domain nodes and platform-center
    node
      .filter(d => d.type === 'domain' || d.type === 'platform-center')
      .append('text')
      .text(d => d.count)
      .attr('x', 0)
      .attr('y', 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', d => (d.type === 'platform-center' ? '12px' : '10px'))
      .attr('font-weight', 'bold')
      .attr('fill', '#fff')
      .attr('pointer-events', 'none');

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

  return (
    <div className="radial-graph-container">
      <div className="graph-controls">
        {focusedPlatform && (
          <button
            className="control-button back-button"
            onClick={() => setFocusedPlatform(null)}
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
            ? `Platform view: ${focusedPlatform.label} • Double-click domain to explore`
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
                <p style={{ fontSize: '11px', marginTop: '5px' }}>
                  Showing all {tooltip.data.platformName} domains
                </p>
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
