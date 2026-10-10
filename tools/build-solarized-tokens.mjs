// Build a Solarized override table for the DSH web client's --dsw-* tokens.
//
// Input : the extracted design-platform token sheet (light ramp/alias + dark ramp/alias).
// Output: solarized/tokens.js  — JS object literal: name -> { light, dark }
//         solarized/review.md  — human review of the mapped values
//
// Strategy: map every declared token to the nearest Solarized role
//   * achromatic inputs            -> piecewise-lightness interpolation over the Solarized
//                                     neutral anchors, with a per-palette clamp
//   * chromatic inputs             -> nearest Solarized accent hue, lightness carried over
//   * color-mix()                  -> resolved to an equivalent literal
// then a curated table overrides the tokens whose Solarized role is semantic rather than
// nearest-colour (body ink, surfaces, diff fills, borders).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// default to the solarized/ folder beside this script, so the toolchain works from any location
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[3] ?? path.join(HERE, '..', 'src');
const sheet = fs.readFileSync(process.argv[2] ?? path.join(HERE, '..', 'token-sheets', 'design_platform_css_default.css'), 'utf8');

// ---------------------------------------------------------------- colour utils
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linearToSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

function parseColor(text) {
  const value = text.trim();
  let m = /^#([0-9a-f]{3,8})$/i.exec(value);
  if (!m) return undefined;
  let h = m[1];
  if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
  if (h.length !== 6 && h.length !== 8) return undefined;
  const n = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
  return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
}

function toHex({ r, g, b, a }) {
  const h = (c) => Math.round(clamp01(c) * 255).toString(16).padStart(2, '0');
  const base = `#${h(r)}${h(g)}${h(b)}`;
  return a >= 1 ? base : `${base}${h(a)}`;
}

