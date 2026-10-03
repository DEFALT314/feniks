# HubMI logo ("Razem")

Two people who together form a heart: people helping people. Mockup: `design/makiety/Logo.dc.html` (variant C).

| File | Use |
|---|---|
| `hubmi-znak.svg` | mark on a light background (navy `#1F3A8A`, brick `#C2452B`) |
| `hubmi-znak-bialy.svg` | mark on a navy background (white, salmon `#FF9B85`) |
| `favicon.svg` | browser tab icon → `app/icon.svg` |
| `icon-512.png`, `apple-touch-icon.png` | manifest and phone home-screen icon → `app/` |

**Logo in the header** (a component, not an image with text): 40 px mark + next to it, in a column,
"HubMI" (Bricolage Grotesque 700, 23 px, `letter-spacing: -0.02em`) and "innowacje społeczne Małopolski"
(Atkinson Hyperlegible Next, 13 px, `#4B5565`). 10 px gap. The whole thing is a link to `/` with `aria-label="HubMI – strona główna"`;
the mark has `aria-hidden="true"`. Reference: `design/makiety/Naglowek.dc.html`.

Rules: don't change the colors or proportions, don't add shadows; minimum mark size 16 px; keep clear space around the mark
of at least 1/4 of its width.

## Prompt for the agent (P2)
> Implement the HubMI logo following `design/logo/README.md`: copy `favicon.svg` to `app/icon.svg` and `apple-touch-icon.png`
> to `app/`, build a `components/ui/Logo.tsx` component (inline SVG mark from `hubmi-znak.svg` + name and tagline,
> `light`/`dark` variant) and use it in the header and footer. Set `metadata.icons` in `app/layout.tsx`. Show the plan and wait for "ok".
