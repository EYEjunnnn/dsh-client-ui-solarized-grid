// Rewrite the CURATED table in build-solarized-tokens.mjs into palette- and role-referenced form,
// so a fork edits the Solarized anchor table S (16 colours) plus ROLES (the deliberately
// hand-tuned values) instead of ~80 scattered literals.
//
// Line-preserving: only lines that are exactly `'token': ['#hex', '#hex'],` are rewritten;
// comments, group headings and non-hex entries (linear-gradient values) are kept verbatim.
// The emitted tokens.js must stay byte-identical - that is the acceptance test.
//
//   node normalize-palette.mjs <build-solarized-tokens.mjs>
import fs from 'node:fs';

const file = process.argv[2];
const src = fs.readFileSync(file, 'utf8');

// Refuse to run twice: the transform is one-shot (the line pattern only matches literals).
if (src.includes('const R = {')) {
  throw new Error('this file looks already normalised (found `const R = {`) - refusing to rewrite it again');
}

const PALETTE = {
  base03: '#002b36', base02: '#073642', base01: '#586e75', base00: '#657b83',
  base0: '#839496', base1: '#93a1a1', base2: '#eee8d5', base3: '#fdf6e3',
  yellow: '#b58900', orange: '#cb4b16', red: '#dc322f', magenta: '#d33682',
  violet: '#6c71c4', blue: '#268bd2', cyan: '#2aa198', green: '#859900',
};

const hex = (h) => ({ r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) });
const mix = (a, b, t) => {
  const A = hex(a), B = hex(b);
  const f = (x, y) => Math.round(x + (y - x) * t);
  return '#' + [f(A.r, B.r), f(A.g, B.g), f(A.b, B.b)].map((v) => v.toString(16).padStart(2, '0')).join('');
};
const lum = (h) => { const { r, g, b } = hex(h); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };

// ---- locate the block and rewrite it line by line ------------------------
const start = src.indexOf('const CURATED = {');
const end = src.indexOf('\n};', start);
const block = src.slice(start, end);
const LINE = /^(\s*)'(--[a-z0-9-]+)':\s*\[\s*'(#[0-9a-fA-F]{6,8})'\s*,\s*'(#[0-9a-fA-F]{6,8})'\s*\]\s*,?\s*$/;
const blockLines = block.split('\n');
const entries = [];
for (const line of blockLines) {
  const m = LINE.exec(line);
  if (m) entries.push({ token: m[2], light: m[3].toLowerCase(), dark: m[4].toLowerCase() });
}

// ---- classify every distinct value --------------------------------------
const byValue = new Map([...Object.entries(PALETTE)].map(([k, v]) => [v, k]));
const values = new Set();
for (const e of entries) { values.add(e.light); values.add(e.dark); }

function classify(value) {
  if (byValue.has(value)) return { expr: `S.${byValue.get(value)}`, kind: 'palette' };
  const base = value.slice(0, 7), alpha = value.length === 9 ? value.slice(7) : null;
  if (alpha && byValue.has(base)) return { expr: `alpha(S.${byValue.get(base)}, '${alpha}')`, kind: 'alpha' };
  const names = Object.keys(PALETTE);
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      for (let t = 1; t <= 99; t++) {
        if (mix(PALETTE[names[i]], PALETTE[names[j]], t / 100) === base) {
          const expr = `mixHex(S.${names[i]}, S.${names[j]}, ${(t / 100).toFixed(2)})`;
          return alpha ? { expr: `alpha(${expr}, '${alpha}')`, kind: 'mix' } : { expr, kind: 'mix' };
        }
      }
    }
  }
  return { expr: null, kind: 'role' };
}

