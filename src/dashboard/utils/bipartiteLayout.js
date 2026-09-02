/**
 * D3 layout + draw for the Bipartite Graph.
 *
 * The React component owns the SVG element and React state; this module
 * owns the math (positions, radii, edge widths) and the imperative D3
 * calls. Handlers are passed in so the React layer can update tooltip /
 * isolation state without us importing React.
 */

import * as d3 from 'd3';

const COLUMN_HEADER_Y = 30;
const DOMAIN_LABEL_MAX = 20;
const PLATFORM_LABEL_MAX = 15;
const EDGE_BASE_WIDTH = 1;
const EDGE_WIDTH_SCALE = 6;
const DOMAIN_BASE_RADIUS = 8;
const DOMAIN_MAX_RADIUS = 30;
const PLATFORM_BASE_RADIUS = 10;
const PLATFORM_MAX_RADIUS = 35;
const DOMAIN_MIN_SPACING = 40;
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 3;
const MARGIN = { top: 60, right: 60, bottom: 60, left: 60 };
const COLUMN_INSET = 100;

function safeMax(values, fallback = 1) {
  if (!values.length) return fallback;
  return Math.max(...values, fallback);
}

function buildDomainNode(d, index, spacing, maxDetections) {
  const baseSize = DOMAIN_BASE_RADIUS;
  const maxSize = DOMAIN_MAX_RADIUS;
  const detectionScale = Math.sqrt(d.detections / maxDetections);
  const size = baseSize + (maxSize - baseSize) * detectionScale;
  return {
    ...d,
    x: MARGIN.left + COLUMN_INSET,
    y: MARGIN.top + (index + 1) * spacing,
    radius: d.isMultiPlatform ? size * 1.2 : size,
  };
}

function buildPlatformNode(p, index, spacing, rightX, maxDomains) {
  const baseSize = PLATFORM_BASE_RADIUS;
  const maxSize = PLATFORM_MAX_RADIUS;
  const domainScale = Math.sqrt(p.domainCount / maxDomains);
  const size = baseSize + (maxSize - baseSize) * domainScale;
  return {
    ...p,
    x: rightX,
    y: MARGIN.top + (index + 1) * spacing,
    radius: p.isWidespread ? size * 1.15 : size,
  };
}

function computePositions(width, height, domains, platforms) {
  const graphHeight = height - MARGIN.top - MARGIN.bottom;
  const leftX = MARGIN.left + COLUMN_INSET;
  const rightX = width - MARGIN.right - COLUMN_INSET;
  const maxDomainDetections = safeMax(domains.map(d => d.detections));
  const maxPlatformDomains = safeMax(platforms.map(p => p.domainCount));
  const domainSpacing = Math.max(
    graphHeight / (domains.length + 1),
    DOMAIN_MIN_SPACING
  );
  const platformSpacing = Math.max(
    graphHeight / (platforms.length + 1),
    DOMAIN_MIN_SPACING
  );

  const domainNodes = domains.map((d, i) =>
    buildDomainNode(d, i, domainSpacing, maxDomainDetections)
  );
  const platformNodes = platforms.map((p, i) =>
    buildPlatformNode(p, i, platformSpacing, rightX, maxPlatformDomains)
  );

  return { leftX, rightX, domainNodes, platformNodes };
}

function truncateLabel(label, max) {
  if (label.startsWith('www.')) label = label.substring(4);
  const parts = label.split('.');
  if (parts.length > 2) label = parts.slice(-2).join('.');
  return label.length > max ? label.substring(0, max - 2) + '...' : label;
}

function buildEdgeData(domains, platforms, edges) {
  const domainPos = new Map(domains.map(d => [d.id, d]));
  const platformPos = new Map(platforms.map(p => [p.id, p]));
  return edges
    .map(e => {
      const source = domainPos.get(e.source);
      const target = platformPos.get(e.target);
      if (!source || !target) return null;
      return {
        ...e,
        x1: source.x + source.radius,
        y1: source.y,
        x2: target.x - target.radius,
        y2: target.y,
      };
    })
    .filter(e => e !== null);
}

