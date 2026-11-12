# Ageason Design V2 — Cal.com clarity + Stripe-inspired atmosphere

This is an original Ageason visual system inspired by the clean, product-focused interaction patterns of Cal.com and restrained atmospheric gradients associated with Stripe. It does **not** reproduce either company's proprietary assets.

## V3 visual direction — Editorial precision (supersedes the pastel rules below)

Decided 12 Nov 2026 after reviewing the built site. The pastel Cal.com/Stripe look is tidy but
generic, and the one element unique to Ageason, the big age number and the year-of-life ruler,
is the smallest thing on screen. V3 makes the number and the ruler the design.

### Colour
Four tokens only, defined on `body.landing-v2` in `src/static/assets/css/landing.css`:

| Token | Light | Dark | Use |
|---|---|---|---|
| canvas | #faf8f4 (warm off-white) | #141311 | page and panel background |
| ink | #15140f | #f3f1ec | headings, result number, body text |
| muted | #6b665c | #a39e93 | labels, captions, empty ruler segments, hairlines (at 25% alpha) |
| accent | #2f4bd8 | #8fa4ff | result number, filled ruler segments, links, focus ring |

No hero gradients, pastel washes, tinted panels or radial glows. Dark mode inverts the same four tokens.

### Type
- Keep self-hosted IBM Plex (Sans, Sans Arabic, Sans Devanagari); Japanese stays on system fonts.
- H1: 40–48px, weight 500, letter-spacing −1px, max 20ch. No coloured accent span.
- Result number: `clamp(72px, 10vw, 136px)`, weight 300, tabular numerals, accent colour. Unit ("years") 20px muted, baseline-aligned beside the number.
- Sub line (months, days): 22px ink. Stats list rows: 16px, 44px row height, hairline between rows.
- Body 16–17px, line-height 1.6, max 68ch. Arabic: no letter-spacing, line-height 1.75.

### The ruler as signature
- `.ruler-track` fills the result panel width; segments 14px tall on desktop, 10px on phones, 4px gap, 2px radius.
- Legend sits directly under the ends, 14px, both birthdays in ink, weight 600.
- Every calculator page shows the ruler in the same position under the result number so the mark is shared site-wide.

### Surfaces
- One bordered frame (1px hairline, 8px radius) holds form and result, divided by a single vertical hairline (horizontal on phones). No shadows, no fills.
- Tool links, timeline steps and FAQ items are hairline-separated rows, not cards. No hover lift; hover underlines the title.
- Inputs: canvas fill, 1px hairline, 6px radius; focus is a 2px accent border, no glow.
- Footer keeps its columns but drops the radial glow and rounded top; a single top hairline instead.

### Remove
Eyebrow pill, the three check badges, sparkle icon, timeline scroll-progress rail, card shadows and hover lifts, the ✓ and ↗ glyphs, the `hero-title-accent` span.

### Keep untouched
All HTML content and FAQ copy, RTL logic, date-field behaviour (`datecore.js`), dark mode, reduced motion, structured data, tests. The change is tokens plus hero/result/card rules in `landing.css`; no new dependencies.

### Follow-ups when V3 ships
- Regenerate the per-page PNG social cards (they show the pastel hero).
- Update `tests/create_design_previews.py` and `tests/test_ageason_build.py` assertions that expect `footer-rounded` and card shadows.
- Re-screenshot Arabic, Japanese and Nepali pages plus dark mode; V3 was decided from the English home and one inner page only.

## Visual direction (V2, pastel — superseded by V3 above)
- A focused calculator landing page, not a generic SaaS landing page.
- Modern editorial heading with violet accent, a pastel layered hero, white calculator input surface and contrasting pastel results panel.
- The actual calculator begins near the first viewport; no large hero illustration or unnecessary scroll.
- Trust indicators and three tool-discovery cards below the calculator.
- Calm, generous spacing, 18–24px rounded panels, self-hosted IBM Plex fonts and fluid type scales.
- Subtle depth only on primary cards; not every surface.