// ---- name the roles -----------------------------------------------------
const usage = new Map();
for (const e of entries) {
  for (const [mode, v] of [['light', e.light], ['dark', e.dark]]) {
    if (!usage.has(v)) usage.set(v, []);
    usage.get(v).push({ token: e.token, mode });
  }
}
const SIGNATURE = {
  '#bfe3e0': 'userCardLight',
  '#e8dfc9': 'userCardDark',
  '#e4ddc8': 'userCardHighlightLight',
  '#124f5e': 'userCardHighlightDark',
};
const roleNames = new Map();
let surfaceDark = 0, surfaceLight = 0;
for (const value of [...values].sort((a, b) => lum(a) - lum(b))) {
  if (classify(value).kind !== 'role') continue;
  if (SIGNATURE[value]) { roleNames.set(value, SIGNATURE[value]); continue; }
  const isDark = lum(value) < 128;
  const semantic = usage.get(value)
    .map((u) => u.token.replace('--dsw-', '').replace(/^(alias|specific)-/, ''))
    .map((s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase()))
    .find((s) => /bubble|card|canvas|sidebar|tooltip|diff|state|success|warn|error|scrollbar|label|tip|menu|input|selector|gradient/i.test(s));
  if (semantic) { roleNames.set(value, `${semantic}${isDark ? 'Dark' : 'Light'}`.slice(0, 32)); continue; }
  if (isDark) { surfaceDark++; roleNames.set(value, `darkSurface${surfaceDark}`); }
  else { surfaceLight++; roleNames.set(value, `lightSurface${surfaceLight}`); }
}
// de-duplicate role names deterministically
const taken = new Set();
for (const [value, name] of [...roleNames].sort((a, b) => lum(a[0]) - lum(b[0]))) {
  let candidate = name, n = 2;
  while (taken.has(candidate)) { candidate = `${name}${n}`; n++; }
  taken.add(candidate);
  roleNames.set(value, candidate);
}

const exprFor = (value) => classify(value).expr ?? `R.${roleNames.get(value)}`;

// ---- rebuild the block, preserving every non-matching line ---------------
const emitted = blockLines.map((line) => {
  const m = LINE.exec(line);
  if (!m) return line;
  return `${m[1]}'${m[2]}': [${exprFor(m[3].toLowerCase())}, ${exprFor(m[4].toLowerCase())}],`;
});

const roleValues = [...roleNames.entries()].sort((a, b) => lum(a[0]) - lum(b[0]));
const roleLines = roleValues.map(([value, name]) => {
  const uses = usage.get(value).map((u) => u.token.replace('--dsw-', '')).slice(0, 3).join(', ');
  const more = usage.get(value).length > 3 ? ` (+${usage.get(value).length - 3})` : '';
  return `  ${name}: '${value}',${' '.repeat(Math.max(1, 28 - name.length))}// ${uses}${more}`;
});

const kinds = {};
for (const v of values) { const k = classify(v).kind; kinds[k] = (kinds[k] || 0) + 1; }
const derived = (kinds.palette || 0) + (kinds.alpha || 0) + (kinds.mix || 0);

const header = `// ---------------------------------------------------------------------------
// The curated table below references, instead of literals:
//   S.*        the 16 Solarized anchors defined above - change one and every token
//              that derives from it (nearest-colour mapping, alpha, mixHex) follows;
//   alpha()    a colour plus a two-digit alpha suffix;
//   mixHex()   byte-space mix of two colours (reproduces the original literals exactly);
//   R.*        the ${roleValues.length} deliberately hand-tuned roles in one place.
// ${derived} of the ${values.size} curated values are derived from S; ${roleValues.length} are roles.
// ---------------------------------------------------------------------------
/** A colour plus a two-digit alpha suffix, e.g. alpha(S.base2, '80') -> #eee8d580. */
const alpha = (colour, aa) => colour + aa;

/** Byte-space mix of two hex colours; reproduces the original literals exactly. */
const mixHex = (a, b, t) => {
  const A = parseColor(a); const B = parseColor(b);
  const ch = (x, y) => Math.round(Math.round(x * 255) + (Math.round(y * 255) - Math.round(x * 255)) * t).toString(16).padStart(2, '0');
  return '#' + ch(A.r, B.r) + ch(A.g, B.g) + ch(A.b, B.b);
};

const R = {
${roleLines.join('\n')}
};

`;

const out = src.slice(0, start) + header + emitted.join('\n') + '\n}' + src.slice(end + 2);
fs.writeFileSync(file, out, 'utf8');

console.log(`entries rewritten : ${entries.length} of ${blockLines.filter((l) => LINE.test(l)).length} hex lines`);
console.log(`distinct values   : ${values.size}`);
console.log(`derived from S    : ${derived}  (palette ${kinds.palette || 0}, alpha ${kinds.alpha || 0}, mix ${kinds.mix || 0})`);
console.log(`named roles (R)   : ${roleValues.length}`);
