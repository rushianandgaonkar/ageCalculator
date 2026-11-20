# Ageason: tool build plan (from keyword research of 2026-11-20)

Site: ageason.com (multilingual age and date calculators). Goal: more traffic by adding tools people search for, in the order of demand and ease.
Data: 498 candidate keywords checked in 13 country/language sets with DataForSEO Labs (exact mode, `--fill-missing`). Full merged data: `ageason_all_results_merged.csv` (column `locale`: en_us, en_in, ar_sa, ja, ko, id, es_mx, pt_br, tr, vi, de, fr, hi).

## Read this before building anything

- "Combined" volumes below add up the listed keywords. Many are spelling variants of one search (for example 만나이 / 만 나이 / 나이 계산기), so treat them as an upper bound. The "head term" is the single biggest keyword and is the safer number.
- KD 0 from DataForSEO often means too little data, not "easy" (the same rule as for Creovly). Search each head term in Google before building.
- Several head terms are things Google or timeanddate.com answer directly ("30 days from today", "how old am I"). Volume is real, clicks may be lower. Build these as thin, fast pages, not big projects.
- The Spanish core terms (calculadora de edad, calcular edad) came back as 0, which is not believable. Treat Spanish as unmeasured, not as "no demand". Same for the baby / school-age terms in English (all 0 or no data).
- Pregnancy and due-date tools are health topics. They have big volume but need careful wording and disclaimers. They are kept in Tier 3.

## What the research says in one view

| Cluster | Head term (volume / KD) | Combined (upper bound) | Already on the site? | Build effort |
| --- | --- | ---: | --- | --- |
| Date calculator suite (days between, add days, N days from today, days until) | date calculator, en-IN (673,000 / 33); days calculator (550,000 / 12); 90 days from today, en-US (246,000 / 0) | ~2,150,000 | No | Low: one date engine, many pages |
| Hijri today + Umm al-Qura calendar (Arabic, also Indonesian, Turkish) | التاريخ الهجري اليوم (368,000 / 18) | ~1,170,000 | Converter only (`/ar/hijri-converter/`) | Low: reuses `datecore.js` |
| Countdown to Ramadan / Eid (Arabic) | كم باقي على رمضان (450,000 / 0) | ~593,000 | No | Low, seasonal |
| Astrology (rising sign, zodiac, Chinese zodiac) | yükselen burç hesaplama (201,000 / 8); aszendent berechnen (110,000 / 0) | ~434,000 | No | Medium to high, and a scope question |
| Local-language age calculators | yaş hesaplama, Turkish (246,000 / 0) | ~803,000 | Only en, ar, ja, ne | Low per language |
| Local-language date/day calculators | 日数 計算, Japanese (110,000 / 0) | ~797,000 | No | Low (same engine) |
| Pet age (dog, cat) | cat years to human years (60,500 / 8); dog age calculator (49,500 / 20) | ~176,000 | No | Low |
| Pregnancy / due date | حاسبة الحمل (74,000 / 27) | ~197,000 | No | Medium, health topic |
| India exam age limits (27 more exams) | ssc chsl age limit (12,100 / 0) | ~133,000 | 5 exams + hub | Low per page, data upkeep |
| Generation (what generation am I) | what generation am i (40,500 / 45); millennial age range (40,500 / 49) | ~95,000 | No | Low, but KD is high |
| Business / working days | business days calculator (40,500 / 33); working days calculator (40,500 / 37) | ~94,000 | No | Low |
| Japanese era conversion (西暦 和暦) | 西暦和暦 早見表 (60,500 / 0) | ~76,000 | Partly in `/ja/` | Low |
| Indonesian weton | hitung weton (49,500 / 15) | ~72,000 | No | Medium, cultural rules |
| Birth-year / age-fun pages (US) | birth year calculator (12,100 / 16); birthday countdown (9,900 / 12) | ~52,000 | No | Low |
| Experience / retirement / service date | experience calculator, en-IN (22,200 / 0); date of retirement calculator (8,100 / 1) | ~42,000 | No | Low |
| Korean 만 나이 (international age) | 만 나이 계산기 (14,800 / 0) | ~77,000 for all Korean | No | Low |

## Build order

### Tier 1: build first (low effort, big demand)

1. **Date calculator suite, English** (US and India). Pages sharing one engine:
   - Days between dates (US 33,100 / 8; en-IN "days calculator" 550,000 / 12; "number of days between two dates" 9,900 / 29; date duration 33,100 / 43; date difference 9,900 / 36).
   - Date calculator (add or subtract days) (en-IN "date calculator" 673,000 / 33; "date calculator add days" 9,900 / 35).
   - Days from today hub, one page per number: 30 days (246,000 / 0), 90 days (246,000 / 0), 60 days (165,000 / 0), 100 days (27,100 / 0), 6 months (74,000 / 0). Use one shared template and a clear "from today" result at the top.
   - Days until / countdown (how many days until 14,800 / 16; days until calculator 14,800 / 17; countdown to date 2,900 / 35).
   - Business days and working days calculator (40,500 / 33 and 40,500 / 37; one page, both names in the title and FAQ).
   - Experience calculator (en-IN 22,200 / 0) and work experience calculator (4,400 / 0): the same engine in years, months and days.
   Check Google for the head terms first (see warning above). Do not make separate pages for near-identical wording (days calculator vs date calculator) unless the results pages differ.
