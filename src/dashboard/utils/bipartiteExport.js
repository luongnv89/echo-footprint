/**
 * Export helpers for the Bipartite Graph.
 *
 * Pulls the DOM-to-image / DOM-to-svg / DOM-to-csv logic out of the
 * React component so the visual layer stays focused on rendering and
 * these side effects are easy to stub in tests.
 */

import html2canvas from 'html2canvas';
import { downloadTextFile } from './csv.js';
import { cssVar } from './theme.js';

/**
 * Render the Bipartite Graph container to PNG and trigger a download.
 * Resolves once the blob download has been kicked off; rejects on
 * html2canvas failure (and is caught by the caller).
 *
 * @param {HTMLElement|null} container - The DOM node to rasterize.
 * @param {string} filename - Suggested file name.
 */
async function exportBipartitePNG(container, filename) {
  if (!container) return;
  const canvas = await html2canvas(container, {
    backgroundColor: cssVar('--surface-1'),
    scale: 2,
  });
  await new Promise(resolve => {
    canvas.toBlob(blob => {
      if (!blob) {
        resolve();
        return;
      }
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      resolve();
    });
  });
}

/**
 * Serialize the current SVG (with a dark background rect inserted) and
 * trigger a download.
 *
 * @param {SVGSVGElement|null} svgElement - The live SVG node in the DOM.
 * @param {string} filename - Suggested file name.
 */
function exportBipartiteSVG(svgElement, filename) {
  if (!svgElement) return;
  const clone = svgElement.cloneNode(true);
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('width', '100%');
  rect.setAttribute('height', '100%');
  rect.setAttribute('fill', cssVar('--surface-1'));
  clone.insertBefore(rect, clone.firstChild);

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  downloadTextFile(svgString, filename, 'image/svg+xml;charset=utf-8');
}

export { exportBipartitePNG, exportBipartiteSVG };
