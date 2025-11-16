/**
 * Bipartite Graph Component
 * D3.js bipartite graph visualization showing Ad Platforms ↔ Domain Names
 * Left column: Domain Names | Right column: Ad Platforms | Edges: tracking relationships
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import html2canvas from 'html2canvas';
import { TRACKING_PLATFORMS } from '../../lib/pixel-detector.js';
import '../styles/BipartiteGraph.css';

function BipartiteGraph({ footprints, stats }) {
  const svgRef = useRef(null);
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    data: null,
    type: null, // 'domain', 'platform', or 'edge'
  });
  const [selectedNode, setSelectedNode] = useState(null);
  const [isolatedView, setIsolatedView] = useState(null); // { type: 'domain'/'platform', id: string }

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState('all');
  const [minDetections, setMinDetections] = useState(1);
  const [showMultiPlatformOnly, setShowMultiPlatformOnly] = useState(false);
  const [showWidespreadOnly, setShowWidespreadOnly] = useState(false);

  // Sorting
  const [domainSort, setDomainSort] = useState('platforms-desc'); // 'alpha', 'platforms-desc', 'detections-desc'
  const [platformSort, setPlatformSort] = useState('domains-desc'); // 'alpha', 'domains-desc', 'detections-desc'

  // Panel visibility toggles
  const [showFilters, setShowFilters] = useState(true);
  const [showSorting, setShowSorting] = useState(true);
  const [showStatistics, setShowStatistics] = useState(true);
  const [showLegend, setShowLegend] = useState(true);

  // Transform footprints into bipartite graph structure
  const graphData = useMemo(() => {
    if (!footprints || footprints.length === 0) {
      return { domains: [], platforms: [], edges: [] };
    }

    // Build domain-to-platforms mapping
    const domainMap = {}; // domain -> { platforms: {platform: count}, total: count, firstSeen, lastSeen }
    const platformMap = {}; // platform -> { domains: {domain: count}, total: count }

    footprints.forEach(fp => {
      const domain = fp.domain;
      const platform = fp.platform || 'unknown';
      const timestamp = fp.timestamp;

      // Update domain map
      if (!domainMap[domain]) {
        domainMap[domain] = {
          platforms: {},
          total: 0,
          firstSeen: timestamp,
          lastSeen: timestamp,
          pixelTypes: new Set(),
        };
      }
      domainMap[domain].platforms[platform] = (domainMap[domain].platforms[platform] || 0) + 1;
      domainMap[domain].total += 1;
      domainMap[domain].firstSeen = Math.min(domainMap[domain].firstSeen, timestamp);
      domainMap[domain].lastSeen = Math.max(domainMap[domain].lastSeen, timestamp);
      domainMap[domain].pixelTypes.add(fp.pixelType || 'unknown');

      // Update platform map
      if (!platformMap[platform]) {
        platformMap[platform] = {
          domains: {},
          total: 0,
        };
      }
      platformMap[platform].domains[domain] = (platformMap[platform].domains[domain] || 0) + 1;
      platformMap[platform].total += 1;
    });

    // Create domain nodes
    let domains = Object.keys(domainMap).map(domain => {
      const data = domainMap[domain];
      const platformCount = Object.keys(data.platforms).length;
      const topPlatforms = Object.entries(data.platforms)
        .sort((a, b) => b[1] - a[1])
        .map(([platform, count]) => ({
          platform,
          count,
          name: TRACKING_PLATFORMS[platform]?.name || platform,
          color: TRACKING_PLATFORMS[platform]?.color || '#4a90e2',
        }));

      return {
        id: domain,
        type: 'domain',
        label: domain,
        platformCount,
        platforms: topPlatforms,
        detections: data.total,
        firstSeen: data.firstSeen,
        lastSeen: data.lastSeen,
        pixelTypes: Array.from(data.pixelTypes),
        // Color: use primary platform color, or gradient for multi-platform
        color: platformCount === 1
          ? topPlatforms[0].color
          : platformCount <= 3
          ? topPlatforms.slice(0, 2).map(p => p.color)
          : '#ff6b6b', // Red for many platforms
        isMultiPlatform: platformCount >= 2,
      };
    });

    // Create platform nodes
    let platforms = Object.keys(platformMap).map(platform => {
      const data = platformMap[platform];
      const domainCount = Object.keys(data.domains).length;
      const platformConfig = TRACKING_PLATFORMS[platform] || {
        name: platform,
        color: '#4a90e2',
      };
      const topDomains = Object.entries(data.domains)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([domain, count]) => ({ domain, count }));

      return {
        id: platform,
        type: 'platform',
        label: platformConfig.name || platform,
        platformId: platform,
        domainCount,
        domains: topDomains,
        detections: data.total,
        color: platformConfig.color,
        isWidespread: domainCount >= 5,
      };
    });

    // Create edges
    const edges = [];
    domains.forEach(domain => {
      domain.platforms.forEach(platformData => {
        edges.push({
          source: domain.id,
          target: platformData.platform,
          detections: platformData.count,
          platformColor: platformData.color,
          firstSeen: domain.firstSeen,
          lastSeen: domain.lastSeen,
        });
      });
    });

    return { domains, platforms, edges };
  }, [footprints]);

  // Apply filters
  const filteredData = useMemo(() => {
    let { domains, platforms, edges } = graphData;

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      domains = domains.filter(d => d.label.toLowerCase().includes(term));
      const domainIds = new Set(domains.map(d => d.id));
      edges = edges.filter(e => domainIds.has(e.source));
      const platformIds = new Set(edges.map(e => e.target));
      platforms = platforms.filter(p => platformIds.has(p.id));
    }

    // Filter by platform
    if (selectedPlatformFilter !== 'all') {
      edges = edges.filter(e => e.target === selectedPlatformFilter);
      const domainIds = new Set(edges.map(e => e.source));
      domains = domains.filter(d => domainIds.has(d.id));
      platforms = platforms.filter(p => p.id === selectedPlatformFilter);
    }

    // Filter by minimum detections
    if (minDetections > 1) {
      edges = edges.filter(e => e.detections >= minDetections);
      const domainIds = new Set(edges.map(e => e.source));
      const platformIds = new Set(edges.map(e => e.target));
      domains = domains.filter(d => domainIds.has(d.id));
      platforms = platforms.filter(p => platformIds.has(p.id));
    }

    // Filter multi-platform domains only
    if (showMultiPlatformOnly) {
      domains = domains.filter(d => d.isMultiPlatform);
      const domainIds = new Set(domains.map(d => d.id));
      edges = edges.filter(e => domainIds.has(e.source));
      const platformIds = new Set(edges.map(e => e.target));
      platforms = platforms.filter(p => platformIds.has(p.id));
    }

    // Filter widespread platforms only
    if (showWidespreadOnly) {
      platforms = platforms.filter(p => p.isWidespread);
      const platformIds = new Set(platforms.map(p => p.id));
      edges = edges.filter(e => platformIds.has(e.target));
      const domainIds = new Set(edges.map(e => e.source));
      domains = domains.filter(d => domainIds.has(d.id));
    }

    // Apply isolated view filter
    if (isolatedView) {
      if (isolatedView.type === 'domain') {
        domains = domains.filter(d => d.id === isolatedView.id);
        const domainIds = new Set(domains.map(d => d.id));
        edges = edges.filter(e => domainIds.has(e.source));
        const platformIds = new Set(edges.map(e => e.target));
        platforms = platforms.filter(p => platformIds.has(p.id));
      } else if (isolatedView.type === 'platform') {
        platforms = platforms.filter(p => p.id === isolatedView.id);
        const platformIds = new Set(platforms.map(p => p.id));
        edges = edges.filter(e => platformIds.has(e.target));
        const domainIds = new Set(edges.map(e => e.source));
        domains = domains.filter(d => domainIds.has(d.id));
      }
    }

    return { domains, platforms, edges };
  }, [graphData, searchTerm, selectedPlatformFilter, minDetections, showMultiPlatformOnly, showWidespreadOnly, isolatedView]);

  // Apply sorting
  const sortedData = useMemo(() => {
    let { domains, platforms, edges } = filteredData;

    // Sort domains
    domains = [...domains].sort((a, b) => {
      switch (domainSort) {
        case 'alpha':
          return a.label.localeCompare(b.label);
        case 'platforms-desc':
          return b.platformCount - a.platformCount || b.detections - a.detections;
        case 'detections-desc':
          return b.detections - a.detections;
        default:
          return 0;
      }
    });

    // Sort platforms
    platforms = [...platforms].sort((a, b) => {
      switch (platformSort) {
        case 'alpha':
          return a.label.localeCompare(b.label);
        case 'domains-desc':
          return b.domainCount - a.domainCount || b.detections - a.detections;
        case 'detections-desc':
          return b.detections - a.detections;
        default:
          return 0;
      }
    });

    return { domains, platforms, edges };
  }, [filteredData, domainSort, platformSort]);

  // Render the bipartite graph with D3
  useEffect(() => {
    if (!svgRef.current) return;
    const { domains, platforms, edges } = sortedData;
    if (domains.length === 0 && platforms.length === 0) return;

    // Clear previous graph
    d3.select(svgRef.current).selectAll('*').remove();

    // Setup SVG
    const svg = d3.select(svgRef.current);
    const container = svg.node().parentElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    svg.attr('width', width).attr('height', height);

    // Create container for zoom
    const g = svg.append('g');

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Calculate layout positions
    const margin = { top: 60, right: 60, bottom: 60, left: 60 };
    const graphWidth = width - margin.left - margin.right;
    const graphHeight = height - margin.top - margin.bottom;

    const leftX = margin.left + 100; // Domain column X position
    const rightX = width - margin.right - 100; // Platform column X position
    const columnGap = rightX - leftX;

    // Calculate node sizes
    const maxDomainDetections = Math.max(...domains.map(d => d.detections), 1);
    const maxPlatformDomains = Math.max(...platforms.map(p => p.domainCount), 1);

    const getDomainRadius = (d) => {
      const baseSize = 8;
      const maxSize = 30;
      const detectionScale = Math.sqrt(d.detections / maxDomainDetections);
      const size = baseSize + (maxSize - baseSize) * detectionScale;
      return d.isMultiPlatform ? size * 1.2 : size; // Boost multi-platform nodes
    };

    const getPlatformRadius = (p) => {
      const baseSize = 10;
      const maxSize = 35;
      const domainScale = Math.sqrt(p.domainCount / maxPlatformDomains);
      const size = baseSize + (maxSize - baseSize) * domainScale;
      return p.isWidespread ? size * 1.15 : size; // Boost widespread platforms
    };

    // Calculate vertical spacing
    const domainSpacing = Math.max(graphHeight / (domains.length + 1), 40);
    const platformSpacing = Math.max(graphHeight / (platforms.length + 1), 40);

    // Position nodes
    const domainNodes = domains.map((d, i) => ({
      ...d,
      x: leftX,
      y: margin.top + (i + 1) * domainSpacing,
      radius: getDomainRadius(d),
    }));

    const platformNodes = platforms.map((p, i) => ({
      ...p,
      x: rightX,
      y: margin.top + (i + 1) * platformSpacing,
      radius: getPlatformRadius(p),
    }));

    // Create lookup maps
    const domainPosMap = new Map(domainNodes.map(d => [d.id, d]));
    const platformPosMap = new Map(platformNodes.map(p => [p.id, p]));

    // Create edge data with positions
    const edgeData = edges.map(e => {
      const source = domainPosMap.get(e.source);
      const target = platformPosMap.get(e.target);
      if (!source || !target) return null;
      return {
        ...e,
        x1: source.x + source.radius,
        y1: source.y,
        x2: target.x - target.radius,
        y2: target.y,
      };
    }).filter(e => e !== null);

    // Calculate edge widths
    const maxEdgeDetections = Math.max(...edgeData.map(e => e.detections), 1);
    const getEdgeWidth = (detections) => {
      return 1 + Math.sqrt(detections / maxEdgeDetections) * 6;
    };

    // Draw edges
    const edgeGroup = g.append('g').attr('class', 'edges');

    const edgePaths = edgeGroup.selectAll('path')
      .data(edgeData)
      .enter()
      .append('path')
      .attr('d', d => {
        // Create curved bezier path
        const midX = (d.x1 + d.x2) / 2;
        return `M ${d.x1},${d.y1} C ${midX},${d.y1} ${midX},${d.y2} ${d.x2},${d.y2}`;
      })
      .attr('fill', 'none')
      .attr('stroke', d => d.platformColor)
      .attr('stroke-width', d => getEdgeWidth(d.detections))
      .attr('stroke-opacity', 0.25)
      .attr('class', 'edge')
      .on('mouseenter', function(event, d) {
        // Highlight edge
        d3.select(this)
          .attr('stroke-opacity', 0.9)
          .attr('stroke-width', getEdgeWidth(d.detections) + 2);

        // Show tooltip
        setTooltip({
          visible: true,
          x: event.pageX,
          y: event.pageY,
          data: d,
          type: 'edge',
        });
      })
      .on('mouseleave', function(event, d) {
        // Reset edge
        d3.select(this)
          .attr('stroke-opacity', 0.25)
          .attr('stroke-width', getEdgeWidth(d.detections));

        // Hide tooltip
        setTooltip({ visible: false, x: 0, y: 0, data: null, type: null });
      });

    // Draw domain nodes
    const domainGroup = g.append('g').attr('class', 'domain-nodes');

    const domainNodeGroups = domainGroup.selectAll('g')
      .data(domainNodes)
      .enter()
      .append('g')
      .attr('class', 'node domain-node')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .on('mouseenter', function(event, d) {
        // Highlight node
        d3.select(this).select('circle')
          .attr('stroke-width', 4)
          .attr('filter', 'brightness(1.3)');

        // Highlight connected edges
        edgePaths.attr('stroke-opacity', e => e.source === d.id ? 0.9 : 0.05);

        // Show tooltip
        setTooltip({
          visible: true,
          x: event.pageX,
          y: event.pageY,
          data: d,
          type: 'domain',
        });
      })
      .on('mouseleave', function(event, d) {
        // Reset node
        d3.select(this).select('circle')
          .attr('stroke-width', d.isMultiPlatform ? 3 : 2)
          .attr('filter', 'none');

        // Reset edges
        edgePaths.attr('stroke-opacity', 0.25);

        // Hide tooltip
        setTooltip({ visible: false, x: 0, y: 0, data: null, type: null });
      })
      .on('click', (event, d) => {
        setIsolatedView({ type: 'domain', id: d.id });
        setSelectedNode(d);
      });

    // Add circles for domain nodes
    domainNodeGroups.append('circle')
      .attr('r', d => d.radius)
      .attr('fill', d => {
        if (Array.isArray(d.color)) {
          // Create gradient for multi-platform
          const gradientId = `gradient-${d.id.replace(/[^a-zA-Z0-9]/g, '')}`;
          const defs = svg.select('defs').empty() ? svg.append('defs') : svg.select('defs');
          const gradient = defs.append('linearGradient')
            .attr('id', gradientId)
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '100%')
            .attr('y2', '100%');
          d.color.forEach((color, i) => {
            gradient.append('stop')
              .attr('offset', `${(i / (d.color.length - 1)) * 100}%`)
              .attr('stop-color', color);
          });
          return `url(#${gradientId})`;
        }
        return d.color;
      })
      .attr('stroke', d => d.isMultiPlatform ? '#ff6b6b' : '#fff')
      .attr('stroke-width', d => d.isMultiPlatform ? 3 : 2)
      .attr('opacity', 0.9);

    // Add labels for domain nodes
    domainNodeGroups.append('text')
      .text(d => {
        let label = d.label;
        if (label.startsWith('www.')) label = label.substring(4);
        const parts = label.split('.');
        if (parts.length > 2) label = parts.slice(-2).join('.');
        return label.length > 20 ? label.substring(0, 18) + '...' : label;
      })
      .attr('x', d => -d.radius - 8)
      .attr('y', 5)
      .attr('text-anchor', 'end')
      .attr('font-size', '11px')
      .attr('fill', '#e0e0e0')
      .attr('pointer-events', 'none');

    // Add badges for multi-platform domains
    domainNodeGroups.filter(d => d.isMultiPlatform)
      .append('text')
      .text(d => `×${d.platformCount}`)
      .attr('x', 0)
      .attr('y', 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', '#fff')
      .attr('pointer-events', 'none');

    // Draw platform nodes
    const platformGroup = g.append('g').attr('class', 'platform-nodes');

    const platformNodeGroups = platformGroup.selectAll('g')
      .data(platformNodes)
      .enter()
      .append('g')
      .attr('class', 'node platform-node')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .on('mouseenter', function(event, d) {
        // Highlight node
        d3.select(this).select('circle')
          .attr('stroke-width', 4)
          .attr('filter', 'brightness(1.3)');

        // Highlight connected edges
        edgePaths.attr('stroke-opacity', e => e.target === d.id ? 0.9 : 0.05);

        // Show tooltip
        setTooltip({
          visible: true,
          x: event.pageX,
          y: event.pageY,
          data: d,
          type: 'platform',
        });
      })
      .on('mouseleave', function(event, d) {
        // Reset node
        d3.select(this).select('circle')
          .attr('stroke-width', d.isWidespread ? 3 : 2)
          .attr('filter', 'none');

        // Reset edges
        edgePaths.attr('stroke-opacity', 0.25);

        // Hide tooltip
        setTooltip({ visible: false, x: 0, y: 0, data: null, type: null });
      })
      .on('click', (event, d) => {
        setIsolatedView({ type: 'platform', id: d.id });
        setSelectedNode(d);
      });

    // Add circles for platform nodes
    platformNodeGroups.append('circle')
      .attr('r', d => d.radius)
      .attr('fill', d => d.color)
      .attr('stroke', d => d.isWidespread ? '#ffd700' : '#fff')
      .attr('stroke-width', d => d.isWidespread ? 3 : 2)
      .attr('opacity', 0.9);

    // Add labels for platform nodes
    platformNodeGroups.append('text')
      .text(d => d.label.length > 15 ? d.label.substring(0, 13) + '...' : d.label)
      .attr('x', d => d.radius + 8)
      .attr('y', -5)
      .attr('text-anchor', 'start')
      .attr('font-size', '12px')
      .attr('font-weight', d => d.isWidespread ? 'bold' : 'normal')
      .attr('fill', '#e0e0e0')
      .attr('pointer-events', 'none');

    // Add domain count label
    platformNodeGroups.append('text')
      .text(d => `${d.domainCount} domain${d.domainCount === 1 ? '' : 's'}`)
      .attr('x', d => d.radius + 8)
      .attr('y', 10)
      .attr('text-anchor', 'start')
      .attr('font-size', '10px')
      .attr('fill', '#888')
      .attr('pointer-events', 'none');

    // Add column headers
    g.append('text')
      .text('DOMAIN NAMES')
      .attr('x', leftX)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', '#888')
      .attr('letter-spacing', '0.1em');

    g.append('text')
      .text('AD PLATFORMS')
      .attr('x', rightX)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', '#888')
      .attr('letter-spacing', '0.1em');

  }, [sortedData]);

  // Calculate statistics
  const stats_data = useMemo(() => {
    const { domains, platforms, edges } = sortedData;
    const multiPlatformDomains = domains.filter(d => d.isMultiPlatform).length;
    const widespreadPlatforms = platforms.filter(p => p.isWidespread).length;
    const mostConnectedDomain = domains.reduce((max, d) => d.platformCount > (max?.platformCount || 0) ? d : max, null);
    const mostWidespreadPlatform = platforms.reduce((max, p) => p.domainCount > (max?.domainCount || 0) ? p : max, null);

    return {
      totalDomains: domains.length,
      totalPlatforms: platforms.length,
      totalConnections: edges.length,
      multiPlatformDomains,
      multiPlatformPercentage: domains.length > 0 ? ((multiPlatformDomains / domains.length) * 100).toFixed(0) : 0,
      widespreadPlatforms,
      widespreadPercentage: platforms.length > 0 ? ((widespreadPlatforms / platforms.length) * 100).toFixed(0) : 0,
      mostConnectedDomain,
      mostWidespreadPlatform,
    };
  }, [sortedData]);

  // Get available platforms for filter dropdown
  const availablePlatforms = useMemo(() => {
    const platformSet = new Set(graphData.platforms.map(p => p.id));
    return Array.from(platformSet)
      .map(id => ({
        id,
        name: TRACKING_PLATFORMS[id]?.name || id,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [graphData]);

  // Export functions
  const handleExportCSV = () => {
    const { edges } = sortedData;
    if (!edges || edges.length === 0) return;

    // CSV headers
    const headers = ['Domain', 'Platform', 'Detections', 'First Seen', 'Last Seen'];
    const csvContent = [
      headers.join(','),
      ...edges.map(edge => {
        const domain = edge.source;
        const platformName = TRACKING_PLATFORMS[edge.target]?.name || edge.target;
        const detections = edge.detections;
        const firstSeen = new Date(edge.firstSeen).toLocaleString();
        const lastSeen = new Date(edge.lastSeen).toLocaleString();

        // Escape CSV fields
        const escapeCSV = field => `"${String(field).replace(/"/g, '""')}"`;

        return [
          escapeCSV(domain),
          escapeCSV(platformName),
          escapeCSV(detections),
          escapeCSV(firstSeen),
          escapeCSV(lastSeen),
        ].join(',');
      }),
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bipartite-graph-${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPNG = async () => {
    const container = svgRef.current?.parentElement;
    if (!container) return;

    try {
      const canvas = await html2canvas(container, {
        backgroundColor: '#1a1a1a',
        scale: 2, // Higher resolution
      });

      canvas.toBlob(blob => {
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `bipartite-graph-${Date.now()}.png`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error('Error exporting PNG:', error);
    }
  };

  const handleExportSVG = () => {
    if (!svgRef.current) return;

    // Clone the SVG to avoid modifying the original
    const svgClone = svgRef.current.cloneNode(true);

    // Add white background
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '100%');
    rect.setAttribute('height', '100%');
    rect.setAttribute('fill', '#1a1a1a');
    svgClone.insertBefore(rect, svgClone.firstChild);

    // Serialize SVG
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgClone);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });

    // Download file
    const link = document.createElement('a');
    const url = URL.createObjectURL(svgBlob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bipartite-graph-${Date.now()}.svg`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bipartite-graph-container">
      {/* Controls */}
      <div className="graph-controls bipartite-controls">
        {isolatedView && (
          <button
            className="control-button back-button"
            onClick={() => {
              setIsolatedView(null);
              setSelectedNode(null);
            }}
            title="Back to full view"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"
              />
            </svg>
            <span style={{ marginLeft: '5px' }}>Back to Full View</span>
          </button>
        )}
        <button
          className="control-button"
          onClick={() => {
            const svg = d3.select(svgRef.current);
            svg.transition().duration(750).call(d3.zoom().transform, d3.zoomIdentity);
          }}
          title="Reset zoom"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z" />
            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
          </svg>
        </button>
        <div className="export-dropdown">
          <button className="control-button export-button" title="Export graph">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
              <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
            </svg>
          </button>
          <div className="export-menu">
            <button onClick={handleExportPNG}>Export as PNG</button>
            <button onClick={handleExportSVG}>Export as SVG</button>
            <button onClick={handleExportCSV}>Export as CSV</button>
          </div>
        </div>
        <div className="toggle-controls">
          <button
            className={`control-button toggle-button ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            title={showFilters ? 'Hide filters' : 'Show filters'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/>
            </svg>
          </button>
          <button
            className={`control-button toggle-button ${showSorting ? 'active' : ''}`}
            onClick={() => setShowSorting(!showSorting)}
            title={showSorting ? 'Hide sorting' : 'Show sorting'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.5 2.5a.5.5 0 0 0-1 0v8.793l-1.146-1.147a.5.5 0 0 0-.708.708l2 1.999.007.007a.497.497 0 0 0 .7-.006l2-2a.5.5 0 0 0-.707-.708L3.5 11.293V2.5zm3.5 1a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zM7.5 6a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zm0 3a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1h-3zm0 3a.5.5 0 0 0 0 1h1a.5.5 0 0 0 0-1h-1z"/>
            </svg>
          </button>
          <button
            className={`control-button toggle-button ${showStatistics ? 'active' : ''}`}
            onClick={() => setShowStatistics(!showStatistics)}
            title={showStatistics ? 'Hide statistics' : 'Show statistics'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 11H2v3h2v-3zm5-4H7v7h2V7zm5-5v12h-2V2h2zm-2-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1h-2zM6 7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7zm-5 4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-3z"/>
            </svg>
          </button>
          <button
            className={`control-button toggle-button ${showLegend ? 'active' : ''}`}
            onClick={() => setShowLegend(!showLegend)}
            title={showLegend ? 'Hide legend' : 'Show legend'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/>
            </svg>
          </button>
        </div>
        <div className="zoom-hint">
          Drag to pan • Scroll to zoom • Click nodes to isolate
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
      <div className="filter-panel">
        <div className="filter-section">
          <label>Search Domains:</label>
          <input
            type="text"
            placeholder="Filter domains..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-section">
          <label>Platform:</label>
          <select
            value={selectedPlatformFilter}
            onChange={(e) => setSelectedPlatformFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Platforms</option>
            {availablePlatforms.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="filter-section">
          <label>Min Detections: {minDetections}</label>
          <input
            type="range"
            min="1"
            max="50"
            value={minDetections}
            onChange={(e) => setMinDetections(parseInt(e.target.value))}
            className="filter-range"
          />
        </div>

        <div className="filter-section checkbox-section">
          <label>
            <input
              type="checkbox"
              checked={showMultiPlatformOnly}
              onChange={(e) => setShowMultiPlatformOnly(e.target.checked)}
            />
            Multi-platform domains only (2+)
          </label>
        </div>

        <div className="filter-section checkbox-section">
          <label>
            <input
              type="checkbox"
              checked={showWidespreadOnly}
              onChange={(e) => setShowWidespreadOnly(e.target.checked)}
            />
            Widespread platforms only (5+ domains)
          </label>
        </div>
      </div>
      )}

      {/* Sorting Controls */}
      {showSorting && (
      <div className="sort-panel">
        <div className="sort-section">
          <label>Sort Domains:</label>
          <select
            value={domainSort}
            onChange={(e) => setDomainSort(e.target.value)}
            className="sort-select"
          >
            <option value="platforms-desc">Most Platforms</option>
            <option value="detections-desc">Most Detections</option>
            <option value="alpha">Alphabetical</option>
          </select>
        </div>

        <div className="sort-section">
          <label>Sort Platforms:</label>
          <select
            value={platformSort}
            onChange={(e) => setPlatformSort(e.target.value)}
            className="sort-select"
          >
            <option value="domains-desc">Most Domains</option>
            <option value="detections-desc">Most Detections</option>
            <option value="alpha">Alphabetical</option>
          </select>
        </div>
      </div>
      )}

      {/* Statistics Panel */}
      {showStatistics && (
      <div className="statistics-panel">
        <div className="stats-title">GRAPH STATISTICS</div>
        <div className="stat-row">
          <span className="stat-label">Total Domains:</span>
          <span className="stat-value">{stats_data.totalDomains}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Total Platforms:</span>
          <span className="stat-value">{stats_data.totalPlatforms}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Total Connections:</span>
          <span className="stat-value">{stats_data.totalConnections}</span>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-row">
          <span className="stat-label">Multi-Platform Domains:</span>
          <span className="stat-value highlight">
            {stats_data.multiPlatformDomains} ({stats_data.multiPlatformPercentage}%)
          </span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Widespread Platforms:</span>
          <span className="stat-value highlight">
            {stats_data.widespreadPlatforms} ({stats_data.widespreadPercentage}%)
          </span>
        </div>
        {stats_data.mostConnectedDomain && (
          <>
            <div className="stat-divider"></div>
            <div className="stat-row">
              <span className="stat-label">Most Connected Domain:</span>
              <span className="stat-value small">
                {stats_data.mostConnectedDomain.label} ({stats_data.mostConnectedDomain.platformCount} platforms)
              </span>
            </div>
          </>
        )}
        {stats_data.mostWidespreadPlatform && (
          <div className="stat-row">
            <span className="stat-label">Most Widespread Platform:</span>
            <span className="stat-value small">
              {stats_data.mostWidespreadPlatform.label} ({stats_data.mostWidespreadPlatform.domainCount} domains)
            </span>
          </div>
        )}
      </div>
      )}

      {/* Legend */}
      {showLegend && (
      <div className="graph-legend">
        <div className="legend-title">LEGEND</div>
        <div className="legend-section">
          <div className="legend-subtitle">Node Size:</div>
          <div className="legend-item">
            <svg width="20" height="20">
              <circle cx="10" cy="10" r="4" fill="#4a90e2" />
            </svg>
            <span>Few connections/detections</span>
          </div>
          <div className="legend-item">
            <svg width="20" height="20">
              <circle cx="10" cy="10" r="8" fill="#4a90e2" />
            </svg>
            <span>Many connections/detections</span>
          </div>
        </div>
        <div className="legend-section">
          <div className="legend-subtitle">Highlights:</div>
          <div className="legend-item">
            <svg width="20" height="20">
              <circle cx="10" cy="10" r="6" fill="#ff6b6b" stroke="#ff6b6b" strokeWidth="2" />
            </svg>
            <span>Multi-platform domain</span>
          </div>
          <div className="legend-item">
            <svg width="20" height="20">
              <circle cx="10" cy="10" r="6" fill="#4a90e2" stroke="#ffd700" strokeWidth="2" />
            </svg>
            <span>Widespread platform</span>
          </div>
        </div>
        <div className="legend-section">
          <div className="legend-subtitle">Edge Width:</div>
          <div className="legend-item">
            <svg width="30" height="10">
              <line x1="0" y1="5" x2="30" y2="5" stroke="#666" strokeWidth="1" />
            </svg>
            <span>Few detections</span>
          </div>
          <div className="legend-item">
            <svg width="30" height="10">
              <line x1="0" y1="5" x2="30" y2="5" stroke="#666" strokeWidth="4" />
            </svg>
            <span>Many detections</span>
          </div>
        </div>
      </div>
      )}

      {/* SVG Canvas */}
      <svg ref={svgRef} className="bipartite-graph-svg"></svg>

      {/* Tooltip */}
      {tooltip.visible && tooltip.data && (
        <div
          className="graph-tooltip"
          style={{
            left: `${tooltip.x + 10}px`,
            top: `${tooltip.y + 10}px`,
          }}
        >
          {tooltip.type === 'domain' && (
            <div className="tooltip-content">
              <div className="tooltip-header">
                <strong>{tooltip.data.label}</strong>
              </div>
              <p>Total Detections: {tooltip.data.detections}</p>
              <p>Connected Platforms: {tooltip.data.platformCount}</p>
              <div className="tooltip-divider"></div>
              <p className="tooltip-subtitle">Platforms:</p>
              {tooltip.data.platforms.slice(0, 5).map((p, i) => (
                <p key={i} style={{ color: p.color, fontSize: '11px', marginLeft: '8px' }}>
                  • {p.name} ({p.count})
                </p>
              ))}
              {tooltip.data.platforms.length > 5 && (
                <p style={{ fontSize: '11px', marginLeft: '8px', color: '#888' }}>
                  ... {tooltip.data.platforms.length - 5} more
                </p>
              )}
              <div className="tooltip-divider"></div>
              <p style={{ fontSize: '10px', color: '#888' }}>
                First Seen: {new Date(tooltip.data.firstSeen).toLocaleDateString()}
              </p>
              <p style={{ fontSize: '10px', color: '#888' }}>
                Last Seen: {new Date(tooltip.data.lastSeen).toLocaleDateString()}
              </p>
            </div>
          )}
          {tooltip.type === 'platform' && (
            <div className="tooltip-content">
              <div className="tooltip-header">
                <strong style={{ color: tooltip.data.color }}>{tooltip.data.label}</strong>
              </div>
              <p>Total Detections: {tooltip.data.detections}</p>
              <p>Unique Domains: {tooltip.data.domainCount}</p>
              <div className="tooltip-divider"></div>
              <p className="tooltip-subtitle">Top Domains:</p>
              {tooltip.data.domains.slice(0, 5).map((d, i) => (
                <p key={i} style={{ fontSize: '11px', marginLeft: '8px' }}>
                  • {d.domain} ({d.count})
                </p>
              ))}
              {tooltip.data.domains.length > 5 && (
                <p style={{ fontSize: '11px', marginLeft: '8px', color: '#888' }}>
                  ... {tooltip.data.domains.length - 5} more
                </p>
              )}
            </div>
          )}
          {tooltip.type === 'edge' && (
            <div className="tooltip-content">
              <div className="tooltip-header">
                <strong>{tooltip.data.source} → {TRACKING_PLATFORMS[tooltip.data.target]?.name || tooltip.data.target}</strong>
              </div>
              <p>Detections: {tooltip.data.detections}</p>
              <p style={{ fontSize: '10px', color: '#888' }}>
                First Detection: {new Date(tooltip.data.firstSeen).toLocaleDateString()}
              </p>
              <p style={{ fontSize: '10px', color: '#888' }}>
                Last Detection: {new Date(tooltip.data.lastSeen).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BipartiteGraph;