function oklab({ r, g, b }) {
  const R = srgbToLinear(r), G = srgbToLinear(g), B = srgbToLinear(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

const lightness = (c) => oklab(c).L;
const chroma = (c) => { const { a, b } = oklab(c); return Math.hypot(a, b); };

function mix(c1, c2, t) {
  const lerp = (x, y) => x + (y - x) * t;
  return { r: lerp(c1.r, c2.r), g: lerp(c1.g, c2.g), b: lerp(c1.b, c2.b), a: lerp(c1.a, c2.a) };
}

// ------------------------------------------------------------ solarized anchors
const S = {
  base3: '#fdf6e3', base2: '#eee8d5', base1: '#93a1a1', base0: '#839496',
  base00: '#657b83', base01: '#586e75', base02: '#073642', base03: '#002b36',
  yellow: '#b58900', orange: '#cb4b16', red: '#dc322f', magenta: '#d33682',
  violet: '#6c71c4', blue: '#268bd2', cyan: '#2aa198', green: '#859900',
};
const C = Object.fromEntries(Object.entries(S).map(([k, v]) => [k, parseColor(v)]));

const NEUTRALS = ['base3', 'base2', 'base1', 'base0', 'base00', 'base01', 'base02', 'base03']
  .map((k) => ({ key: k, color: C[k], L: lightness(C[k]) }));
const ACCENTS = ['yellow', 'orange', 'red', 'magenta', 'violet', 'blue', 'cyan', 'green']
  .map((k) => ({ key: k, color: C[k], L: lightness(C[k]), lab: oklab(C[k]) }));

/** Light palette must never reach the near-black anchors; dark palette may. */
const NEUTRAL_ANCHORS = {
  light: NEUTRALS.filter((n) => n.key !== 'base03'),
  dark: NEUTRALS,
};
/** Canvas a chromatic tint fades toward in each palette. */
const CANVAS = { light: C.base3, dark: C.base03 };

function mapNeutral(color, scheme) {
  const anchors = NEUTRAL_ANCHORS[scheme];
  const L = lightness(color);
  if (L >= anchors[0].L) return { ...anchors[0].color, a: color.a };
  const last = anchors[anchors.length - 1];
  if (L <= last.L) return { ...last.color, a: color.a };
  for (let i = 0; i < anchors.length - 1; i++) {
    const hi = anchors[i], lo = anchors[i + 1];
    if (L <= hi.L && L >= lo.L) {
      const t = (hi.L - L) / (hi.L - lo.L);
      return { ...mix(hi.color, lo.color, t), a: color.a };
    }
  }
  return { ...last.color, a: color.a };
}

function mapAccent(color, scheme) {
  const lab = oklab(color);
  let best, bestD = Infinity;
  for (const accent of ACCENTS) {
    const d = (accent.lab.L - lab.L) ** 2 * 0.35 + (accent.lab.a - lab.a) ** 2 + (accent.lab.b - lab.b) ** 2;
    if (d < bestD) { bestD = d; best = accent; }
  }
  const L = lightness(color);
  const spread = L > best.L ? 1 - best.L : best.L;
  const t = spread <= 0 ? 0 : Math.min(1, Math.abs(L - best.L) / spread);
  const target = L > best.L ? CANVAS[scheme] : CANVAS[scheme];
  return { ...mix(best.color, target, t * 0.9), a: color.a };
}

function solarize(color, scheme) {
  if (color.a === 0) return color;
  return chroma(color) < 0.035 ? mapNeutral(color, scheme) : mapAccent(color, scheme);
}

// ------------------------------------------------------------------ sheet parse
const blocks = [];
for (const m of sheet.matchAll(/([^{}\n]+)\{([^}]*)\}/g)) {
  const decls = new Map();
  for (const part of m[2].split(';')) {
    const idx = part.indexOf(':');
    if (idx < 0) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (name.startsWith('--')) decls.set(name, value);
  }
  blocks.push({ selector: m[1].trim(), decls });
}
const blockFor = (selector, nth = 0) => blocks.filter((b) => b.selector === selector)[nth];
const lightRampless = blockFor('body', 0);
const darkRamp = blockFor('body[data-ds-dark-theme]', 0);
const lightAlias = blockFor('body', 1);
const darkAlias = blockFor('body[data-ds-dark-theme]', 1);

const ramps = new Map([...lightRampless.decls, ...darkRamp.decls]);

function resolveColor(value, aliasDecls, seen = new Set()) {
  const text = value.trim();
  const hex = parseColor(text);
  if (hex) return hex;
  const varRef = /^var\(\s*(--[a-z0-9-]+)\s*\)$/i.exec(text);
  if (varRef) {
    const name = varRef[1];
    if (seen.has(name)) return undefined;
    seen.add(name);
    const next = aliasDecls.get(name) ?? ramps.get(name);
    return next === undefined ? undefined : resolveColor(next, aliasDecls, seen);
  }
  const mixMatch = /^color-mix\(in srgb,\s*(.+?)\s+([\d.]+)%,\s*(.+?)\)$/i.exec(text);
  if (mixMatch) {
    const [, leftRaw, pctRaw, rightRaw] = mixMatch;
    const pct = Number(pctRaw) / 100;
    const left = resolveColor(leftRaw, aliasDecls, new Set(seen));
    if (!left) return undefined;
    if (/^transparent$/i.test(rightRaw.trim())) return { ...left, a: left.a * pct };
    const right = resolveColor(rightRaw, aliasDecls, new Set(seen));
    if (!right) return undefined;
    return mix(left, right, pct);
  }
  return undefined;
}

// ---------------------------------------------------------------- curated table
// light = Solarized Light, dark = Solarized Dark. Names are the rendered tokens.
// ---------------------------------------------------------------------------
// The curated table below references, instead of literals:
//   S.*        the 16 Solarized anchors defined above - change one and every token
//              that derives from it (nearest-colour mapping, alpha, mixHex) follows;
//   alpha()    a colour plus a two-digit alpha suffix;
//   mixHex()   byte-space mix of two colours (reproduces the original literals exactly);
//   R.*        the 37 deliberately hand-tuned roles in one place.
// 43 of the 80 curated values are derived from S; 37 are roles.
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
  sidebarFillDark: '#00232c',             // specific-sidebar-fill
  fileDiffDeletedBgDark: '#3c1f1b',       // alias-file-diff-deleted-bg
  fileDiffDeletedGutterDark: '#4a2521',   // alias-file-diff-deleted-gutter
  stateSuccessTertiaryDark: '#26301f',    // alias-state-success-tertiary
  fileDiffAddedBgDark: '#0a3a2b',         // alias-file-diff-added-bg
  stateWarnTertiaryDark: '#3a3221',       // alias-state-warn-tertiary
  scrollbarBgL1Dark: '#0a3d4a',           // alias-bg-layer-2, alias-turn-trigger-bg, alias-button-primary-dimmed (+5)
  stateBusinessTertiaryDark: '#0d3f57',   // alias-state-business-tertiary
  fileDiffAddedGutterDark: '#0c4433',     // alias-file-diff-added-gutter
  tooltipBgDark: '#0d4652',               // alias-bg-layer-3, alias-bg-overlay, alias-bg-module-platform (+7)
  userCardHighlightDark: '#124f5e',       // alias-bg-multi-select, specific-bubble-highlight, alias-turn-trigger-bg-hover (+7)
  tooltipKeyBgDark: '#12505f',            // alias-tooltip-key-bg
  tooltipKeyBgDark2: '#16606f',           // alias-tooltip-key-bg, alias-scrollbar-hover-l2
  labelSecondaryDark: '#3c5b63',          // alias-label-secondary
  labelDeepDivingDark: '#2076b3',         // alias-label-deep-diving
  darkSurface1: '#1f7ab8',                // alias-button-info-hover
  stateErrorSecondaryDark: '#e15c58',     // alias-state-error-secondary, alias-state-error-secondary
  stateWarnLabelLight: '#a98200',         // alias-state-warn-label
  labelDeepDivingLight: '#3fa0d8',        // alias-label-deep-diving
  labelDeepDivingShimmerLight: '#4a9fd4', // alias-label-deep-diving-shimmer
  lightSurface1: '#4aa3e0',               // alias-button-info-hover
  stateSuccessSecondaryLight: '#9aab1f',  // alias-state-success-secondary, alias-state-success-secondary
  labelDeepDivingShimmerLight2: '#7cc0e8', // alias-label-deep-diving-shimmer
  scrollbarHoverL1Light: '#c9c4b1',       // alias-scrollbar-hover-l1, alias-scrollbar-hover-l2
  labelDimmedLight: '#ddd6c1',            // alias-label-dimmed, alias-state-idle-primary, alias-scrollbar-bg-l1 (+1)
  userCardLight: '#bfe3e0',               // specific-bubble
  userCardHighlightLight: '#e4ddc8',      // specific-bubble-highlight
  userCardDark: '#e8dfc9',                // specific-bubble
  lightSurface2: '#e9e2cf',               // alias-bg-multi-select, alias-turn-trigger-bg-hover, alias-button-ghost-active-fill (+1)
  fileDiffDeletedBgLight: '#f5dfdc',      // alias-file-diff-deleted-bg
  fileDiffAddedBgLight: '#e3ead5',        // alias-file-diff-added-bg
  stateBusinessTertiaryLight: '#dcecf7',  // alias-state-business-tertiary
  selectorLight: '#f2ecd8',               // alias-bg-layer-3, specific-selector, alias-turn-trigger-bg (+4)
  stateWarnTertiaryLight: '#f5ecd2',      // alias-state-warn-tertiary
  fileDiffDeletedGutterLight: '#f8eae8',  // alias-file-diff-deleted-gutter
  stateSuccessTertiaryLight: '#eef0d3',   // alias-state-success-tertiary
  fileDiffAddedGutterLight: '#eef0e0',    // alias-file-diff-added-gutter
};