## Implementation
- `src/static/assets/css/landing.css` contains styles scoped to `body.landing-v2`.
- `build.py` includes this file with cache-busting on **every** page. English (`/`) and Arabic (`/ar/`) retain the expansive landing hero; all other pages use a compact `inner-v2` treatment.
- `src/pages/home.html` and `src/pages/ar.html` provide the semantic hero and related-tool cards.
- All other calculator, date-conversion, exam, Japanese, Nepali, and informational pages share the V2 aesthetic while retaining their specialized HTML content and JavaScript.
- Preserve Arabic `dir=rtl`, keyboard controls, accessible validation, dark-mode support, mobile widths and reduced-motion preferences.


## Motion and interaction
- Both primary homepages contain a three-step *how the calculator works* timeline.
- `src/static/assets/js/scroll-timeline.js` updates the scroll-progress rail and visually emphasizes steps as they enter view. It uses browser APIs directly and requires no React, Tailwind, shadcn or framer-motion build pipeline.
- Timeline content remains visible without JavaScript. `prefers-reduced-motion` disables motion and shows a completed line.

## Footer information architecture
- Site-wide rounded-top, softly tinted footer adapted from the Hirael Footer 02 visual reference: Ageason identity/description, calculators in the **current page language**, **other languages** in a separate column, and site/help links. A subtle radial top glow, three legal links along the bottom, responsive grid and dark mode support match the rest of Ageason. **Never expose a GitHub repository link on public pages.**
- On Arabic pages, the main calculator column lists only the four Arabic tools; English, Japanese and Nepali tools are explicitly grouped under a separate Arabic-language heading.
- Japanese and Nepali calendar pages similarly prioritize their relevant tools.
- Never add placeholder social profiles, telephone numbers, postal addresses or an unconfigured email address. Use the working Contact page until a verified mailbox is configured.
- All footer links are actual Ageason routes. Link labels follow the current page language and `hreflang` identifies the destination.

- Primary English hero H1 explicitly includes high-intent **Age Calculator** and **Calculate Your Exact Age**, replacing generic marketing copy. Search volumes are third-party estimates; keep language natural and do not keyword-stuff.
- The animated WebGL hero and border beam were removed after visual review. They competed with readability and did not align cleanly with the calculator cards.
- The English and Arabic hero sections retain the original lightweight **static pastel CSS gradient**, and calculator/result panels retain their clean rounded outlines and subtle elevation. No GPU animation or additional frontend framework is required.

## FAQ sections
- All existing calculator FAQs retain their original, language-specific questions and answers. Do not replace them with generic component library marketing copy.
- Use a two-column layout: compact editorial heading and an original, inline SVG calendar illustration beside a quiet accordion; collapse to a text-and-accordion stack on mobile.
- Keep the original FAQ anchor `#faq` for site-footer links. Render native `<details name="ageason-faq">` accordions for one-open-at-a-time behavior without a JavaScript framework.
- Preserve localized FAQPage structured data sourced from the original FAQ array, semantic headings, keyboard accessibility, dark mode and reduced-motion support. Use the existing local fonts and no external stock imagery or Google Fonts requests.
- Review close-up FAQ screenshots for English, Arabic, chronological-age, Japanese and Hijri converter pages on desktop and mobile.

## Acceptance checklist
1. `python build.py`, `python tests/test_ageason_build.py`, `node --test tests/datecore.test.mjs`.
2. Run `python tests/e2e_arabic.py`; confirm accurate Gregorian/Hijri results.
3. Review 26 screenshots (1440px desktop and 390px mobile) from GitHub Actions artifacts: 18 representative full pages plus eight dedicated timeline/footer views. Check the chronological calculator, Arabic converter, Japanese/Nepali pages and About.
4. Verify focus, contrast, overflow, year/month/day input and form-result interactions in light and dark mode.
5. Do not merge without visual approval. Domain purchase and Cloudflare setup are separate.
