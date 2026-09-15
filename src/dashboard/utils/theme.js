/**
 * Resolve a design-token custom property to its computed value.
 * D3/canvas code cannot consume var() references, so colours are read
 * once at draw time from the token sheet in styles/global.css.
 */
export function cssVar(name) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

// Relative luminance (WCAG) of a #rrggbb colour, 0–1.
function hexLuminance(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return 1;
  const n = parseInt(m[1], 16);
  const toLinear = v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * toLinear((n >> 16) & 255) +
    0.7152 * toLinear((n >> 8) & 255) +
    0.0722 * toLinear(n & 255)
  );
}

/**
 * Inline style for a platform-coloured chip (DataTable badge, legend,
 * detail-panel values). Near-black brand colours (e.g. TikTok) fall back
 * to a neutral chip so they stay legible on dark surfaces; brighter
 * colours get the translucent brand tint. Use `.color` from the result
 * when only the text colour is needed.
 */
export function platformChipStyle(color) {
  if (hexLuminance(color) < 0.25) {
    return {
      color: 'var(--text-primary)',
      background: 'rgba(255,255,255,0.08)',
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.22)',
    };
  }
  return {
    color,
    background: `${color}1f`,
    boxShadow: `inset 0 0 0 1px ${color}55`,
  };
}