function applyDomainFill(selection, svg) {
  selection.attr('fill', d => {
    if (!Array.isArray(d.color)) return d.color;
    const gradientId = `gradient-${d.id.replace(/[^a-zA-Z0-9]/g, '')}`;
    const defs = svg.select('defs').empty()
      ? svg.append('defs')
      : svg.select('defs');
    const gradient = defs
      .append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '100%');
    d.color.forEach((color, i) => {
      gradient
        .append('stop')
        .attr('offset', `${(i / (d.color.length - 1)) * 100}%`)
        .attr('stop-color', color);
    });
    return `url(#${gradientId})`;
  });
}

/**
 * Draw the bipartite graph into `svgElement`. Returns nothing — the
 * React component owns the SVG element and re-runs this whenever the
 * sorted data changes.
 *
 * @param {SVGSVGElement} svgElement
 * @param {{domains: Array, platforms: Array, edges: Array}} graph
 * @param {{
 *   onTooltip: (state: object) => void,
 *   onNodeClick: (node: object) => void,
 * }} handlers
 */
function drawBipartiteGraph(svgElement, graph, handlers) {
  if (!svgElement) return;
  const { domains, platforms, edges } = graph;
  if (domains.length === 0 && platforms.length === 0) return;

  d3.select(svgElement).selectAll('*').remove();

  const svg = d3.select(svgElement);
  const container = svg.node().parentElement;
  const width = container.clientWidth;
  const height = container.clientHeight;
  svg.attr('width', width).attr('height', height);

  const g = svg.append('g');
  const zoom = d3
    .zoom()
    .scaleExtent([ZOOM_MIN, ZOOM_MAX])
    .on('zoom', event => g.attr('transform', event.transform));
  svg.call(zoom);

  const { leftX, rightX, domainNodes, platformNodes } = computePositions(
    width,
    height,
    domains,
    platforms
  );
  const edgeData = buildEdgeData(domainNodes, platformNodes, edges);
  const maxEdgeDetections = safeMax(edgeData.map(e => e.detections));
  const getEdgeWidth = detections =>
    EDGE_BASE_WIDTH +
    Math.sqrt(detections / maxEdgeDetections) * EDGE_WIDTH_SCALE;

  // Edges
  const edgeGroup = g.append('g').attr('class', 'edges');
  const edgePaths = edgeGroup
    .selectAll('path')
    .data(edgeData)
    .enter()
    .append('path')
    .attr('d', d => {
      const midX = (d.x1 + d.x2) / 2;
      return `M ${d.x1},${d.y1} C ${midX},${d.y1} ${midX},${d.y2} ${d.x2},${d.y2}`;
    })
    .attr('fill', 'none')
    .attr('stroke', d => d.platformColor)
    .attr('stroke-width', d => getEdgeWidth(d.detections))
    .attr('stroke-opacity', 0.25)
    .attr('class', 'edge')
    .on('mouseenter', function (event, d) {
      d3.select(this)
        .attr('stroke-opacity', 0.9)
        .attr('stroke-width', getEdgeWidth(d.detections) + 2);
      handlers.onTooltip({
        visible: true,
        x: event.pageX,
        y: event.pageY,
        data: d,
        type: 'edge',
      });
    })
    .on('mouseleave', function (event, d) {
      d3.select(this)
        .attr('stroke-opacity', 0.25)
        .attr('stroke-width', getEdgeWidth(d.detections));
      handlers.onTooltip({
        visible: false,
        x: 0,
        y: 0,
        data: null,
        type: null,
      });
    });

  // Domain nodes
  const domainGroup = g.append('g').attr('class', 'domain-nodes');
  const domainNodeGroups = domainGroup
    .selectAll('g')
    .data(domainNodes)
    .enter()
    .append('g')
    .attr('class', 'node domain-node')
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .on('mouseenter', function (event, d) {
      d3.select(this)
        .select('circle')
        .attr('stroke-width', 4)
        .attr('filter', 'brightness(1.3)');
      edgePaths.attr('stroke-opacity', e => (e.source === d.id ? 0.9 : 0.05));
      handlers.onTooltip({
        visible: true,
        x: event.pageX,
        y: event.pageY,
        data: d,
        type: 'domain',
      });
    })
    .on('mouseleave', function (event, d) {
      d3.select(this)
        .select('circle')
        .attr('stroke-width', d.isMultiPlatform ? 3 : 2)
        .attr('filter', 'none');
      edgePaths.attr('stroke-opacity', 0.25);
      handlers.onTooltip({
        visible: false,
        x: 0,
        y: 0,
        data: null,
        type: null,
      });
    })
    .on('click', (event, d) => handlers.onNodeClick(d));

  applyDomainFill(
    domainNodeGroups
      .append('circle')
      .attr('r', d => d.radius)
      .attr('stroke', d => (d.isMultiPlatform ? '#ff6b6b' : '#fff'))
      .attr('stroke-width', d => (d.isMultiPlatform ? 3 : 2))
      .attr('opacity', 0.9),
    svg
  );

  domainNodeGroups
    .append('text')
    .text(d => truncateLabel(d.label, DOMAIN_LABEL_MAX))
    .attr('x', d => -d.radius - 8)
    .attr('y', 5)
    .attr('text-anchor', 'end')
    .attr('font-size', '11px')
    .attr('fill', '#e0e0e0')
    .attr('pointer-events', 'none');

  domainNodeGroups
    .filter(d => d.isMultiPlatform)
    .append('text')
    .text(d => `×${d.platformCount}`)
    .attr('x', 0)
    .attr('y', 4)
    .attr('text-anchor', 'middle')
    .attr('font-size', '10px')
    .attr('font-weight', 'bold')
    .attr('fill', '#fff')
    .attr('pointer-events', 'none');

  // Platform nodes
  const platformGroup = g.append('g').attr('class', 'platform-nodes');
  const platformNodeGroups = platformGroup
    .selectAll('g')
    .data(platformNodes)
    .enter()
    .append('g')
    .attr('class', 'node platform-node')
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .on('mouseenter', function (event, d) {
      d3.select(this)
        .select('circle')
        .attr('stroke-width', 4)
        .attr('filter', 'brightness(1.3)');
      edgePaths.attr('stroke-opacity', e => (e.target === d.id ? 0.9 : 0.05));
      handlers.onTooltip({
        visible: true,
        x: event.pageX,
        y: event.pageY,
        data: d,
        type: 'platform',
      });
    })
    .on('mouseleave', function (event, d) {
      d3.select(this)
        .select('circle')
        .attr('stroke-width', d.isWidespread ? 3 : 2)
        .attr('filter', 'none');
      edgePaths.attr('stroke-opacity', 0.25);
      handlers.onTooltip({
        visible: false,
        x: 0,
        y: 0,
        data: null,
        type: null,
      });
    })
    .on('click', (event, d) => handlers.onNodeClick(d));

  platformNodeGroups
    .append('circle')
    .attr('r', d => d.radius)
    .attr('fill', d => d.color)
    .attr('stroke', d => (d.isWidespread ? '#ffd700' : '#fff'))
    .attr('stroke-width', d => (d.isWidespread ? 3 : 2))
    .attr('opacity', 0.9);

  platformNodeGroups
    .append('text')
    .text(d => truncateLabel(d.label, PLATFORM_LABEL_MAX))
    .attr('x', d => d.radius + 8)
    .attr('y', -5)
    .attr('text-anchor', 'start')
    .attr('font-size', '12px')
    .attr('font-weight', d => (d.isWidespread ? 'bold' : 'normal'))
    .attr('fill', '#e0e0e0')
    .attr('pointer-events', 'none');

  platformNodeGroups
    .append('text')
    .text(d => `${d.domainCount} domain${d.domainCount === 1 ? '' : 's'}`)
    .attr('x', d => d.radius + 8)
    .attr('y', 10)
    .attr('text-anchor', 'start')
    .attr('font-size', '10px')
    .attr('fill', '#888')
    .attr('pointer-events', 'none');

  g.append('text')
    .text('DOMAIN NAMES')
    .attr('x', leftX)
    .attr('y', COLUMN_HEADER_Y)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .attr('font-weight', 'bold')
    .attr('fill', '#888')
    .attr('letter-spacing', '0.1em');

  g.append('text')
    .text('AD PLATFORMS')
    .attr('x', rightX)
    .attr('y', COLUMN_HEADER_Y)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .attr('font-weight', 'bold')
    .attr('fill', '#888')
    .attr('letter-spacing', '0.1em');
}

export { drawBipartiteGraph, computePositions, buildEdgeData, truncateLabel };
