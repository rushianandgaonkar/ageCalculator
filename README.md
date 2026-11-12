# Ageason — multilingual age and date calculators

A static website (no server code, no database) with sixteen calculators:

| Page | URL | Language |
|---|---|---|
| Age calculator + exam age-limit check | `/` | English (India-friendly DD/MM) |
| حساب العمر بالهجري والميلادي | `/ar/` | Arabic, RTL, Hijri (Umm al-Qura) + Gregorian |
| تحويل التاريخ من هجري إلى ميلادي | `/ar/hijri-converter/` | Arabic, Hijri ↔ Gregorian + Hijri year month-length table |
| حساب فرق العمر | `/ar/age-difference/` | Arabic, Hijri + Gregorian (hreflang pair with `/age-difference/`) |
| جدول الأعمار بالهجري والميلادي | `/ar/ages/` | Arabic, 100-year Hijri & Gregorian birth-year age tables |
| 年齢早見表 + 年齢計算 | `/ja/` | Japanese, eras, 干支, 数え年 |
| Nepali age calculator | `/nepali-age-calculator/` | English + Nepali, Bikram Sambat 2000–2090 |
| Chronological age calculator | `/chronological-age-calculator/` | English (US), y;m;d, adjusted (corrected) age |
| Nepali date converter | `/nepali-date-converter/` | BS ↔ AD, today's Nepali date (Nepal time) |
| Age difference calculator | `/age-difference/` | English; two people, who is older and by how much |
| 学年早見表 | `/ja/gakunen/` | Japanese school year (年度) table + 入学・卒業 years |
| Exam age limits hub | `/age-limit/` | English (India) |
| UPSC / SSC / NDA / CDS / Agniveer | `/age-limit/upsc/` etc. | Eligibility by date of birth from official notices |

Plus About, Privacy (AdSense-ready), Terms, Contact (in English and Arabic under `/ar/`) and a 404 page.

## Folder layout
```
build.py            ← edit CONFIG at the top, then run it
DESIGN.md           ← design rules for you / your coding agent
src/pages/*.html    ← page content (each starts with a <!--meta {...} --> block: title, description, FAQ…)
src/static/         ← css, js, fonts, icons — copied as-is
tools/make_images.py← regenerates favicon + social-share images (needs Playwright)
public/             ← THE WEBSITE. Deploy this folder. (Generated — don't edit by hand.)
```

## Before you go live (5 minutes)
1. Open `build.py` and set:
   - `SITE_URL` — preconfigured to `https://ageason.com` (the domain must be purchased and connected to hosting before launch)
   - `SITE_NAME` — configured to `Ageason`
   - `CONTACT_EMAIL` — configured to `info@ageason.com`
2. Regenerate the favicons, app icons and **all** per-page social images for the Ageason brand: `python tools/make_images.py` (requires `pip install playwright pillow` and `playwright install chromium`).
3. Run `python build.py` — the site is rebuilt into `public/`. Do not manually edit generated files.
4. Run `node --test tests/datecore.test.mjs` and `python tests/e2e_arabic.py` (Playwright required), and inspect 375px and 390px RTL layouts plus keyboard navigation.
5. Read `about/`, `privacy/` and `terms/` once and personalise them (the About page says the site is run by "a software test engineer").

## Deploy (Cloudflare Pages)
- Create a Pages project → upload the `public` folder (or connect the GitHub repo with build command `python build.py` and output directory `public`).
- `public/_headers` sets caching and security headers; `404.html` is picked up automatically.
- Add the domain, then in **Google Search Console** add the property and submit `https://ageason.com/sitemap.xml`.
- Bing Webmaster Tools: import from Search Console.

The canonical host is `https://ageason.com` (no `www`). Once the domain is active, configure Cloudflare to redirect `www.ageason.com` to `ageason.com` using a permanent redirect. Domain purchase, DNS and mailbox setup are **not** performed by this repository.

## SEO files included
- `robots.txt` (points to the sitemap) and `sitemap.xml` (with hreflang alternates)
- hreflang on `/`, `/ar/`, `/ja/` (en / ar / ja + x-default)
- canonical, Open Graph and Twitter tags, a share image per calculator
- JSON-LD: WebSite, WebApplication, FAQPage, BreadcrumbList
- `site.webmanifest`, favicons, `llms.txt` (summary for AI crawlers)
- `ads.txt` placeholder — set `ADSENSE_PUB_ID` in `build.py` once AdSense approves you and rebuild;
  that also adds the AdSense script to every page. Ad positions are marked `<!-- AD SLOT -->` in each page.

## Yearly job (important for Japanese traffic)
年齢早見表 searches peak in late December and January. In mid-December set
`JA_TABLE_YEAR = 2027` in `build.py`, rebuild and deploy, so the title says 2027年（令和9年）版.
(The table also updates itself in visitors' browsers when the year changes, but the title Google
sees comes from the build.)

## Yearly job #2: 学年早見表
The school-year page uses the Japanese 年度 (April–March). `JA_FY` in `build.py` works it out from the
build date, so rebuild and deploy once in early April each year.

## Keeping exam age limits current (important)
The exam rules live in `src/data/exams/*.json`; the calculator and the rules table on each page are
both generated from them. When a new notice comes out:
1. Open the exam's JSON and add the new cycle at the top (copy an existing one).
2. Set `"status": "official"`, the `cutoff` date (age-based exams) or the exact `from`/`to` birth dates
   (NDA, CDS, Agniveer — both dates inclusive, copied from the notice), and `source`.
3. Remove or update the matching `"expected"` cycle, then run `python build.py`.
Upcoming: NDA (I) 2027 and CDS (I) 2027 notices on 2 Dec 2026; UPSC CSE 2027 on 13 Jan 2027;
SSC GD 2027 (date not announced); Army Agniveer usually February; Air Force Agniveervayu twice a year.
Upper age limits follow the notices' "must not have attained" rule: 21–32 on 1 Aug 2026 = born
2 Aug 1994 to 1 Aug 2005.

## Keyword research
`research/` holds the DataForSEO script (`dfs_keywords.ps1`), the raw data and `keyword_map.csv`
(which keyword each page targets).

## How the maths works
- `src/static/assets/js/datecore.js` holds all date logic. Ages are whole years → months → days;
  if the birth day doesn't exist in a month (31st, 29 Feb) the month's last day is used.
- Hijri uses the browser's built-in Umm al-Qura calendar (Intl API), so no data file is needed.
- Bikram Sambat month lengths are in `bs-data.js` (2000–2090 BS), shared by both Nepali pages, verified date-by-date against the
  `nepali-date-converter` library. Extend the table when 2091 BS data is published.
- Fonts: IBM Plex (SIL Open Font License, see `assets/fonts/OFL-LICENSE.txt`).

## Tests (run before every deploy)
1. Date maths (Gregorian, 29 Feb, month ends, Umm al-Qura range 1300–1600 AH), needs Node 18+:
   `node --test tests/datecore.test.mjs`
2. Arabic pages in a phone-sized browser, needs `pip install playwright` then `playwright install chromium`:
   `python build.py` then `python tests/e2e_arabic.py`
Both should end with 0 failures. "KNOWN ISSUE" lines are tracked problems, not failures.
