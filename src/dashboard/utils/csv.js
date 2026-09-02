/**
 * CSV helpers shared by the dashboard.
 *
 * `escapeCSV` is used by both the DataTable export and the BipartiteGraph
 * export. The single implementation lives here so both call sites and the
 * characterization test suite import from one place.
 *
 * Security: a leading character that Excel / Numbers / LibreOffice would
 * interpret as a formula trigger (`=`, `+`, `-`, `@`) is rewritten so the
 * value is stored as a string literal, never evaluated.
 */

const FORMULA_TRIGGERS = new Set(['=', '+', '-', '@', '\t', '\r']);

function escapeCSV(field) {
  const value = field === null || field === undefined ? '' : String(field);
  if (value.length > 0 && FORMULA_TRIGGERS.has(value[0])) {
    return `"'${value.replace(/"/g, '""')}"`;
  }
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Build a CSV string from rows using a header row.
 *
 * @param {string[]} headers - Column headings.
 * @param {Array<Array<any>>} rows - Row data; each row is the same length as headers.
 * @returns {string} CSV text terminated with a single trailing newline.
 */
function toCSV(headers, rows) {
  const headerLine = headers.map(escapeCSV).join(',');
  const bodyLines = rows.map(row => row.map(escapeCSV).join(','));
  return [headerLine, ...bodyLines].join('\n') + '\n';
}

/**
 * Trigger a browser download of `text` as `filename`.
 *
 * @param {string} text - File body.
 * @param {string} filename - Suggested file name.
 * @param {string} mimeType - MIME type (defaults to text/csv).
 */
function downloadTextFile(
  text,
  filename,
  mimeType = 'text/csv;charset=utf-8;'
) {
  if (typeof document === 'undefined') return;
  const blob = new Blob([text], { type: mimeType });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export { escapeCSV, toCSV, downloadTextFile };
