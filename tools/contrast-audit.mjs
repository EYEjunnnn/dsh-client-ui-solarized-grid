// WCAG contrast audit of the generated Solarized token table: every ink/stroke pair the
// UI actually paints, in both palettes. Alpha values are composited over the surface.
import fs from 'node:fs';

const tokens = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

const parse = (text) => {
  const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(text);
  if (!m) return undefined;
  return {
    r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4, 6), 16),
    a: m[2] ? parseInt(m[2], 16) / 255 : 1,
  };
};
const over = (fg, bg) => ({
  r: fg.r * fg.a + bg.r * (1 - fg.a),
  g: fg.g * fg.a + bg.g * (1 - fg.a),
  b: fg.b * fg.a + bg.b * (1 - fg.a),
  a: 1,
});
const lum = ({ r, g, b }) => {
  const f = (c) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (fg, bg) => {
  const surface = parse(bg);
  const ink = over(parse(fg), surface);
  const [hi, lo] = [lum(ink), lum(surface)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
};

const PAIRS = [
  ['label-primary', 'alias-label-primary', 'bg-base', 'alias-bg-base'],
  ['label-secondary', 'alias-label-secondary', 'bg-base', 'alias-bg-base'],
  ['label-tertiary', 'alias-label-tertiary', 'bg-base', 'alias-bg-base'],
  ['label-caption', 'alias-label-caption', 'bg-base', 'alias-bg-base'],
  ['label-primary', 'alias-label-primary', 'code-block', 'alias-markdown-code-block'],
  ['label-secondary', 'alias-label-secondary', 'code-block', 'alias-markdown-code-block'],
  ['primary-foreground', 'alias-label-primary-foreground', 'brand-primary', 'alias-brand-primary'],
  ['toast-label', 'alias-toast-label', 'toast-bg', 'alias-toast-bg'],
  ['link', 'alias-link', 'bg-base', 'alias-bg-base'],
  ['label-primary', 'alias-label-primary', 'user-bubble', 'specific-bubble'],
  ['shiki-keyword', 'shiki-token-keyword', 'code-block', 'alias-markdown-code-block'],
  ['shiki-string', 'shiki-token-string', 'code-block', 'alias-markdown-code-block'],
  ['shiki-comment', 'shiki-token-comment', 'code-block', 'alias-markdown-code-block'],
  ['shiki-constant', 'shiki-token-constant', 'code-block', 'alias-markdown-code-block'],
  ['shiki-function', 'shiki-token-function', 'code-block', 'alias-markdown-code-block'],
  ['state-error', 'alias-state-error-primary', 'bg-base', 'alias-bg-base'],
  ['state-success', 'alias-state-success-primary', 'bg-base', 'alias-bg-base'],
  ['state-warn', 'alias-state-warn-primary', 'bg-base', 'alias-bg-base'],
];

const rows = [];
for (const scheme of ['light', 'dark']) {
  for (const [inkLabel, inkKey, surfaceLabel, surfaceKey] of PAIRS) {
    const inkName = inkKey.startsWith('shiki-') ? `--${inkKey}` : `--dsw-${inkKey}`;
    const ink = tokens[inkName]?.[scheme];
    const surface = tokens[`--dsw-${surfaceKey}`]?.[scheme];
    if (!ink || !surface) { rows.push({ scheme, pair: `${inkLabel} on ${surfaceLabel}`, ratio: NaN, verdict: 'missing' }); continue; }
    const value = ratio(ink, surface);
    rows.push({
      scheme,
      pair: `${inkLabel} on ${surfaceLabel}`,
      ink, surface,
      ratio: Math.round(value * 100) / 100,
      verdict: value >= 4.5 ? 'AA' : value >= 3 ? 'AA-large' : 'LOW',
    });
  }
}

for (const scheme of ['light', 'dark']) {
  console.log(`\n=== ${scheme} ===`);
  for (const row of rows.filter((r) => r.scheme === scheme)) {
    console.log(`${String(row.ratio).padStart(6)}  ${row.verdict.padEnd(9)} ${row.pair.padEnd(34)} ${row.ink ?? '-'} on ${row.surface ?? '-'}`);
  }
}
const low = rows.filter((r) => r.verdict === 'LOW' || r.verdict === 'missing');
console.log(`\nbelow 3:1: ${low.length}`);
for (const row of low) console.log(`  ${row.scheme} ${row.pair} ${row.ink} on ${row.surface} = ${row.ratio}`);
