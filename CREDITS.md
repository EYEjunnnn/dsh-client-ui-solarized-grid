# Credits

## Solarized

The palette is **Solarized** by Ethan Schoonover (<https://ethanschoonover.com/solarized/>),
released under the MIT License. The 16 anchors used by this plugin are:

| | | | |
| --- | --- | --- | --- |
| base03 `#002b36` | base02 `#073642` | base01 `#586e75` | base00 `#657b83` |
| base0 `#839496` | base1 `#93a1a1` | base2 `#eee8d5` | base3 `#fdf6e3` |
| yellow `#b58900` | orange `#cb4b16` | red `#dc322f` | magenta `#d33682` |
| violet `#6c71c4` | blue `#268bd2` | cyan `#2aa198` | green `#859900` |

## Notebook grid

The two-tier grid (75px major + 15px minor lines, `background-attachment: local`) is adapted
from the **blue-topaz** Obsidian CSS snippet supplied by the original author of this theme,
recoloured with the Solarized palette and re-targeted at the DSH conversation scrollport
(`[data-conversation-scroll]`) instead of Obsidian's reading view. The variable names
(`--bg-color-notebook`, `--grid-notebook-line-color-1/2`, `--dotted-notebook-dot-color`) are
kept from that snippet so the two stay recognisably related.

## DSH design tokens

The 201-entry override table is generated from the DSH web client's own design-token sheets
(`design_platform`, `base`, `gradient_shadow_text`, `scrollbar`, `focus`, `corner_shape`,
`shiki`), which are extracted at build time from the local installation's `app.asar`. Only the
token *values* are remapped; no application file is modified, and the plugin can be removed by
deleting its mount row.

## Development history

Built collaboratively with **DeepSeek Harness** itself: the palette mapping, the contrast
audits (WCAG for text, OKLab ΔE for perceptual distance), the bubble-colour decision record and
the packaging scripts were all produced and verified in-session, with `tokens.js` byte-identity
as the acceptance test for the palette refactor.
