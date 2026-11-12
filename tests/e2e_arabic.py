#!/usr/bin/env python3
"""Browser tests for the Arabic pages (/ar/ and /ar/age-difference/).
Needs: pip install playwright && playwright install chromium. Build first: python build.py
Run from the project folder:  python tests/e2e_arabic.py
Starts its own local server on port 8799 for the public/ folder.
"""
import functools
import http.server
import json
import re
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1] / "public"
PORT = 8799
B = f"http://127.0.0.1:{PORT}"
results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f"  -> {detail}"))


def known_issue(name, ok, detail=""):
    print(("PASS " if ok else "KNOWN ISSUE ") + name + ("" if ok else f"  -> {detail}"))


def serve():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def main():
    httpd = serve()
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, locale="ar-SA")
        pg = ctx.new_page()
        errors = []
        fonts = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.on("request", lambda req: fonts.append(req.url) if "/assets/fonts/" in req.url else None)

        def txt(sel):
            return pg.inner_text(sel)

        # 1. Page basics and SEO
        pg.goto(B + "/ar/")
        meta = pg.evaluate("""() => ({lang: document.documentElement.lang, dir: document.documentElement.dir, title: document.title,
            h1: document.querySelector('h1').innerText, desc: document.querySelector('meta[name=description]').content,
            canon: !!document.querySelector('link[rel=canonical]'),
            hreflangs: [...document.querySelectorAll('link[rel=alternate][hreflang]')].map(l => l.getAttribute('hreflang')),
            body: document.body.innerText,
            ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => s.textContent)})""")
        check("Arabic page is lang=ar, dir=rtl", meta["lang"] == "ar" and meta["dir"] == "rtl", meta)
        check("SEO title", meta["title"] == "حساب العمر بالهجري والميلادي | احسب عمرك بدقة", meta["title"])
        check("H1 keeps Arabic age + Gregorian/Hijri intent", "حساب العمر" in meta["h1"] and "بالهجري والميلادي" in meta["h1"], meta["h1"])
        check("meta description mentions Hijri and the next birthday", "بالهجري" in meta["desc"] and "عيد ميلادك" in meta["desc"], meta["desc"])
        check("canonical link present", meta["canon"])
        check("hreflang links only en, ar, x-default (no ja)", set(meta["hreflangs"]) == {"en", "ar", "x-default"}, meta["hreflangs"])
        check("Arabic keywords 'حسب العمر' and 'كم عمري' appear on page", "حسب العمر" in meta["body"] and "كم عمري" in meta["body"])
        try:
            graph = [g for s in meta["ld"] for g in json.loads(s)["@graph"]]
            types = [g["@type"] for g in graph]
            check("structured data parses (WebApplication, FAQPage)", "WebApplication" in types and "FAQPage" in types, types)
            crumbs = [g for g in graph if g.get("@type") == "BreadcrumbList"]
            check("/ar/ has no BreadcrumbList pointing to English /", not crumbs, crumbs)
        except Exception as e:
            check("structured data parses", False, e)

        # 2. Gregorian date of birth, fixed "on" date
        pg.goto(B + "/ar/?on=2026-11-10")
        pg.click("#dob [data-part=d]"); pg.keyboard.type("15")
        pg.select_option("#dob [data-part=m]", "8")
        pg.click("#dob [data-part=y]"); pg.keyboard.type("1994"); pg.wait_for_timeout(300)
        check("result appears without a Calculate button", pg.get_attribute("#result", "data-state") == "ready")
        check("Gregorian age 32 years", txt("#r-years") == "32", txt("#r-years"))
        check("result uses concise screen-reader summary", "32" in txt("#result-status") and "سنة" in txt("#result-status"))
        check("results panel avoids announcing the entire calculation", pg.get_attribute("#result", "aria-live") is None)
        check("date fields have stable name attributes", pg.get_attribute("#dob [data-part=y]", "name") == "dob_year")
        check("Arabic grammar: 'شهران و26 يومًا' (2 months, 26 days)", txt("#r-sub") == "شهران و26 يومًا", txt("#r-sub"))
        check("Hijri age shown (33 years)", txt("#r-hyears") == "33", txt("#r-hyears"))
        stats = txt("#r-stats")
        check("Hijri birth date shown (7 Rabi al-Awwal 1415)", "7 ربيع الأول 1415" in stats, stats[:200])
        check("zodiac shown (Leo)", "برج الأسد" in stats, stats[-80:])
        check("birth season shown (Summer)", "الصيف" in stats, stats[-120:])
        check("both birthday countdowns shown", stats.count("بعد") >= 2, stats)
        check("countdown also shows months and days", "9 أشهر" in stats and "5 أيام" in stats, stats)
        wa_href = pg.get_attribute("#whatsapp", "href")
        check("WhatsApp share link contains summary + dob=", wa_href.startswith("https://wa.me/?text=") and "dob%3D1994-08-15" in wa_href, wa_href)

        # 3. Hijri input converts to Gregorian
        pg.goto(B + "/ar/?on=2026-11-10")
        pg.click("label[for=cal-h]")
        pg.fill("#dob [data-part=d]", "8"); pg.select_option("#dob [data-part=m]", "3"); pg.fill("#dob [data-part=y]", "1415")
        pg.dispatch_event("#dob [data-part=y]", "input"); pg.wait_for_timeout(300)
        check("Hijri 8 Rabi al-Awwal 1415 = 16 August 1994", "16 أغسطس 1994" in txt("#r-stats"), txt("#r-stats")[:120])

        # 4. 29 February birthday in a non-leap year
        pg.goto(B + "/ar/?dob=2000-02-29&on=2027-02-28"); pg.wait_for_timeout(300)
        check("29 Feb birthday: 27 years on 28 Feb 2027", txt("#r-years") == "27", txt("#r-years"))
        check("29 Feb birthday: birthday message on 28 Feb", pg.is_visible("#r-note") and "عيد ميلاد سعيد" in txt("#r-note"))

        # 5. Future date of birth
        pg.goto(B + "/ar/")
        pg.fill("#dob [data-part=d]", "1"); pg.select_option("#dob [data-part=m]", "1"); pg.fill("#dob [data-part=y]", "2035")
        pg.dispatch_event("#dob [data-part=y]", "input"); pg.wait_for_timeout(200)
        check("future date of birth shows an error", "بعد تاريخ الحساب" in txt("#dob .field-error"), txt("#dob .field-error"))
        err_id = pg.get_attribute("#dob .field-error", "id")
        check("invalid date is announced and linked to inputs", pg.get_attribute("#dob [data-part=y]", "aria-invalid") == "true" and err_id in (pg.get_attribute("#dob [data-part=y]", "aria-describedby") or ""))

        # 6. Invalid Hijri day (30th of a 29-day month)
        pg.goto(B + "/ar/"); pg.click("label[for=cal-h]")
        m29 = pg.evaluate("(() => { for (let m = 1; m <= 12; m++) if (DC.Hijri.dim(1446, m) === 29) return m; })()")
        pg.fill("#dob [data-part=d]", "30"); pg.select_option("#dob [data-part=m]", str(m29)); pg.fill("#dob [data-part=y]", "1446")
        pg.dispatch_event("#dob [data-part=y]", "input"); pg.wait_for_timeout(200)
        check(f"30th of a 29-day Hijri month (1446/{m29}) is rejected", "غير موجود" in txt("#dob .field-error"), txt("#dob .field-error"))

        # 7. Outside the Umm al-Qura range
        pg.fill("#dob [data-part=d]", "1"); pg.select_option("#dob [data-part=m]", "1"); pg.fill("#dob [data-part=y]", "1299")
        pg.dispatch_event("#dob [data-part=y]", "input"); pg.wait_for_timeout(200)
        check("Hijri year 1299 (before Umm al-Qura range) is rejected", "أدخل سنة بين" in txt("#dob .field-error"), txt("#dob .field-error"))

        # 8. Arabic-Indic digits
        pg.goto(B + "/ar/?dob=1994-08-15&on=2026-11-10"); pg.click("label[for=dig-arab]"); pg.wait_for_timeout(200)
        check("Arabic-Indic digits switch (٣٢)", txt("#r-years") == "٣٢", txt("#r-years"))
        pg.click("label[for=dig-latn]")

        # 9. Arabic age difference & breadcrumb root
        pg.goto(B + "/ar/age-difference/?a=1990-03-10&b=1993-07-25"); pg.wait_for_timeout(300)
        check("age difference: 3 years, 4 months, 15 days", txt("#r-years") == "3" and txt("#r-sub") == "4 أشهر و15 يومًا", (txt("#r-years"), txt("#r-sub")))
        diff_crumbs = pg.evaluate("""() => {
            const g = [...document.querySelectorAll('script[type="application/ld+json"]')]
                .flatMap(s => JSON.parse(s.textContent)['@graph'])
                .find(x => x['@type'] === 'BreadcrumbList');
            return g ? g.itemListElement : [];
        }""")
        check("/ar/age-difference/ breadcrumb root is /ar/ (الرئيسية)",
              len(diff_crumbs) == 2 and diff_crumbs[0]["name"] == "الرئيسية" and diff_crumbs[0]["item"].endswith("/ar/"),
              diff_crumbs)

        # 10. Gregorian dates outside official Umm al-Qura range (1882-11-12 to 2174-11-25) hide Hijri & explain why
        pg.goto(B + "/ar/?on=2026-11-10")
        pg.fill("#dob [data-part=d]", "1"); pg.select_option("#dob [data-part=m]", "5"); pg.fill("#dob [data-part=y]", "1850")
        pg.dispatch_event("#dob [data-part=y]", "input"); pg.wait_for_timeout(200)
        check("Gregorian date before 1882 hides Hijri age and explains why",
              pg.get_attribute("#result", "data-state") == "ready"
              and pg.is_hidden("#r-hijri")
              and pg.is_visible("#r-hijri-note")
              and "أم القرى" in txt("#r-hijri-note")
              and "تاريخ الميلاد (هجري)" not in txt("#r-stats"),
              txt("#r-hijri-note"))

        pg.goto(B + "/ar/?on=2180-01-01")
        pg.fill("#dob [data-part=d]", "1"); pg.select_option("#dob [data-part=m]", "1"); pg.fill("#dob [data-part=y]", "2175")
        pg.dispatch_event("#dob [data-part=y]", "input"); pg.wait_for_timeout(200)
        check("Gregorian date after 2174 hides Hijri age and explains why",
              pg.get_attribute("#result", "data-state") == "ready"
              and pg.is_hidden("#r-hijri")
              and pg.is_visible("#r-hijri-note"),
              txt("#r-hijri-note"))

        pg.goto(B + "/ar/age-difference/")
        pg.fill("#dob-a [data-part=d]", "1"); pg.select_option("#dob-a [data-part=m]", "5"); pg.fill("#dob-a [data-part=y]", "1850")
        pg.fill("#dob-b [data-part=d]", "1"); pg.select_option("#dob-b [data-part=m]", "1"); pg.fill("#dob-b [data-part=y]", "1900")
        pg.dispatch_event("#dob-b [data-part=y]", "input"); pg.wait_for_timeout(200)
        check("age difference before 1882 hides Hijri part and explains why",
              pg.get_attribute("#result", "data-state") == "ready"
              and pg.is_hidden("#r-hijri")
              and pg.is_visible("#r-hijri-note"),
              txt("#r-hijri-note"))

        # 11. Fallback Hijri calendar notice (simulate browser without islamic-umalqura)
        fb_ctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, locale="ar-SA")
        fb_pg = fb_ctx.new_page()
        fb_pg.add_init_script("""(() => {
            const Orig = Intl.DateTimeFormat;
            Intl.DateTimeFormat = function(locale, opts) {
                const norm = typeof locale === "string" ? locale.replace("islamic-umalqura", "islamic-civil") : locale;
                return new Orig(norm, opts);
            };
            Intl.DateTimeFormat.prototype = Orig.prototype;
            Intl.DateTimeFormat.supportedLocalesOf = Orig.supportedLocalesOf.bind(Orig);
        })();""")
        fb_pg.goto(B + "/ar/?dob=1994-08-15&on=2026-11-10"); fb_pg.wait_for_timeout(200)
        check("Hijri fallback notice shown when browser lacks Umm al-Qura",
              fb_pg.is_visible("#hijri-fallback") and fb_pg.is_visible("#r-hfallback"),
              (fb_pg.is_visible("#hijri-fallback"), fb_pg.is_visible("#r-hfallback")))
        fb_ctx.close()

        # 12. Arabic chrome & Phase 2 pages
        pg.goto(B + "/ar/")
        chrome = pg.evaluate("""() => ({
            brandHref: document.querySelector('.brand').getAttribute('href'),
            navHrefs: [...document.querySelectorAll('.tool-nav a')].map(a => a.getAttribute('href')),
            footerText: document.querySelector('.site-footer').innerText,
            footerLinks: [...document.querySelectorAll('.site-footer a')].map(a => a.getAttribute('href'))
        })""")
        check("Arabic header brand links to /ar/", chrome["brandHref"] == "/ar/", chrome["brandHref"])
        check("Arabic nav has the 4 Arabic tools", chrome["navHrefs"] == ["/ar/", "/ar/hijri-converter/", "/ar/age-difference/", "/ar/ages/"], chrome["navHrefs"])
        check("Arabic footer has Arabic legal pages and no '(EN)'", "(EN)" not in chrome["footerText"] and "/ar/privacy/" in chrome["footerLinks"] and "/ar/about/" in chrome["footerLinks"], chrome["footerLinks"])

        for path in ["/ar/", "/ar/age-difference/", "/ar/hijri-converter/", "/ar/ages/", "/ar/about/", "/ar/privacy/", "/ar/terms/", "/ar/contact/"]:
            resp = pg.goto(B + path)
            check(f"Arabic page {path} loads 200 in Arabic RTL with no sideways scroll",
                  resp.status == 200
                  and pg.evaluate("document.documentElement.lang === 'ar' && document.documentElement.dir === 'rtl'")
                  and not pg.evaluate("document.documentElement.scrollWidth > innerWidth"),
                  resp.status)

        # Arabic legal pages have valid BreadcrumbList starting at /ar/ and hreflang pairs
        pg.goto(B + "/ar/privacy/")
        priv_info = pg.evaluate("""() => ({
            crumbs: [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(s => JSON.parse(s.textContent)['@graph']).find(x => x['@type'] === 'BreadcrumbList').itemListElement,
            hreflangs: [...document.querySelectorAll('link[rel=alternate][hreflang]')].map(l => l.getAttribute('hreflang'))
        })""")
        check("/ar/privacy/ breadcrumb root is /ar/ and hreflang pairs en+ar+x-default",
              len(priv_info["crumbs"]) == 2 and priv_info["crumbs"][0]["item"].endswith("/ar/") and set(priv_info["hreflangs"]) == {"en", "ar", "x-default"},
              priv_info)

        # Hijri converter (/ar/hijri-converter/)
        pg.goto(B + "/ar/hijri-converter/")
        check("Hijri converter shows today's date in both calendars", "تاريخ اليوم" in txt("#today-ar") and "هـ" in txt("#today-ar"))
        pg.fill("#dob [data-part=d]", "8"); pg.select_option("#dob [data-part=m]", "3"); pg.fill("#dob [data-part=y]", "1415")
        pg.dispatch_event("#dob [data-part=y]", "input"); pg.wait_for_timeout(200)
        check("Hijri converter 8 Rabi al-Awwal 1415 = 16 August 1994",
              "16 أغسطس 1994" in txt("#r-main") and txt("#tbl-year") == "1415",
              (txt("#r-main"), txt("#tbl-year")))
        check("Hijri year table has 12 months and highlights active month",
              pg.locator("#months-body tr").count() == 12 and pg.locator("#months-body tr.is-you").count() == 1)
        pg.click("#next-year"); pg.wait_for_timeout(100)
        check("Hijri year table next-year advances to 1416", txt("#tbl-year") == "1416", txt("#tbl-year"))
        check("Hijri converter keeps date out of URL until copy link", "date=" not in pg.url, pg.url.replace(B, ""))
        pg.click("#copy"); pg.wait_for_timeout(100)
        check("Hijri converter copy link adds date= to URL", "date=1994-08-16" in pg.url, pg.url.replace(B, ""))
        check("Hijri converter WhatsApp link includes wa.me", pg.get_attribute("#whatsapp", "href").startswith("https://wa.me/?text="))

        # Gregorian -> Hijri conversion on /ar/hijri-converter/
        pg.goto(B + "/ar/hijri-converter/")
        pg.click("label[for=dir-g2h]")
        pg.fill("#dob [data-part=d]", "15"); pg.select_option("#dob [data-part=m]", "8"); pg.fill("#dob [data-part=y]", "1994")
        pg.dispatch_event("#dob [data-part=y]", "input"); pg.wait_for_timeout(200)
        check("Gregorian -> Hijri 15 Aug 1994 = 7 Rabi al-Awwal 1415", "7 ربيع الأول 1415" in txt("#r-main"), txt("#r-main"))

        # Age table (/ar/ages/)
        pg.goto(B + "/ar/ages/")
        check("Age table pre-renders Hijri and Gregorian 100-year tables",
              pg.locator("#hijri-body tr").count() >= 100 and pg.locator("#greg-body tr").count() >= 100)
        pg.fill("#birth-year", "1420"); pg.dispatch_event("#birth-year", "input"); pg.wait_for_timeout(150)
        check("Age table lookup for 1420 AH highlights row and stays out of URL",
              pg.get_attribute("#result", "data-state") == "ready"
              and pg.locator('#hijri-body tr[data-hy="1420"].is-you').count() == 1
              and "y=" not in pg.url,
              (pg.get_attribute("#result", "data-state"), pg.url.replace(B, "")))
        pg.click("#copy"); pg.wait_for_timeout(100)
        check("Age table copy link puts y=1420 into URL", "y=1420" in pg.url, pg.url.replace(B, ""))
        pg.click("label[for=cal-g]"); pg.fill("#birth-year", "1995"); pg.dispatch_event("#birth-year", "input"); pg.wait_for_timeout(150)
        check("Age table lookup for 1995 AD highlights Gregorian row",
              pg.locator('#greg-body tr[data-gy="1995"].is-you').count() == 1
              and pg.get_attribute("#whatsapp", "href").startswith("https://wa.me/?text="))

        # 13. P1-7: 300-weight font files are not loaded on any Arabic page
        fonts_300 = [u for u in fonts if "-300-" in u]
        check("no 300-weight font files loaded on Arabic pages", not fonts_300, fonts_300)

        # 14. P1-1: date of birth stays out of URL until 'copy link' is pressed (across all calculators)
        pg.goto(B + "/ar/")
        pg.fill("#dob [data-part=d]", "15"); pg.select_option("#dob [data-part=m]", "8"); pg.fill("#dob [data-part=y]", "1994")
        pg.dispatch_event("#dob [data-part=y]", "input"); pg.wait_for_timeout(200)
        check("date of birth stays out of the URL until 'copy link' is pressed", "dob=" not in pg.url, pg.url.replace(B, ""))
        pg.click("#copy"); pg.wait_for_timeout(150)
        check("pressing 'copy link' puts dob= into the URL", "dob=1994-08-15" in pg.url, pg.url.replace(B, ""))

        pg.goto(B + "/ar/age-difference/")
        pg.fill("#dob-a [data-part=d]", "10"); pg.select_option("#dob-a [data-part=m]", "3"); pg.fill("#dob-a [data-part=y]", "1990")
        pg.fill("#dob-b [data-part=d]", "25"); pg.select_option("#dob-b [data-part=m]", "7"); pg.fill("#dob-b [data-part=y]", "1993")
        pg.dispatch_event("#dob-b [data-part=y]", "input"); pg.wait_for_timeout(200)
        check("/ar/age-difference/ keeps dates out of URL until 'copy link'", "a=" not in pg.url and "b=" not in pg.url, pg.url.replace(B, ""))
        pg.click("#copy"); pg.wait_for_timeout(150)
        check("/ar/age-difference/ 'copy link' puts a= and b= into URL", "a=1990-03-10" in pg.url and "b=1993-07-25" in pg.url, pg.url.replace(B, ""))

        other_calcs = [
            ("/", "dob=1994-08-15", lambda: (
                pg.fill("#dob [data-part=d]", "15"), pg.fill("#dob [data-part=m]", "8"), pg.fill("#dob [data-part=y]", "1994"),
                pg.dispatch_event("#dob [data-part=y]", "input"))),
            ("/chronological-age-calculator/", "dob=2018-05-20", lambda: (
                pg.fill("#dob [data-part=m]", "5"), pg.fill("#dob [data-part=d]", "20"), pg.fill("#dob [data-part=y]", "2018"),
                pg.dispatch_event("#dob [data-part=y]", "input"))),
            ("/age-difference/", "a=1990-03-10", lambda: (
                pg.fill("#dob-a [data-part=d]", "10"), pg.fill("#dob-a [data-part=m]", "3"), pg.fill("#dob-a [data-part=y]", "1990"),
                pg.fill("#dob-b [data-part=d]", "25"), pg.fill("#dob-b [data-part=m]", "7"), pg.fill("#dob-b [data-part=y]", "1993"),
                pg.dispatch_event("#dob-b [data-part=y]", "input"))),
            ("/age-limit/upsc/", "dob=2000-01-15", lambda: (
                pg.fill("#dob [data-part=d]", "15"), pg.fill("#dob [data-part=m]", "1"), pg.fill("#dob [data-part=y]", "2000"),
                pg.dispatch_event("#dob [data-part=y]", "input"))),
            ("/nepali-age-calculator/", "dob=", lambda: (
                pg.fill("#dob [data-part=d]", "15"), pg.select_option("#dob [data-part=m]", "4"), pg.fill("#dob [data-part=y]", "2051"),
                pg.dispatch_event("#dob [data-part=y]", "input"))),
            ("/ja/", "dob=1994-08-15", lambda: (
                pg.fill("#dob [data-part=y]", "1994"), pg.fill("#dob [data-part=m]", "8"), pg.fill("#dob [data-part=d]", "15"),
                pg.dispatch_event("#dob [data-part=d]", "input"))),
            ("/ja/gakunen/", "dob=2015-08-15", lambda: (
                pg.fill("#dob [data-part=y]", "2015"), pg.fill("#dob [data-part=m]", "8"), pg.fill("#dob [data-part=d]", "15"),
                pg.dispatch_event("#dob [data-part=d]", "input"))),
        ]
        for path, expected, fill_fn in other_calcs:
            pg.goto(B + path)
            fill_fn()
            pg.wait_for_timeout(150)
            before = pg.url
            pg.click("#copy"); pg.wait_for_timeout(100)
            after = pg.url
            check(f"URL privacy + copy link on {path}", ("dob=" not in before and "a=" not in before) and (expected in after), (before.replace(B, ""), after.replace(B, "")))

        pg.goto(B + "/ja/")
        ja_hreflangs = pg.evaluate("[...document.querySelectorAll('link[rel=alternate][hreflang]')].length")
        check("/ja/ has no hreflang=age link to /ar/ or /", ja_hreflangs == 0, ja_hreflangs)
        check("no JavaScript errors", not errors, errors)
        b.close()
    httpd.shutdown()
    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} passed")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
