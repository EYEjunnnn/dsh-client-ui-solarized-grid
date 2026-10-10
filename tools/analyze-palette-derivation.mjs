// Analyse how much of the CURATED token table can be derived from a 16-colour Solarized palette.
//   node analyze-palette-derivation.mjs <build-solarized-tokens.mjs>
import fs from 'node:fs';

const src = fs.readFileSync(process.argv[2], 'utf8');

// --- the 16 canonical Solarized colours -----------------------------------
const PALETTE = {
  base03: '#002b36', base02: '#073642', base01: '#586e75', base00: '#657b83',
  base0: '#839496', base1: '#93a1a1', base2: '#eee8d5', base3: '#fdf6e3',
  yellow: '#b58900', orange: '#cb4b16', red: '#dc322f', magenta: '#d33682',
  violet: '#6c71c4', blue: '#268bd2', cyan: '#2aa198', green: '#859900',
};

// --- pull the CURATED block out of the builder ----------------------------
const start = src.indexOf('const CURATED = {');
const body = src.slice(start, src.indexOf('\n};', start));
const entries = [];
for (const m of body.matchAll(/'(--[a-z0-9-]+)':\s*\[\s*'(#[0-9a-fA-F]{6,8})'\s*,\s*'(#[0-9a-fA-F]{6,8})'\s*\]/g)) {
  entries.push({ token: m[1], light: m[2].toLowerCase(), dark: m[3].toLowerCase() });
}

const hex = (h) => ({ r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) });
const mix = (a, b, t) => {
  const A = hex(a), B = hex(b);
  const f = (x, y) => Math.round(x + (y - x) * t);
  return '#' + [f(A.r, B.r), f(A.g, B.g), f(A.b, B.b)].map((v) => v.toString(16).padStart(2, '0')).join('');
};

const literals = new Set();
for (const e of entries) { literals.add(e.light); literals.add(e.dark); }

const byValue = new Map([...Object.entries(PALETTE)].map(([k, v]) => [v, k]));
const WHITE = '#ffffff', BLACK = '#000000';

function explain(value) {
  if (byValue.has(value)) return { kind: 'palette', text: byValue.get(value) };
  const base = value.slice(0, 7), alpha = value.length === 9 ? value.slice(7) : null;
  if (alpha) {
    if (byValue.has(base)) return { kind: 'alpha', text: `alpha(${byValue.get(base)}, '${alpha}')` };
    // palette colour + alpha expressed after a mix
    for (const [name, pv] of Object.entries(PALETTE)) {
      for (let t = 1; t <= 99; t++) {
        if (mix(pv, WHITE, t / 100) === base) return { kind: 'alpha-of-mix', text: `alpha(mix(${name}, white, ${t / 100}), '${alpha}')` };
      }
    }
    return { kind: 'literal', text: value };
  }
  const names = Object.keys(PALETTE);
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      for (let t = 1; t <= 99; t++) {
        if (mix(PALETTE[names[i]], PALETTE[names[j]], t / 100) === base) {
          return { kind: 'mix', text: `mix(${names[i]}, ${names[j]}, ${t / 100})` };
        }
      }
    }
  }
  for (let t = 1; t <= 99; t++) {
    if (mix(WHITE, BLACK, t / 100) === base) return { kind: 'grey', text: `grey(${t / 100})` };
  }
  return { kind: 'literal', text: value };
}

const counts = {};
const literals_ = [];
const handTuned = [];
for (const value of [...literals].sort()) {
  const e = explain(value);
  counts[e.kind] = (counts[e.kind] || 0) + 1;
  literals_.push({ value, ...e });
  if (e.kind === 'literal') handTuned.push(value);
}

console.log(`CURATED entries      : ${entries.length}`);
console.log(`distinct colour values: ${literals.size}`);
console.log('derivation coverage  :');
for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(14)} ${v}`);
console.log(`\nhand-tuned leftovers (${handTuned.length}):`);
for (const v of handTuned) {
  const used = entries.filter((e) => e.light === v || e.dark === v).map((e) => e.token.replace('--dsw-', ''));
  console.log(`  ${v}  -> ${used.slice(0, 4).join(', ')}${used.length > 4 ? ` (+${used.length - 4})` : ''}`);
}