const CURATED = {
  // canvas, raised surfaces, sidebar
  '--dsw-alias-bg-base': [S.base3, S.base03],
  '--dsw-alias-bg-layer-1': [S.base3, S.base02],
  '--dsw-alias-bg-layer-2': [mixHex(S.base2, S.base3, 0.61), R.scrollbarBgL1Dark],
  '--dsw-alias-bg-layer-3': [R.selectorLight, R.tooltipBgDark],
  '--dsw-alias-bg-overlay': [mixHex(S.base2, S.base3, 0.61), R.tooltipBgDark],
  '--dsw-alias-bg-module-platform': [S.base2, R.tooltipBgDark],
  '--dsw-alias-bg-multi-select': [R.lightSurface2, R.userCardHighlightDark],
  '--dsw-alias-bg-document-preview': [S.base2, S.base03],
  '--dsw-specific-sidebar-fill': [mixHex(S.base2, S.base3, 0.50), R.sidebarFillDark],
  '--dsw-specific-selector': [R.selectorLight, S.base02],
  '--dsw-specific-tip': [S.base2, S.base02],
  '--dsw-specific-input-major': [S.base3, S.base02],
  '--dsw-specific-login-input': [S.base3, S.base03],
  '--dsw-menu-surface-fill': [alpha(S.base3, 'eb'), alpha(S.base02, 'd9')],
  '--dsw-specific-menu': [alpha(S.base3, 'eb'), alpha(S.base02, 'd9')],
  '--dsw-alias-menu-group-header-fill': [alpha(S.base3, 'f0'), alpha(S.base02, 'f0')],
  // conversation
  // 用户气泡：浅色用"淡青卡片"，深色用更亮的青底。选色依据是 OKLab ΔE（含色相/彩度），
  // 而不是单纯亮度差 —— 米色系加深只改亮度（#ddd6c1 ΔE 0.098），淡青把色相拉开约 100°：
  //   浅 含蓄档 #bfe3e0（青+白 30%）ΔE 0.098，正文 #264b55 → 6.88:1，边条 #5849a8 5.21:1
  //   深 象牙 #e8dfc9 ΔE 0.642，正文（由样式表 scoped 覆盖为浅色墨）#264b55 → 7.13:1，边条 #5849a8 5.40:1
  // 注：深色改象牙后，气泡是该模式下最亮的元素（ΔE 是米棕 0.113 的 5.7 倍）。
  //     因为气泡文字令牌是全局的（深色下为 #eee8d5 浅字），象牙卡片的深色墨只能由
  //     grid.css 里一条 scoped 规则提供；边条也随之统一为 #5849a8。
  //     想柔和一点可换 #ddd6c1（ΔE 0.613 / 正文 6.51），想更亮可换 #eee8d5（0.667 / 7.72）。
  '--dsw-specific-bubble': [R.userCardLight, R.userCardDark],
  '--dsw-specific-bubble-highlight': [R.userCardHighlightLight, R.userCardHighlightDark],
  '--dsw-alias-turn-trigger-bg': [R.selectorLight, R.scrollbarBgL1Dark],
  '--dsw-alias-turn-trigger-bg-hover': [R.lightSurface2, R.userCardHighlightDark],
  // ink
  // 浅色槽的加深值（#264b55 / #3c5b63 / #586e75 / #657b83）是 GUI 里已生效的那一套，
  // 这里同步回生成器，避免以后重新构建时把它们退回旧值。深色槽维持原样（本就够亮）。
  '--dsw-alias-label-primary': [mixHex(S.base02, S.base01, 0.38), S.base2],
  '--dsw-alias-label-primary-bluish': [S.base01, S.base2],
  '--dsw-alias-label-primary-dimmed': [S.base00, S.base1],
  '--dsw-alias-label-primary-foreground': [S.base3, S.base03],
  '--dsw-alias-label-primary-inverted': [S.base3, S.base02],
  '--dsw-alias-label-secondary': [R.labelSecondaryDark, S.base1],
  '--dsw-alias-label-tertiary': [S.base01, S.base0],
  '--dsw-alias-label-caption': [S.base00, S.base00],
  '--dsw-alias-label-dimmed': [R.labelDimmedLight, S.base01],
  '--dsw-alias-label-document-preview': [S.base00, S.base1],
  '--dsw-alias-menu-icon': [S.base00, S.base1],
  '--dsw-alias-brand-text': [S.base01, S.base2],
  '--dsw-alias-label-shimmer': [alpha(S.base03, '4d'), alpha(S.base3, '73')],
  // brands and buttons
  '--dsw-alias-brand-primary': [S.base02, S.base3],
  '--dsw-alias-brand-primary-invert': [S.base3, S.base02],
  '--dsw-alias-brand-primary-new-colorprimary-new-color': [S.blue, S.blue],
  '--dsw-alias-button-primary-fill': [S.base02, S.base3],
  '--dsw-alias-button-primary-hover': [R.tooltipBgDark, S.base2],
  '--dsw-alias-button-primary-dimmed': [S.base2, R.scrollbarBgL1Dark],
  '--dsw-alias-button-contrast-fill': [S.base02, S.base3],
  '--dsw-alias-button-elevated-fill': [S.base3, R.userCardHighlightDark],
  '--dsw-alias-button-floating-fill': [S.base3, R.tooltipBgDark],
  '--dsw-alias-button-floating-hover': [mixHex(S.base2, S.base3, 0.61), R.userCardHighlightDark],
  '--dsw-alias-button-ghost-active-fill': [R.lightSurface2, R.userCardHighlightDark],
  '--dsw-alias-button-ghost-active-hover': [S.base2, R.tooltipBgDark],
  '--dsw-alias-button-ghost-active-border': [S.base1, S.base01],
  '--dsw-alias-button-info-fill': [S.blue, S.blue],
  '--dsw-alias-button-info-hover': [R.darkSurface1, R.lightSurface1],
  // states and links
  '--dsw-alias-state-business-primary': [S.blue, S.blue],
  '--dsw-alias-state-business-tertiary': [R.stateBusinessTertiaryLight, R.stateBusinessTertiaryDark],
  '--dsw-alias-link': [S.blue, S.blue],
  '--dsw-alias-state-success-primary': [S.green, S.green],
  '--dsw-alias-state-success-secondary': [R.stateSuccessSecondaryLight, R.stateSuccessSecondaryLight],
  '--dsw-alias-state-success-tertiary': [R.stateSuccessTertiaryLight, R.stateSuccessTertiaryDark],
  '--dsw-alias-state-error-primary': [S.red, S.red],
  '--dsw-alias-state-error-secondary': [R.stateErrorSecondaryDark, R.stateErrorSecondaryDark],
  '--dsw-alias-state-warn-primary': [S.yellow, S.yellow],
  '--dsw-alias-state-warn-secondary': [S.orange, S.orange],
  '--dsw-alias-state-warn-label': [R.stateWarnLabelLight, S.orange],
  '--dsw-alias-state-warn-tertiary': [R.stateWarnTertiaryLight, R.stateWarnTertiaryDark],
  '--dsw-alias-state-idle-primary': [R.labelDimmedLight, R.userCardHighlightDark],
  '--dsw-alias-label-deep-diving': [R.labelDeepDivingDark, R.labelDeepDivingLight],
  '--dsw-alias-label-deep-diving-shimmer': [R.labelDeepDivingShimmerLight, R.labelDeepDivingShimmerLight2],
  // code and markdown
  '--dsw-alias-markdown-code-block': [S.base2, S.base02],
  '--dsw-alias-markdown-code-block-banner': [R.lightSurface2, R.scrollbarBgL1Dark],
  '--dsw-alias-markdown-code-segment-selected': [S.base3, R.userCardHighlightDark],
  '--dsw-alias-markdown-code-segment-unselected': [R.selectorLight, R.scrollbarBgL1Dark],
  '--dsw-alias-markdown-inline-code': [S.base2, S.base02],
  '--dsw-alias-markdown-placeholder': [R.selectorLight, R.tooltipBgDark],
  '--dsw-alias-markdown-tag': [R.selectorLight, R.scrollbarBgL1Dark],
  '--dsw-alias-markdown-citation': [S.base2, R.scrollbarBgL1Dark],
  // diff
  '--dsw-alias-file-diff-added-bg': [R.fileDiffAddedBgLight, R.fileDiffAddedBgDark],
  '--dsw-alias-file-diff-added-gutter': [R.fileDiffAddedGutterLight, R.fileDiffAddedGutterDark],
  '--dsw-alias-file-diff-added-marker': [S.green, S.green],
  '--dsw-alias-file-diff-deleted-bg': [R.fileDiffDeletedBgLight, R.fileDiffDeletedBgDark],
  '--dsw-alias-file-diff-deleted-gutter': [R.fileDiffDeletedGutterLight, R.fileDiffDeletedGutterDark],
  '--dsw-alias-file-diff-deleted-marker': [S.red, S.red],
  '--dsw-alias-code-diff-added': [alpha(S.green, '14'), alpha(S.green, '1f')],
  '--dsw-alias-code-diff-deleted': [alpha(S.red, '14'), alpha(S.red, '1f')],
  // translucent layers, borders, masks
  '--dsw-alias-interactive-bg-hover': [alpha(S.base01, '12'), alpha(S.base3, '14')],
  '--dsw-alias-interactive-bg-active': [alpha(S.base01, '24'), alpha(S.base3, '24')],
  '--dsw-alias-interactive-bg-hover-accent': [alpha(S.blue, '29'), alpha(S.blue, '3d')],
  '--dsw-alias-interactive-bg-hover-danger': [alpha(S.red, '14'), alpha(S.red, '26')],
  '--dsw-alias-interactive-bg-hover-solid': [R.selectorLight, R.userCardHighlightDark],
  '--dsw-alias-bg-skeleton': [alpha(S.base01, '14'), alpha(S.base3, '1f')],
  '--dsw-alias-border-l1': [alpha(S.base01, '14'), alpha(S.base3, '1f')],
  '--dsw-alias-border-l2': [alpha(S.base01, '24'), alpha(S.base3, '29')],
  '--dsw-alias-border-l2-darkmode-thin': [alpha(S.base01, '14'), alpha(S.base3, '1f')],
  '--dsw-alias-border-l3': [alpha(S.base01, '2e'), alpha(S.base3, '33')],
  '--dsw-alias-border-l4': [alpha(S.base01, '38'), alpha(S.base3, '40')],
  '--dsw-alias-border-inverted': [alpha(S.base3, '14'), alpha(S.base03, '1f')],
  '--dsw-alias-border-inverted2': [alpha(S.base3, '1f'), alpha(S.base03, '24')],
  '--dsw-alias-bg-document-selection': [alpha(S.blue, '66'), alpha(S.blue, '66')],
  '--dsw-alias-switch-thumb': [S.base3, S.base1],
  '--dsw-alias-toast-bg': [S.base02, R.tooltipBgDark],
  '--dsw-alias-toast-label': [S.base3, S.base3],
  '--dsw-alias-tooltip-bg': [S.base02, R.tooltipBgDark],
  '--dsw-alias-tooltip-key-bg': [R.tooltipKeyBgDark, R.tooltipKeyBgDark2],
  '--dsw-alias-scrollbar-bg-l1': [R.labelDimmedLight, R.scrollbarBgL1Dark],
  '--dsw-alias-scrollbar-bg-l2': [R.labelDimmedLight, R.tooltipBgDark],
  '--dsw-alias-scrollbar-hover-l1': [R.scrollbarHoverL1Light, R.userCardHighlightDark],
  '--dsw-alias-scrollbar-hover-l2': [R.scrollbarHoverL1Light, R.tooltipKeyBgDark2],
  // skeleton of the frame
  '--dsw-linear-gradient-think': ['linear-gradient(180deg, #fdf6e3 20.19%, #fdf6e300 100%)', 'linear-gradient(180deg, #002b36 20.19%, #002b3600 100%)'],
  '--dsw-linear-think-select': ['linear-gradient(180deg, #f2ecd8 20.19%, #f2ecd800 100%)', 'linear-gradient(180deg, #073642 20.19%, #07364200 100%)'],
};