2. **Arabic: Hijri today and Umm al-Qura calendar.** The converter already exists. Missing pages: today's Hijri date (التاريخ الهجري اليوم 368,000 / 18; تاريخ اليوم هجري وميلادي 165,000 / 46) and the calendar (التقويم الهجري 246,000 / 55; تقويم ام القرى 201,000 / 29). The converter keywords (تحويل التاريخ من هجري الى ميلادي 165,000 / 5; ميلادي الى هجري 74,000 / 23; محول التاريخ 22,200 / 23) should be checked in Search Console against the existing page before adding anything.
3. **Arabic: countdown to Ramadan and Eid** (كم باقي على رمضان 450,000 / 0; كم باقي على العيد 110,000 / 0; كم باقي على عيد الفطر 33,100 / 0). Seasonal: build and index before the run-up to Ramadan in early 2027.
4. **Pet age calculators: cat and dog.** One page each. Cat: cat years to human years (60,500 / 8), cat age calculator (5,400 / 8). Dog: dog age calculator (49,500 / 20, already in your 9 Nov map), dog years calculator (5,400 / 20), how old is my dog in human years (4,400 / 3). Puppy age calculator is small (880 / 11) but CPC $7.66. Reuse the same pages in other languages later (German, Turkish, Japanese pet terms add roughly 50,000 more).
5. **India: exam age-limit expansion.** 27 new exams, each a data row on the existing exam hub: SSC CHSL 12,100; SBI PO 9,900; IAS 9,900 (fold into the UPSC page); IBPS PO 8,100; AFCAT 8,100; air force 8,100; army 8,100; UP police 8,100; RRB NTPC 6,600; IBPS clerk 6,600; SBI clerk 6,600; RRB Group D 5,400; Bihar police 5,400; UGC NET 4,400; GATE 4,400; CTET 3,600; navy 2,900; IPS 2,900; railway 1,900; JEE Main 1,900; CAT 1,900; police constable 1,600; CLAT 1,600; CUET 1,000; IFS 720; UPSC CMS 720; NEET PG 590. NEET (18,100) was already in your earlier map. All are KD 0 to 4, but every age and relaxation figure must come from the official notification and be re-checked each year.
6. **Japanese: era chart and day-count tools.** 西暦和暦 早見表 (60,500 / 0), 西暦 和暦 変換 (8,100 / 0), 平成 / 令和 / 昭和 変換 (about 5,000 together) and 数え年 計算 (3,600 / 0), 厄年 早見表 (2,400 / 0). Day-count: 日数 計算 (110,000 / 0), 日付 計算 (60,500), 何日後 計算 (9,900 / 22), 何日前 計算 (6,600 / 3). Check what `/ja/` already covers first.

### Tier 2: new language versions (the same tools, translated)

Add a language only after Tier 1 exists in English, then publish the age calculator, the date calculator and the pet age pages together. Order by demand found here (upper bound, KD mostly 0 to 15):

1. **Turkish** (~795,000): yaş hesaplama and yaş hesaplayıcı (246,000 each / 0), gün hesaplama (74,000 / 0), hicri takvim (60,500 / 6), tarih hesaplama (49,500 / 0), kaç yaşındayım (40,500 / 0), kaç gün kaldı (27,100), iki tarih arası gün hesaplama (22,200), geri sayım (22,200), kedi yaşı hesaplama (9,900). Largest single language found.
2. **German** (~294,000): tagerechner (49,500 / 5), datumsrechner (27,100), altersrechner (22,200 / 0), wie alt bin ich (9,900), alter berechnen (9,900), katzenjahre (9,900), hundejahre (6,600), arbeitstage rechner (5,400 / 8), renteneintrittsalter rechner (4,400 / 14). Aszendent berechnen (110,000 / 0) is in the astrology question below.
3. **Indonesian** (~258,000): kalkulator umur (33,100 / 0), hitung hari (18,100), kalender hijriyah (22,200 / 9), berapa hari lagi (12,100), kalkulator tanggal (12,100), hitung umur (9,900), plus weton and pregnancy (see Tier 3).
4. **Portuguese (Brazil)** (~212,000): contagem regressiva (60,500 / 0), calculadora de dias (49,500 / 9), calculadora de datas (40,500 / 0), calcular idade (18,100 / 0), calculadora de idade (14,800 / 0), quantos anos eu tenho (12,100).
5. **Korean** (~77,000): 날짜 계산기 (33,100 / 0), 만 나이 계산기 (14,800 / 0), 디데이 계산기 (12,100 / 0), 전역일 계산기 (4,400 / 2), 기념일 계산기 (3,600 / 0), 양력 음력 변환 (2,400 / 0).
6. Smaller: **French** (~42,000: compte à rebours 9,900, calcul âge 9,900), **Spanish** (unmeasured, see warning), **Vietnamese** (~27,000: tính ngày 8,100, đổi ngày dương sang âm 6,600), **Hindi** (~26,000: आयु कैलकुलेटर 22,200 / 8).

