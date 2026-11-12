# Ageason Design V2 — Cal.com clarity + Stripe-inspired atmosphere

This is an original Ageason visual system inspired by the clean, product-focused interaction patterns of Cal.com and restrained atmospheric gradients associated with Stripe. It does **not** reproduce either company's proprietary assets.

## Visual direction
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

## Acceptance checklist
1. `python build.py`, `python tests/test_ageason_build.py`, `node --test tests/datecore.test.mjs`.
2. Run `python tests/e2e_arabic.py`; confirm accurate Gregorian/Hijri results.
3. Review 26 screenshots (1440px desktop and 390px mobile) from GitHub Actions artifacts: 18 representative full pages plus eight dedicated timeline/footer views. Check the chronological calculator, Arabic converter, Japanese/Nepali pages and About.
4. Verify focus, contrast, overflow, year/month/day input and form-result interactions in light and dark mode.
5. Do not merge without visual approval. Domain purchase and Cloudflare setup are separate.
