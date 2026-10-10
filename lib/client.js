/**
 * Browser half of dsh-client-ui-solarized-grid.
 *
 * Registers the Solarized token override layer on the theme service and injects the
 * notebook-grid stylesheet. The bundle is a single self-contained module: it requires
 * nothing from the shared platform table and owns only the style element it appends.
 */
window.__ModuleLoader__.load({
	id: "dsh-client-ui-solarized-grid",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		/** Override-layer identity, also used as the owned stylesheet's tag. */
		const SOURCE = "dsh-client-ui-solarized-grid";
		/** Marks the once-per-browser light-appearance pin. */
		const LIGHT_PIN_KEY = "dsh-solarized-grid:light-pinned";
		/** Stylesheet owned by this bundle; the module system drops it on teardown. */
		const gridCss = "/* Solarized notebook background + user-bubble accent.\n   Part 1: adapted from the \"86~115 网格背景 / notebook background\" CSS (blue-topaz):\n   the same two-tier grid (75px major + 15px minor lines) and the same variable\n   names, recoloured with the Solarized palette and applied to the transcript\n   surface instead of Obsidian's reading view.\n   Part 2 (bottom): the user message bubble — left accent bar plus the dark-mode ink. */\n\nhtml body {\n  --bg-color-notebook: #fdf6e3;\n  --grid-notebook-line-color-1: #93a1a124;\n  --grid-notebook-line-color-2: #586e7533;\n  --dotted-notebook-dot-color: #93a1a124;\n  background-color: var(--bg-color-notebook);\n}\n\nhtml body[data-ds-dark-theme] {\n  --bg-color-notebook: #002b36;\n  --grid-notebook-line-color-1: #586e7540;\n  --grid-notebook-line-color-2: #93a1a14d;\n  --dotted-notebook-dot-color: #586e7540;\n  background-color: var(--bg-color-notebook);\n}\n\n/* The conversation transcript scrollport — the GUI's counterpart of Obsidian's\n   `.markdown-reading-view .markdown-rendered` / `.cm-scroller`. */\n[data-conversation-scroll] {\n  background-color: var(--bg-color-notebook);\n  background-image:\n    linear-gradient(var(--grid-notebook-line-color-2) 1px, transparent 0),\n    linear-gradient(90deg, var(--grid-notebook-line-color-2) 1px, transparent 0),\n    linear-gradient(var(--grid-notebook-line-color-1) 1px, transparent 0),\n    linear-gradient(90deg, var(--grid-notebook-line-color-1) 1px, transparent 0);\n  background-size: 75px 75px, 75px 75px, 15px 15px, 15px 15px;\n  background-attachment: local !important;\n}\n\n/* ---------------------------------------------------------------------------\n   用户消息气泡：左侧 3px 边条 + 分模式的卡片底色\n   底色（令牌 --dsw-specific-bubble）：浅色 含蓄档 #bfe3e0；深色 象牙 #e8dfc9。\n\n   边条用【单色 + inset box-shadow】。\n   ★ 为什么不能换成 background-image 渐变：渐变画出来的是\"3px 直条\"，被圆角一裁，\n     两端就成了被弧线硬切掉的方角；而 inset box-shadow 是\"外圆角矩形 − 同形状内移\n     3px 的差集\"，两端会顺着弧线自然收窄 —— 也就是原来那种弯弧感。双色烫金只能靠\n     渐变（box-shadow 画不出多段配色），代价就是丢掉弯弧，故已弃用。\n\n   当前取值：\n     浅色 #002b36（深色模式的画布色）在 #bfe3e0 上 10.92:1 / ΔE 0.622\n     深色 古金 #9c7a00 在象牙 #e8dfc9 上 3.05:1 / ΔE 0.322\n\n   金色系实测（象牙底；卡片是浅色面 → 可见度由明度决定，越金越看不见）：\n     #ffe866 1.07:1/0.122 · #ffd700 1.06:1/0.153 · #d4af37 1.59:1/0.175\n     #b58900 2.42:1/0.271 · #9c7a00 3.05:1/0.322（当前） · #8a6a00 3.82:1/0.372\n     #5c3d00 墨赭 7.46:1/0.521（判定\"像米棕\"） · #002b36 11.32:1/0.642\n   金要有深底才真正成立（烫金压在深色皮革上）：\n     深棕 #443a2d + #ffd700 → 7.93:1/0.555 ｜ 更深 #2a2825 + #ffd700 → 10.48:1/0.634\n\n   深色墨：气泡文字读的是全局 --dsw-alias-label-primary（深色下是浅色 #eee8d5），\n   放在象牙卡片上只有 1.08:1，等于看不见，因此在这里 scoped 覆盖成 #264b55\n   （在 #e8dfc9 上 7.13:1）。用户消息是纯文本，一个 color 即可覆盖全部文字。\n   选择器用属性子串匹配以避开构建哈希（类名形如 cJsG2q_bubble），并限定在 _userRow 之内：\n   用户消息、待发回声、引导消息共用同一个气泡组件。\n   --------------------------------------------------------------------------- */\nhtml body {\n  --dsh-bubble-accent: #002b36;\n}\n\nhtml body[data-ds-dark-theme] {\n  --dsh-bubble-accent: #ff5900;\n}\n\n/* 深色边条定为 #ff5900（朱橙，用户选定）+ 1px 内描边。\n   为什么不为了过 3:1 而加深这个橙：橙族在本主题里已被语义占用 ——\n     #cb4b16 = state-warn-*（警告）  #dc322f = state-error-primary / code-diff-deleted（错误、删除）\n   #ff5900 与警告橙 ΔE 0.108（橙族里离语义色最远），而刚好过 3:1 的 #d94800 与警告橙\n   只差 ΔE 0.026 —— 加深等于把\"我的消息\"做成警示徽标，故保持亮橙不动。\n   于是存在感另想办法（两项都是 inset box-shadow，弯弧照旧）：\n     · 1px 内描边 inset 0 0 0 1px rgba(38,75,85,.2)：\n         象牙卡内侧等效 #c1c1b2（与卡片 ΔE 0.099）、淡青卡内侧等效 #a0c5c4（ΔE 0.093）。\n         浅色模式受益最大 —— 淡青卡片与米色画布本来只差 ΔE 0.098，加框后边界立刻清楚。\n         嫌轻/重就调 alpha（.14 ~ .26）。\n     · （备选，本次未采用）边条加宽 3px → 4px，面积 +33%。\n   注：#ff5900 在象牙卡片上只有 2.37:1（低于非文本元素的 3:1 门槛），但它贴着深色画布\n   那一侧是 4.78:1 —— 观感上的\"跳\"主要来自这条外缘。 */\n[class*=\"_userRow\"] [class*=\"_bubble\"] {\n  box-shadow: inset 3px 0 0 0 var(--dsh-bubble-accent),\n              inset 0 0 0 1px rgba(38, 75, 85, .2);\n}\n\nhtml body[data-ds-dark-theme] [class*=\"_userRow\"] [class*=\"_bubble\"] {\n  color: #264b55;\n}";

		const SOLARIZED_TOKENS = {
  "--dsw-alias-bg-base": { light: "#fdf6e3", dark: "#002b36" },
  "--dsw-alias-bg-document-preview": { light: "#eee8d5", dark: "#002b36" },
  "--dsw-alias-bg-document-selection": { light: "#268bd266", dark: "#268bd266" },
  "--dsw-alias-bg-layer-1": { light: "#fdf6e3", dark: "#073642" },
  "--dsw-alias-bg-layer-2": { light: "#f7f1de", dark: "#0a3d4a" },
  "--dsw-alias-bg-layer-3": { light: "#f2ecd8", dark: "#0d4652" },
  "--dsw-alias-bg-mask-1": { light: "#0736423d", dark: "#002b3680" },
  "--dsw-alias-bg-mask-2": { light: "#0736421f", dark: "#002b3633" },
  "--dsw-alias-bg-mask-3": { light: "#0736427a", dark: "#002b367a" },
  "--dsw-alias-bg-mask-drop": { light: "#fdf6e3b3", dark: "#022d39b3" },
  "--dsw-alias-bg-mask-photo": { light: "#073642e0", dark: "#002b36e0" },
  "--dsw-alias-bg-module-platform": { light: "#eee8d5", dark: "#0d4652" },
  "--dsw-alias-bg-multi-select": { light: "#e9e2cf", dark: "#124f5e" },
  "--dsw-alias-bg-overlay": { light: "#f7f1de", dark: "#0d4652" },
  "--dsw-alias-bg-skeleton": { light: "#586e7514", dark: "#fdf6e31f" },
  "--dsw-alias-border-inverted": { light: "#fdf6e314", dark: "#002b361f" },
  "--dsw-alias-border-inverted2": { light: "#fdf6e31f", dark: "#002b3624" },
  "--dsw-alias-border-l1": { light: "#586e7514", dark: "#fdf6e31f" },
  "--dsw-alias-border-l2": { light: "#586e7524", dark: "#fdf6e329" },
  "--dsw-alias-border-l2-darkmode-thin": { light: "#586e7514", dark: "#fdf6e31f" },
  "--dsw-alias-border-l3": { light: "#586e752e", dark: "#fdf6e333" },
  "--dsw-alias-border-l4": { light: "#586e7538", dark: "#fdf6e340" },
  "--dsw-alias-brand-primary": { light: "#073642", dark: "#fdf6e3" },
  "--dsw-alias-brand-primary-invert": { light: "#fdf6e3", dark: "#073642" },
  "--dsw-alias-brand-primary-new-colorprimary-new-color": { light: "#268bd2", dark: "#268bd2" },
  "--dsw-alias-brand-text": { light: "#586e75", dark: "#eee8d5" },
  "--dsw-alias-button-contrast-fill": { light: "#073642", dark: "#fdf6e3" },
  "--dsw-alias-button-elevated-fill": { light: "#fdf6e3", dark: "#124f5e" },
  "--dsw-alias-button-floating-fill": { light: "#fdf6e3", dark: "#0d4652" },
  "--dsw-alias-button-floating-hover": { light: "#f7f1de", dark: "#124f5e" },
  "--dsw-alias-button-ghost-active-border": { light: "#93a1a1", dark: "#586e75" },
  "--dsw-alias-button-ghost-active-fill": { light: "#e9e2cf", dark: "#124f5e" },
  "--dsw-alias-button-ghost-active-hover": { light: "#eee8d5", dark: "#0d4652" },
  "--dsw-alias-button-info-fill": { light: "#268bd2", dark: "#268bd2" },
  "--dsw-alias-button-info-hover": { light: "#1f7ab8", dark: "#4aa3e0" },
  "--dsw-alias-button-primary-dimmed": { light: "#eee8d5", dark: "#0a3d4a" },
  "--dsw-alias-button-primary-fill": { light: "#073642", dark: "#fdf6e3" },
  "--dsw-alias-button-primary-hover": { light: "#0d4652", dark: "#eee8d5" },
  "--dsw-alias-button-tool-bar-fill": { light: "#3c5b6380", dark: "#3c5b6380" },
  "--dsw-alias-button-tool-bar-fill-invisible": { light: "#0736425c", dark: "#002b365c" },
  "--dsw-alias-button-tool-bar-hover": { light: "#3c5b6399", dark: "#3c5b6399" },
  "--dsw-alias-code-diff-added": { light: "#85990014", dark: "#8599001f" },
  "--dsw-alias-code-diff-deleted": { light: "#dc322f14", dark: "#dc322f1f" },
  "--dsw-alias-file-diff-added-bg": { light: "#e3ead5", dark: "#0a3a2b" },
  "--dsw-alias-file-diff-added-gutter": { light: "#eef0e0", dark: "#0c4433" },
  "--dsw-alias-file-diff-added-marker": { light: "#859900", dark: "#859900" },
  "--dsw-alias-file-diff-deleted-bg": { light: "#f5dfdc", dark: "#3c1f1b" },
  "--dsw-alias-file-diff-deleted-gutter": { light: "#f8eae8", dark: "#4a2521" },
  "--dsw-alias-file-diff-deleted-marker": { light: "#dc322f", dark: "#dc322f" },
  "--dsw-alias-interactive-bg-active": { light: "#586e7524", dark: "#fdf6e324" },
  "--dsw-alias-interactive-bg-hover": { light: "#586e7512", dark: "#fdf6e314" },
  "--dsw-alias-interactive-bg-hover-accent": { light: "#268bd229", dark: "#268bd23d" },
  "--dsw-alias-interactive-bg-hover-danger": { light: "#dc322f14", dark: "#dc322f26" },
  "--dsw-alias-interactive-bg-hover-solid": { light: "#f2ecd8", dark: "#124f5e" },
  "--dsw-alias-label-caption": { light: "#657b83", dark: "#657b83" },
  "--dsw-alias-label-deep-diving": { light: "#2076b3", dark: "#3fa0d8" },
  "--dsw-alias-label-deep-diving-shimmer": { light: "#4a9fd4", dark: "#7cc0e8" },
  "--dsw-alias-label-dimmed": { light: "#ddd6c1", dark: "#586e75" },
  "--dsw-alias-label-document-preview": { light: "#657b83", dark: "#93a1a1" },
  "--dsw-alias-label-primary": { light: "#264b55", dark: "#eee8d5" },
  "--dsw-alias-label-primary-bluish": { light: "#586e75", dark: "#eee8d5" },
  "--dsw-alias-label-primary-dimmed": { light: "#657b83", dark: "#93a1a1" },
  "--dsw-alias-label-primary-foreground": { light: "#fdf6e3", dark: "#002b36" },
  "--dsw-alias-label-primary-inverted": { light: "#fdf6e3", dark: "#073642" },
  "--dsw-alias-label-secondary": { light: "#3c5b63", dark: "#93a1a1" },
  "--dsw-alias-label-shimmer": { light: "#002b364d", dark: "#fdf6e373" },
  "--dsw-alias-label-tertiary": { light: "#586e75", dark: "#839496" },
  "--dsw-alias-link": { light: "#268bd2", dark: "#268bd2" },
  "--dsw-alias-markdown-citation": { light: "#eee8d5", dark: "#0a3d4a" },
  "--dsw-alias-markdown-code-block": { light: "#eee8d5", dark: "#073642" },
  "--dsw-alias-markdown-code-block-banner": { light: "#e9e2cf", dark: "#0a3d4a" },
  "--dsw-alias-markdown-code-segment-selected": { light: "#fdf6e3", dark: "#124f5e" },
  "--dsw-alias-markdown-code-segment-unselected": { light: "#f2ecd8", dark: "#0a3d4a" },
  "--dsw-alias-markdown-inline-code": { light: "#eee8d5", dark: "#073642" },
  "--dsw-alias-markdown-placeholder": { light: "#f2ecd8", dark: "#0d4652" },
  "--dsw-alias-markdown-tag": { light: "#f2ecd8", dark: "#0a3d4a" },
  "--dsw-alias-menu-group-header-fill": { light: "#fdf6e3f0", dark: "#073642f0" },
  "--dsw-alias-menu-icon": { light: "#657b83", dark: "#93a1a1" },
  "--dsw-alias-scrollbar-bg-l1": { light: "#ddd6c1", dark: "#0a3d4a" },
  "--dsw-alias-scrollbar-bg-l2": { light: "#ddd6c1", dark: "#0d4652" },
  "--dsw-alias-scrollbar-hover-l1": { light: "#c9c4b1", dark: "#124f5e" },
  "--dsw-alias-scrollbar-hover-l2": { light: "#c9c4b1", dark: "#16606f" },
  "--dsw-alias-state-business-primary": { light: "#268bd2", dark: "#268bd2" },
  "--dsw-alias-state-business-tertiary": { light: "#dcecf7", dark: "#0d3f57" },
  "--dsw-alias-state-error-primary": { light: "#dc322f", dark: "#dc322f" },
  "--dsw-alias-state-error-secondary": { light: "#e15c58", dark: "#e15c58" },
  "--dsw-alias-state-idle-primary": { light: "#ddd6c1", dark: "#124f5e" },
  "--dsw-alias-state-success-primary": { light: "#859900", dark: "#859900" },
  "--dsw-alias-state-success-secondary": { light: "#9aab1f", dark: "#9aab1f" },
  "--dsw-alias-state-success-tertiary": { light: "#eef0d3", dark: "#26301f" },
  "--dsw-alias-state-warn-label": { light: "#a98200", dark: "#cb4b16" },
  "--dsw-alias-state-warn-primary": { light: "#b58900", dark: "#b58900" },
  "--dsw-alias-state-warn-secondary": { light: "#cb4b16", dark: "#cb4b16" },
  "--dsw-alias-state-warn-tertiary": { light: "#f5ecd2", dark: "#3a3221" },
  "--dsw-alias-switch-thumb": { light: "#fdf6e3", dark: "#93a1a1" },
  "--dsw-alias-toast-bg": { light: "#073642", dark: "#0d4652" },
  "--dsw-alias-toast-label": { light: "#fdf6e3", dark: "#fdf6e3" },
  "--dsw-alias-tooltip-bg": { light: "#073642", dark: "#0d4652" },
  "--dsw-alias-tooltip-key-bg": { light: "#12505f", dark: "#16606f" },
  "--dsw-alias-turn-trigger-bg": { light: "#f2ecd8", dark: "#0a3d4a" },
  "--dsw-alias-turn-trigger-bg-hover": { light: "#e9e2cf", dark: "#124f5e" },
  "--dsw-linear-gradient-think": { light: "linear-gradient(180deg, #fdf6e3 20.19%, #fdf6e300 100%)", dark: "linear-gradient(180deg, #002b36 20.19%, #002b3600 100%)" },
  "--dsw-linear-think-select": { light: "linear-gradient(180deg, #f2ecd8 20.19%, #f2ecd800 100%)", dark: "linear-gradient(180deg, #073642 20.19%, #07364200 100%)" },
  "--dsw-menu-surface-fill": { light: "#fdf6e3eb", dark: "#073642d9" },
  "--dsw-specific-bubble": { light: "#bfe3e0", dark: "#e8dfc9" },
  "--dsw-specific-bubble-highlight": { light: "#e4ddc8", dark: "#124f5e" },
  "--dsw-specific-input-major": { light: "#fdf6e3", dark: "#073642" },
  "--dsw-specific-login-input": { light: "#fdf6e3", dark: "#002b36" },
  "--dsw-specific-menu": { light: "#fdf6e3eb", dark: "#073642d9" },
  "--dsw-specific-selector": { light: "#f2ecd8", dark: "#073642" },
  "--dsw-specific-sidebar-fill": { light: "#f6efdc", dark: "#00232c" },
  "--dsw-specific-sidebar-nav-item-active": { light: "#f4eedb", dark: "#264b55" },
  "--dsw-specific-sidebar-nav-item-active-accent": { light: "#f3ecd9", dark: "#103c48" },
  "--dsw-specific-sidebar-nav-item-hover": { light: "#f9f3e0", dark: "#04323e" },
  "--dsw-specific-tip": { light: "#eee8d5", dark: "#073642" },
  "--dsw-static-amber-100": { light: "#fdf6e3", dark: "#fdf6e3" },
  "--dsw-static-amber-400": { light: "#d0b256", dark: "#716614" },
  "--dsw-static-amber-500": { light: "#caa943", dark: "#7f6d10" },
  "--dsw-static-amber-600": { light: "#bd951a", dark: "#a07e06" },
  "--dsw-static-amber-900": { light: "#073642", dark: "#002b36" },
  "--dsw-static-blue-100": { light: "#eee8d5", dark: "#eee8d5" },
  "--dsw-static-blue-300": { light: "#88bcda", dark: "#155f8b" },
  "--dsw-static-blue-400": { light: "#58a4d6", dark: "#1d75ae" },
  "--dsw-static-blue-450": { light: "#4098d4", dark: "#217fbf" },
  "--dsw-static-blue-50": { light: "#fcf5e2", dark: "#fcf5e2" },
  "--dsw-static-blue-500": { light: "#2a8dd2", dark: "#2589cf" },
  "--dsw-static-blue-50p": { light: "#f9f2df", dark: "#f9f2df" },
  "--dsw-static-blue-600": { light: "#3c96d4", dark: "#2281c2" },
  "--dsw-static-blue-75": { light: "#f5efdc", dark: "#f5efdc" },
  "--dsw-static-blue-800": { light: "#8f91cc", dark: "#5260a1" },
  "--dsw-static-blue-900": { light: "#a4a4d0", dark: "#42568d" },
  "--dsw-static-blue-950": { light: "#afafd2", dark: "#3a5182" },
  "--dsw-static-deepseek-100": { light: "#f3ecd9", dark: "#f3ecd9" },
  "--dsw-static-deepseek-200": { light: "#b8dacb", dark: "#0e5156" },
  "--dsw-static-deepseek-300": { light: "#96c3db", dark: "#125980" },
  "--dsw-static-deepseek-400": { light: "#65aad7", dark: "#1b6fa5" },
  "--dsw-static-deepseek-450": { light: "#3693d3", dark: "#2384c6" },
  "--dsw-static-deepseek-50": { light: "#f9f3e0", dark: "#f9f3e0" },
  "--dsw-static-deepseek-500": { light: "#2e8fd3", dark: "#2587cc" },
  "--dsw-static-deepseek-600": { light: "#787cc7", dark: "#636bb8" },
  "--dsw-static-deepseek-700-delete": { light: "#8e90cb", dark: "#5361a3" },
  "--dsw-static-deepseek-800": { light: "#9a9cce", dark: "#495b97" },
  "--dsw-static-deepseek-900": { light: "#083743", dark: "#083743" },
  "--dsw-static-green-100": { light: "#fbf4e1", dark: "#fbf4e1" },
  "--dsw-static-green-400": { light: "#abb647", dark: "#5b7611" },
  "--dsw-static-green-500": { light: "#9dab2d", dark: "#6b830b" },
  "--dsw-static-green-500-a08": { light: "#9dab2d14", dark: "#6b830b14" },
  "--dsw-static-green-500-a12": { light: "#9dab2d1f", dark: "#6b830b1f" },
  "--dsw-static-green-900": { light: "#86c6b9", dark: "#186d6d" },
  "--dsw-static-neutral-00": { light: "#fdf6e3", dark: "#fdf6e3" },
  "--dsw-static-neutral-100": { light: "#fcf5e2", dark: "#fcf5e2" },
  "--dsw-static-neutral-1000": { light: "#073642", dark: "#002b36" },
  "--dsw-static-neutral-150": { light: "#f3edda", dark: "#f3edda" },
  "--dsw-static-neutral-200": { light: "#ebe5d3", dark: "#ebe5d3" },
  "--dsw-static-neutral-250": { light: "#e0ddcd", dark: "#e0ddcd" },
  "--dsw-static-neutral-300": { light: "#d6d5c7", dark: "#d6d5c7" },
  "--dsw-static-neutral-400": { light: "#9ba7a5", dark: "#9ba7a5" },
  "--dsw-static-neutral-50": { light: "#fdf6e3", dark: "#fdf6e3" },
  "--dsw-static-neutral-500": { light: "#72868b", dark: "#72868b" },
  "--dsw-static-neutral-550": { light: "#546b73", dark: "#546b73" },
  "--dsw-static-neutral-600": { light: "#3c5b63", dark: "#3c5b63" },
  "--dsw-static-neutral-700": { light: "#19424d", dark: "#19424d" },
  "--dsw-static-neutral-800": { light: "#073642", dark: "#022f3a" },
  "--dsw-static-neutral-850": { light: "#073642", dark: "#002b36" },
  "--dsw-static-neutral-900": { light: "#073642", dark: "#002b36" },
  "--dsw-static-neutral-bluish-00": { light: "#fdf6e3", dark: "#fdf6e3" },
  "--dsw-static-neutral-bluish-100": { light: "#f4eedb", dark: "#f4eedb" },
  "--dsw-static-neutral-bluish-1000": { light: "#073642", dark: "#002b36" },
  "--dsw-static-neutral-bluish-150": { light: "#f2ecd9", dark: "#f2ecd9" },
  "--dsw-static-neutral-bluish-200": { light: "#eae5d3", dark: "#eae5d3" },
  "--dsw-static-neutral-bluish-300": { light: "#d4d4c6", dark: "#d4d4c6" },
  "--dsw-static-neutral-bluish-400": { light: "#acb4af", dark: "#acb4af" },
  "--dsw-static-neutral-bluish-50": { light: "#fdf6e3", dark: "#fdf6e3" },
  "--dsw-static-neutral-bluish-500": { light: "#92a0a0", dark: "#92a0a0" },
  "--dsw-static-neutral-bluish-60": { light: "#fdf6e3", dark: "#fdf6e3" },
  "--dsw-static-neutral-bluish-600": { light: "#76898e", dark: "#76898e" },
  "--dsw-static-neutral-bluish-700": { light: "#526a71", dark: "#526a71" },
  "--dsw-static-neutral-bluish-75": { light: "#f9f3e0", dark: "#f9f3e0" },
  "--dsw-static-neutral-bluish-750": { light: "#264b55", dark: "#264b55" },
  "--dsw-static-neutral-bluish-800": { light: "#103c48", dark: "#103c48" },
  "--dsw-static-neutral-bluish-850": { light: "#073642", dark: "#04323e" },
  "--dsw-static-neutral-bluish-875": { light: "#073642", dark: "#002b36" },
  "--dsw-static-neutral-bluish-900": { light: "#073642", dark: "#002b36" },
  "--dsw-static-neutral-bluish-950": { light: "#073642", dark: "#002b36" },
  "--dsw-static-red-100": { light: "#f0ead7", dark: "#f0ead7" },
  "--dsw-static-red-400": { light: "#e2554f", dark: "#b53130" },
  "--dsw-static-red-400-a12": { light: "#e2554f1f", dark: "#b531301f" },
  "--dsw-static-red-50": { light: "#fcf5e2", dark: "#fcf5e2" },
  "--dsw-static-red-500": { light: "#e04843", dark: "#c43130" },
  "--dsw-static-red-600": { light: "#dd3733", dark: "#d7322f" },
  "--dsw-static-red-600-a08": { light: "#dd373314", dark: "#d7322f14" },
  "--dsw-static-red-900": { light: "#e19670", dark: "#723d24" },
  "--shiki-token-comment": { light: "#839496", dark: "#657b83" },
  "--shiki-token-constant": { light: "#1f7ab8", dark: "#268bd2" },
  "--shiki-token-function": { light: "#5f64b4", dark: "#6c71c4" },
  "--shiki-token-keyword": { light: "#7a8c00", dark: "#859900" },
  "--shiki-token-link": { light: "#1f7ab8", dark: "#268bd2" },
  "--shiki-token-parameter": { light: "#c0400f", dark: "#cb4b16" },
  "--shiki-token-punctuation": { light: "#657b83", dark: "#839496" },
  "--shiki-token-string": { light: "#1f8a82", dark: "#2aa198" },
  "--shiki-token-string-expression": { light: "#1f8a82", dark: "#2aa198" },
};

		/** Append this bundle's stylesheet once, following the ui-theme convention. */
		function installStyles() {
			if (typeof document === "undefined") return () => {};
			const tagId = `${SOURCE}/grid.css`;
			if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tagId)}]`) !== null) return () => {};
			const tag = document.createElement("style");
			tag.dataset.plugin = SOURCE;
			tag.dataset.pluginCss = tagId;
			tag.textContent = gridCss;
			document.head.appendChild(tag);
			return () => tag.remove();
		}

		/**
		 * Show Solarized Light on first sight. The stored preference stays untouched when it
		 * already resolves light; a dark resolution is pinned to light once per browser, and
		 * a later choice in Settings is respected until this key is cleared.
		 */
		function pinLight(ctx) {
			try {
				if (localStorage.getItem(LIGHT_PIN_KEY) !== null) return;
				localStorage.setItem(LIGHT_PIN_KEY, "1");
				if (ctx.theme.getTheme().active.colorScheme === "dark") ctx.theme.setTheme("light");
			} catch {
				/* private mode or a documentless run: keep the stored preference */
			}
		}

		/** Service requirement: the theme registry that owns the snapshot. */
		const inject = ["theme"];

		/**
		 * Provide the Solarized palette and the notebook background.
		 * @param ctx - Client root context.
		 */
		function apply(ctx) {
			ctx.effect(() => installStyles(), `${SOURCE}: grid stylesheet`);
			ctx.effect(() => ctx.theme.overrideTokens(SOURCE, SOLARIZED_TOKENS), `${SOURCE}: token override layer`);
			ctx.effect(() => {
				pinLight(ctx);
			}, `${SOURCE}: light appearance pin`);
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