Other Tier 2 items (English):
- **Generation calculator** (what generation am i 40,500 / 45; millennial age range 40,500 / 49; gen z birth years 8,100 / 49; generation by birth year 5,400). Volume is good, but KD 45 to 49 means real competition. Build one thorough page, not several.
- **Birth-year and age-fun pages**: birth year calculator (12,100 / 16), birthday countdown (9,900 / 12), half birthday calculator (6,600 / 0), birthday calculator from age (4,400 / 38), how many days old am I (4,400 / 14), how many days have I been alive (4,400 / 0), lunar age calculator (3,600 / 0), what year was I born (1,900 / 1), how many years ago was 2010 / 1990 / 2000 (1,900 / 1,000 / 590). Fold small ones into one "How old am I in days / years" page.
- **Retirement / service date** (en-IN): date of retirement calculator (8,100 / 1), superannuation date calculator (390 / 0, CPC $1.20). US retirement age calculator (3,600 / 44, CPC $3.01) is competitive for its size.
- **Hindi and India extras**: nakshatra calculator by date of birth (6,600 / 0), rashi calculator (720 / 3), janam tithi calculator (480). These are a pair only if you decide to add astrology.

### Tier 3: decisions for you (bigger scope or health topics)

- **Astrology tools.** Demand is large (Turkish rising sign 201,000 / 8, German aszendent 110,000 / 0, Chinese zodiac calculator 22,200 / 6, zodiac sign calculator 14,800 / 55), but a rising sign needs birth time, place and time-zone data, and it moves Ageason away from "age and dates". Chinese zodiac and western zodiac signs are easy and fit the birthday cluster; rising sign is a separate decision.
- **Pregnancy / due-date calculators.** Arabic حاسبة الحمل 74,000 / 27, Indonesian kalkulator kehamilan 40,500 / 0 and usia kehamilan 14,800, German geburtstermin 33,100 / 11, English gestational age calculator 6,600 / 15 (CPC $7.22). Real demand, but a health topic: needs clear disclaimers and careful sourcing.
- **Indonesian weton** (hitung weton 49,500 / 15, cek weton 18,100, kalkulator weton 4,400): cultural calculation rules that must be correct; worth doing only if you want an Indonesian site.
- **Arabic end-of-service pay** (حساب نهاية الخدمة 9,900 / 0): legal rules per country, not a plain date tool.

### Drop or fold into other pages (tiny or no data)

- **Under 100 searches, add a short section to a related page:** age in hours / seconds / minutes calculator, how old am I in years months and days, age on mars / other planets, half your age plus seven, when will I turn 18 / 21 / 65, 18th / 21st / 65th birthday calculator, korean age converter, rabbit / horse / hamster age, age calculator for PAN card / SSC / UPSC, age relaxation calculator, age last birthday / nearest birthday, insurance age calculator (KD 68, ignore), years until retirement calculator (KD 67, ignore).
- **No data or 0 (skip):** baby age calculator and variants, school age calculator, what grade should my child be in, am I old enough calculator, guinea pig age calculator, age calculator for school admission, datedif calculate age, "age calculator as on 1st January", "age limit calculator for government jobs", "age calculator for sarkari naukri", vikram samvat age calculator, "english date to hindi tithi", most Spanish items.

## Suggested first ten builds

1. English date calculator suite: days between dates + date calculator (add/subtract days) + days from today hub
2. English business days / working days calculator
3. Arabic: today's Hijri date page, then the Umm al-Qura calendar page
4. Arabic: Ramadan / Eid countdown (publish before the season)
5. Cat age and dog age calculators
6. India: add the 27 exams to the exam hub (SSC CHSL, SBI PO, IBPS PO, AFCAT, air force, army, UP police first)
7. Japanese: 西暦和暦 早見表 / 変換 and 日数計算 (after checking what `/ja/` already has)
8. Turkish version: age calculator, date calculator, countdown, Hijri calendar
9. English generation calculator
10. Experience calculator (en-IN) and birth-year / "how old am I in days" page

Before each page: Google the head term, note who ranks (timeanddate.com, calculator.net, omni, local sites), and check Search Console for the existing Ageason pages to avoid cannibalization (especially the converter, `/ja/` and the exam hub).
