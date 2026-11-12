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

## Acceptance checklist
1. `python build.py`, `python tests/test_ageason_build.py`, `node --test tests/datecore.test.mjs`.
2. Run `python tests/e2e_arabic.py`; confirm accurate Gregorian/Hijri results.
3. Review 18 screenshots (1440px desktop and 390px mobile) from GitHub Actions artifacts, including the chronological calculator, Arabic converter, Japanese/Nepali pages and About.
4. Verify focus, contrast, overflow, year/month/day input and form-result interactions in light and dark mode.
5. Do not merge without visual approval. Domain purchase and Cloudflare setup are separate.