// ------------------------------------------------------------------- shiki code
// Light-slot values sit a step darker than the raw accents (Solarized accents on base3
// are deliberately low-contrast); the dark slot keeps the accents themselves.
const SHIKI = {
  '--shiki-token-constant': ['#1f7ab8', '#268bd2'],
  '--shiki-token-string': ['#1f8a82', '#2aa198'],
  '--shiki-token-comment': ['#839496', '#657b83'],
  '--shiki-token-keyword': ['#7a8c00', '#859900'],
  '--shiki-token-parameter': ['#c0400f', '#cb4b16'],
  '--shiki-token-function': ['#5f64b4', '#6c71c4'],
  '--shiki-token-string-expression': ['#1f8a82', '#2aa198'],
  '--shiki-token-punctuation': ['#657b83', '#839496'],
  '--shiki-token-link': ['#1f7ab8', '#268bd2'],
};

// ------------------------------------------------------------------------ emit
const tokens = {};
const review = [];
const unresolved = new Set();

function add(name, light, dark, origin) {
  tokens[name] = { light, dark };
  review.push({ name, light, dark, origin });
}

const aliasNames = new Set([...lightAlias.decls.keys(), ...darkAlias.decls.keys()]);
for (const name of aliasNames) {
  const lightValue = lightAlias.decls.get(name) ?? darkAlias.decls.get(name);
  const darkValue = darkAlias.decls.get(name) ?? lightAlias.decls.get(name);
  if (CURATED[name]) { add(name, CURATED[name][0], CURATED[name][1], 'curated'); continue; }
  const lightRaw = resolveColor(lightValue, lightAlias.decls);
  const darkRaw = resolveColor(darkValue, darkAlias.decls);
  if (!lightRaw || !darkRaw) { unresolved.add(name); continue; }
  add(name, toHex(solarize(lightRaw, 'light')), toHex(solarize(darkRaw, 'dark')), 'mapped');
}
// tokens declared by the other theme sheets, which this table also owns
for (const name of ['--dsw-linear-gradient-think', '--dsw-linear-think-select']) {
  if (CURATED[name]) add(name, CURATED[name][0], CURATED[name][1], 'curated');
}
for (const [name, value] of lightRampless.decls) {
  const darkValue = darkRamp.decls.get(name) ?? value;
  const lightRaw = resolveColor(value, ramps);
  const darkRaw = resolveColor(darkValue, ramps);
  if (!lightRaw || !darkRaw) { unresolved.add(name); continue; }
  add(name, toHex(solarize(lightRaw, 'light')), toHex(solarize(darkRaw, 'dark')), 'ramp');
}
for (const [name, pair] of Object.entries(SHIKI)) add(name, pair[0], pair[1], 'shiki');

