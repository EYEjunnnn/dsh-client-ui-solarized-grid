# Changelog

## 1.0.0

First public release.

**Palette**
- All 201 declared `--dsw-*` tokens remapped: light → Solarized Light, dark → Solarized Dark.
- Light-mode ink deepened for readability (`--dsw-alias-label-primary` → `#264b55`,
  `-secondary` → `#3c5b63`, `-tertiary` → `#586e75`, `-caption` → `#657b83`; contrast ≥ 6.9:1
  on the canvas).
- The generated table is expressed against the 16 Solarized anchors plus 37 named roles
  (43 of the 80 curated values derive from the anchors by reference, alpha or documented mix),
  so a fork can recolour the theme from one place. `tokens.js` is byte-identical before and
  after that refactor — that was the acceptance test.

**Background**
- Notebook grid on the conversation scrollport: 75px major + 15px minor lines,
  `background-attachment: local`, canvas `#fdf6e3` (light) / `#002b36` (dark).

**User message bubble**
- Light: pale-cyan card `#bfe3e0`, 3px ink bar `#002b36`.
- Dark: ivory card `#e8dfc9`, 3px vermilion bar `#ff5900`, scoped dark ink `#264b55`
  (the global dark ink would render 1.08:1 — invisible — on the ivory card).
- 1px inner hairline (`rgba(38,75,85,.2)`) defines the card against the canvas; it matters most
  in light mode, where the card sits only ΔE 0.098 away from the paper.
- The accent uses `inset box-shadow` on purpose: that is what tapers along the corner radius
  (a gradient bar gets its ends cut by the arc).

**Packaging**
- Ships as a self-mounting bundle: `dsh.client` (browser half) plus `dsh.bundle.patch`
  (`cordis.patch.yml`), so installing needs no manual profile-YAML editing.
- `install.ps1` / `uninstall.ps1` cover the offline copy route for the desktop app, which has no
  `dsh` CLI.
