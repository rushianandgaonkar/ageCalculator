# Arabic age calculator — audit and plan for Saudi Arabia

Date: 10 Nov 2026 · Scope: `/ar/` (حساب العمر) and `/ar/age-difference/` · Market: Saudi Arabia (ar-SA)
Primary keyword: **حساب العمر** · Secondary: حاسبة العمر، احسب عمرك، حسب العمر، كم عمري
Main competitor: un-web.com/tools/age/

**Bottom line:** the Arabic calculator is already accurate (all 43 automated checks pass) and faster
to use than the competitor. The gaps are trust and SEO details, not maths: the birth date ends up in
the address bar, the Arabic page sits under an English site shell, two keywords never appear, and
there is no Hijri ↔ Gregorian converter page. Nothing below needs a rewrite. One decision is yours:
whether Arabic should become the site's home page (see "Decisions needed").

---

## 1. What the project is today

| Area | Current state |
|---|---|
| Framework | Static site built by `build.py` (Python, no dependencies). Pages in `src/pages/`, output in `public/`, hosted on Cloudflare Pages. No server, no database, no sign-up. |
| Date engine | `datecore.js`: whole-day maths in UTC; Gregorian, Hijri (Umm al-Qura through the browser's built-in calendar) and Nepali calendars share one interface. |
| Arabic pages | `/ar/` age calculator (Hijri + Gregorian) and `/ar/age-difference/` |
| Other pages | English home `/`, Japanese `/ja/` + `/ja/gakunen/`, Nepali age + converter, chronological age, age difference (EN), five Indian exam age-limit pages, about / privacy / terms / contact / 404 |
| Design | Carbon-inspired system, IBM Plex Sans Arabic (self-hosted), right-to-left layout through logical CSS properties, dark mode, phone-first layout (one column under 720 px) |
| SEO files | Per-page title, description, canonical, Open Graph image, JSON-LD (WebApplication + FAQPage + BreadcrumbList), sitemap with hreflang, robots.txt, llms.txt |

### Features that work and must be kept

- Result appears while typing; there is no "calculate" button to press.
- Birth date can be entered in **Hijri or Gregorian**; the other calendar's date is shown.
- Age in both calendars, with correct Arabic plural forms (سنتان، 3 سنوات، 11 سنة…).
- Age on any chosen date ("حساب العمر في تاريخ آخر").
- Countdown to the next Gregorian **and** next Hijri birthday; a birthday message on the day.
- Total days, hours and minutes lived; weekday of birth; zodiac sign.
- Switch between 123 and ١٢٣ digits (remembered on the device). Typed Arabic-Indic digits are accepted.
- Clear errors for impossible dates (30 in a 29-day Hijri month, 31 April, 29 Feb in a non-leap year), future dates and years outside Umm al-Qura.
- On phones the keyboard closes and the result scrolls into view when the year is complete.
- Everything runs in the browser; nothing is sent to a server.

---

## 2. Competitor comparison (un-web.com/tools/age/)

Their content and design were reviewed only to find gaps. Nothing was copied.

| | un-web.com | Our `/ar/` |
|---|---|---|
| Input | Three drop-down lists + "احسب" button | Type day/year, pick month; result updates instantly |
| Hijri input | Yes (years 1328–1448) | Yes (1300–1600, full Umm al-Qura range) |
| Gregorian input | 1906–2026 | 1800–2200 (see issue P1-6) |
| Age on a chosen date | No | Yes |
| Next birthday | Gregorian, in months/days/hours | Gregorian **and** Hijri, in days |
| Zodiac, weekday | Yes | Yes |
| Birth season, "life facts", 100-year age table | Yes | No (see Phase 2) |
| Share | WhatsApp, X, Facebook, etc. | Copy link only |
| Arabic digits option | No | Yes |
| Structured data | None | WebApplication, FAQPage, BreadcrumbList |
| FAQ | None | 6 questions |
| `lang` / `dir` on page | Not declared | `lang="ar" dir="rtl"` |
| Text | Long and repetitive keyword blocks | ~380 words, written to be read |

**Where we already win:** speed (no button, no page reload), accuracy range, Hijri birthday,
age on any date, Arabic digits, privacy, clean markup.
**Where they win:** WhatsApp sharing (very common in Saudi Arabia), a 100-year age lookup table,
countdown shown in months as well as days, and a long-established domain.

---

## 3. Search intent check (Google results for Saudi Arabia)

| Query | What Google shows | Page we need |
|---|---|---|
| حساب العمر، حاسبة العمر، احسب عمرك، كم عمري | Combined Hijri + Gregorian calculators | **One page** (`/ar/`) |
| حساب العمر بالهجري / بالميلادي | The same combined calculators | Same page. Separate Hijri-only and Gregorian-only pages would compete with `/ar/`, so **not recommended** |
| تحويل التاريخ من هجري الى ميلادي | Date converters (incl. ummulqura.org.sa) | **New converter page** — different task, different results |
| حساب فرق العمر | Age-difference tools | Existing `/ar/age-difference/` ✓ |

---

## 4. Issues found, by priority

### P1 — fix first (small, safe changes)

| # | Issue | Why it matters | Fix |
|---|---|---|---|
| 1 | **Birth date is written into the address bar while typing** (`/ar/?dob=1994-08-15`) | Birth date ends up in browser history, screenshots and links people share without meaning to. Conflicts with the "your data stays on your device" promise. | Only add the date to the URL when "نسخ رابط النتيجة" is pressed. Keep reading `?dob=` so shared links still work. Same change on all calculators. |
| 2 | hreflang group links `/ar/` with `/ja/` and `/` | hreflang is only for translations of the same page. The Japanese page is a different tool (年齢早見表), so Google may ignore or distrust the group. | Group only true equivalents: `/` (en) ↔ `/ar/` (ar). Remove `/ja/` from the group. |
| 3 | Breadcrumb starts at the English home "/" | Arabic users see "Home" in English in search results. | Breadcrumb root = `/ar/` (الرئيسية). |
| 4 | **حسب العمر** and **كم عمري** do not appear on the page | Google matches query wording; both are common searches. | Add once each, naturally: e.g. an FAQ "كم عمري بالهجري إذا كان عمري 30 سنة ميلادية؟" and a sentence using "حسب العمر". No repetition blocks. |
| 5 | Old browsers without Umm al-Qura silently fall back to another Hijri calendar | A Hijri date could be one day off with no warning. | Show a short notice when the fallback is used. |
| 6 | Gregorian dates before 1882 or after 2174 still show a Hijri date | Outside 1300–1600 AH the Umm al-Qura data is extrapolated, not official. | Hide the Hijri part outside that range and say why. |
| 7 | Six font files (~205 KB) load on the Arabic page | Slower first view on mobile data. | Drop the two 300 (light) weights on Arabic pages (use 400 for light text). Saves ~69 KB, about a third of the font weight. |

### P2 — Arabic experience and new pages

| # | Item | Notes |
|---|---|---|
| 8 | Arabic menu and footer on Arabic pages | Today the menu lists English tools and legal links are marked "(EN)". |
| 9 | Arabic privacy, terms, about and contact pages | Needed for trust and for AdSense review in Arabic. |
| 10 | **New page: تحويل التاريخ هجري ميلادي** (`/ar/hijri-converter/`) | Both directions, today's date in both calendars, month-length table for the selected Hijri year. Reuses `datecore.js`. |
| 11 | WhatsApp share button | Opens WhatsApp with a short text and the result link. No tracking scripts. |
| 12 | Countdown also in months and days ("بعد 3 أشهر و12 يومًا") | Matches how people say it. |
| 13 | جدول الأعمار (birth year → age table, Hijri and Gregorian) | Answers "مواليد 1420 كم عمرهم" style searches; rebuild yearly like the Japanese table. |
| 14 | Birth season (ربيع، صيف…) | Small extra, optional. |

### P3 — architecture (only after your decision)

| # | Item |
|---|---|
| 15 | Make Arabic the home page, or move Arabic to its own domain (see below) |
| 16 | Hijri-only page — **not recommended** now (same results as `/ar/`); revisit if Search Console shows a separate query cluster |

---

## 5. Test results

Two automated test files were added under `tests/`. Run them before every deploy (instructions in README).

**`tests/datecore.test.mjs` — date maths, 19 tests, 19 passed**

- Leap-year rule: 1900 is not a leap year, 2000 is, and 2100 is not.
- Impossible dates (29 Feb 2023, 31 April, month 13) are rejected.
- Ages on the day before the birthday and on the birthday itself.
- **29 February:** turns 1 on 28 Feb 2001. The next birthday is 28 Feb 2027 (364 days away); in 2028 it is 29 Feb.
- **Month ends:** from 31 Jan to 28 Feb = 1 month; to 1 Mar = 1 month 1 day.
- **Future birth date:** gives no result.
- Total days include every leap day.
- 5,000 random date pairs: years, months and days always add back up to the exact day count.
- Umm al-Qura is the calendar in use. Seven official Saudi dates match, including 1 Ramadan, Eid al-Fitr, Eid al-Adha and 1 Muharram for 1445–1447.
- **Range boundaries:** 1 Muharram 1300 = 12 Nov 1882 and 30 Dhu al-Hijjah 1600 = 25 Nov 2174.
- Every month from 1300 to 1599 has 29 or 30 days; every year has 354 or 355.
- A 30th day in a 29-day Hijri month is rejected.
- Hijri ↔ Gregorian round trip: every third day from 1882 to 2174.
- Born on the 30th of a Hijri month: in a 29-day month the birthday falls on the 29th.
- Arabic-Indic, Persian, Devanagari and full-width digits are all read correctly.

**`tests/e2e_arabic.py` — real browser at phone size (390 × 844, ar-SA), 24 checks, 24 passed**

- `lang="ar"`, `dir="rtl"`, the exact SEO title, H1 and description, canonical, valid JSON-LD.
- Result appears without a button. 15 Aug 1994 on 10 Nov 2026 gives 32 years, "شهران و26 يومًا", 33 Hijri years, 7 ربيع الأول 1415 and برج الأسد.
- Hijri input: 8 Rabi al-Awwal 1415 converts to 16 August 1994.
- 29 Feb 2000 on 28 Feb 2027 gives 27 years and the birthday message.
- Errors appear for a future date, the 30th of a 29-day Hijri month and Hijri year 1299.
- ١٢٣ digits switch works.
- `/ar/age-difference/` gives 3 years, 4 months, 15 days.
- No sideways scrolling on a phone. No JavaScript errors.
- **Known issue confirmed:** the birth date is written into the URL while typing (P1-1).

---

## 6. Phased plan

| Phase | Contents | Size | Risk |
|---|---|---|---|
| **1 — Quick fixes** | P1 items 1–7, extend tests to cover them | ~half a day | Low: no URL or layout changes |
| **2 — Arabic experience** | P2 items 8–13 (Arabic chrome + legal pages, converter page, WhatsApp share, months countdown, age table) | 1–2 days | Low–medium: new pages, sitemap and menu changes |
| **3 — Architecture** | Your choice below, with 301 redirects if any URL moves | ~1 day | Medium: changes the home page and/or domain |

Each phase ends with both test files passing and a commit to the project folder.

---

## 7. Decisions needed before Phase 3

**Where should the Arabic calculator live?**

- **A. Keep `/ar/` (recommended for now).** No migration. `/ar/` can rank for حساب العمر on its own;
  many top results are sub-pages. The English home keeps serving the US/India keywords already researched.
- **B. Make the root `/` Arabic and move English to `/en/`.** Strongest signal for Saudi Arabia,
  but the English, Japanese, Nepali and exam pages lose the home page's link strength, and every
  English URL changes.
- **C. Separate Arabic domain (e.g. a .sa or Arabic-named .com).** Cleanest for Saudi Arabia, but it
  starts with zero authority and doubles hosting and Search Console work.

Recommendation: start with **A**. Launch Phases 1–2, watch Search Console for 6–8 weeks, then
decide between A and C using real impressions.
