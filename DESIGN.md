# DESIGN.md — Ageason age calculators

Give this file to any coding agent (Claude Code, Cursor…) before it changes the UI.
Based on IBM's Carbon-inspired language (reference: getdesign.md), adapted for a
multilingual calculator site: slightly rounded controls, RTL support, dark mode.

> **Current design:** See [DESIGN_V2.md](DESIGN_V2.md). Its **V3 Editorial precision** section is the approved direction; the pastel Cal.com + Stripe rules there are superseded. The Carbon rules below document the legacy base components; V2 overrides their visuals where necessary.

## Principles
- The result is the hero. Inputs on the left (right in RTL), result panel beside them; stacked on phones.
- One accent colour (blue) for actions, links, focus and progress. No second brand colour.
- Hierarchy comes from size, weight and background change, never from shadows or gradients.
- The signature element is the **year-of-life ruler**: 12 segments under the age, filled by
  months since the last birthday. Don't add other decorative graphics.
- Copy is plain, sentence case, and tells people what to do. Errors say what's wrong and how to fix it.
- Everything works with logical CSS properties (`margin-inline-start`, `inset-inline-*`) so `dir="rtl"` flips it.

## Colour tokens (see `:root` in src/static/assets/css/site.css)
| Token | Light | Dark | Use |
|---|---|---|---|
| canvas | #ffffff | #161616 | page background |
| surface-1 | #f4f4f4 | #262626 | hero band, result panel, inputs |
| surface-2 | #e0e0e0 | #393939 | empty ruler segments |
| ink | #161616 | #f4f4f4 | text |
| ink-muted | #525252 | #c6c6c6 | secondary text, labels |
| hairline | #e0e0e0 | #393939 | 1px dividers, panel borders |
| primary | #0f62fe | #78a9ff | buttons, links, focus, ruler |
| success / error | #198038 / #da1e28 | #42be65 / #ff8389 | callouts, field errors |
| footer | #161616 | #000000 | the only inverted surface |

## Type
- Family: IBM Plex Sans (+ Plex Sans Arabic, Plex Sans Devanagari), self-hosted woff2, `font-display: swap`.
- Japanese uses system fonts (Hiragino / Noto Sans JP / Yu Gothic); don't ship a CJK webfont.
- Scale: h1 42px/300 (32px on phones) · result number 64px/300 · h2 28px/400 · body 16px/400, line-height 1.5–1.6, letter-spacing 0.16px · labels 14px/600 · captions 12–13px.
- Numbers use `font-variant-numeric: tabular-nums`.
- Arabic: no letter-spacing, line-height 1.7–1.8. Japanese: h1 weight 400.

## Spacing & shape
- 4px base: 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Radius: 4px for inputs and buttons, 8px for panels. Nothing is pill-shaped.
- Max content width 1120px; text columns max 68ch.
- Touch targets ≥ 40–48px.

## Components
- **Date field**: three boxes (day/month/year; order follows the locale — US is M/D/Y, Japan is Y/M/D).
  Surface-1 fill, 1px bottom border, 2px blue underline on focus, red underline on error.
  Auto-advances when a part is full; accepts Arabic-Indic, Devanagari and full-width digits.
- **Switch** (segmented): calendar or digit choice; selected = ink background, canvas text.
- **Result panel**: surface-1, caption → big number + unit → sub line → ruler → callouts → stats list.
- **Stats list**: label left, value right, 1px hairline between rows.
- **Callout**: canvas background, 3px start border (blue info / green ok / red problem).
- **FAQ**: `<details>` rows with hairlines and a +/− marker.
- **Ad slots**: `.ad-slot` is hidden until it gets `is-active`, then reserves 280px to avoid layout shift.

## Responsive behaviour
| Width | Layout |
|---|---|
| < 720px (phones) | One column. Compact title band (h1 28px). Menu scrolls sideways with faded edges; the current page's tab is scrolled into view. Empty result box collapses. |
| 720–1023px (tablets) | Form and result side by side, equal columns. |
| ≥ 1024px (laptops, desktops) | Side by side, result wider (5:7). Content max 1120px. |

Phone input flow (datecore.js `autoReveal`):
- Date parts jump to the next box as soon as the value can't grow (day 4–9, month 2–9, or full length),
  because iPhone number pads have no Done/Next key. `enterkeyhint` is set for Android keyboards.
- When the last part of the date of birth is complete, the keyboard closes and the result scrolls into view.
- A "Change date of birth" link sits at the top of the result on phones and jumps back to the form.
- Any new calculator page should call `DC.autoReveal(field, resultEl, label)` to get the same behaviour.

Test sizes before shipping a layout change: 375×667 (iPhone SE), 390×844, 412×915, 768×1024, 1366×768, 1920×1080.

## Don'ts
- In the legacy base components, avoid ornamental shadows and gradients. Design V2 intentionally uses restrained atmospheric gradients, subtle card elevation and hover affordances; follow DESIGN_V2.md for the current site.
- No all-caps labels, no "→" on links, no emoji in UI chrome.
- No layout that pushes the calculator below the fold at 375px wide.

## Accessibility and international layout checklist
- Prefer meaningful labels and visible field errors; connect each invalid date input to its current error message with `aria-describedby` and `aria-invalid`.
- Announce only a concise calculation summary via a dedicated `role="status"` element; do not announce the whole results panel each time an input changes.
- Make the horizontally scrolling tool navigation discoverable and keep focused tabs visible; keyboard and touch input must both work.
- Allow long localized date and number values to wrap rather than clip at 375px wide and in RTL layouts.
- Before merging, inspect light/dark mode, Arabic/English/Japanese/Nepali, browser zoom, reduced motion, and mobile keyboard behavior.
- Brand: Ageason, canonical host: `https://ageason.com`. Regenerate the per-page PNG social cards when branding changes.