// tokens the sheet never declared but that the shell reads for the document canvas
add('--dsw-static-neutral-bluish-00', toHex(solarize(parseColor('#ffffff'), 'light')), toHex(solarize(parseColor('#ffffff'), 'dark')), 'ramp');

fs.mkdirSync(OUT, { recursive: true });
const names = Object.keys(tokens).sort();
const body = names.map((n) => `  ${JSON.stringify(n)}: { light: ${JSON.stringify(tokens[n].light)}, dark: ${JSON.stringify(tokens[n].dark)} },`).join('\n');
fs.writeFileSync(path.join(OUT, 'tokens.js'), `export const SOLARIZED_TOKENS = {\n${body}\n};\n`);
fs.writeFileSync(path.join(OUT, 'tokens.json'), JSON.stringify(tokens, null, 2));
fs.writeFileSync(path.join(OUT, 'review.md'), [
  '| token | light | dark | origin |', '| --- | --- | --- | --- |',
  ...review.map((r) => `| \`${r.name}\` | \`${r.light}\` | \`${r.dark}\` | ${r.origin} |`),
].join('\n'));

console.log(`tokens: ${names.length} (aliases ${lightAlias.decls.size}, ramps ${lightRampless.decls.size}, shiki ${Object.keys(SHIKI).length})`);
console.log(`curated: ${Object.keys(CURATED).filter((n) => tokens[n]).length}`);
if (unresolved.size) console.log('unresolved:', [...unresolved].join(', '));
const missing = Object.keys(CURATED).filter((n) => !tokens[n]);
if (missing.length) console.log('curated names not present in the sheet:', missing.join(', '));
