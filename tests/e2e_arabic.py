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
        pg.on("pageerror", lambda e: errors.append(str(e)))

        def txt(sel):
            return pg.inner_text(sel)

        # 1. Page basics and SEO
        pg.goto(B + "/ar/")
        meta = pg.evaluate("""() => ({lang: document.documentElement.lang, dir: document.documentElement.dir, title: document.title,
            h1: document.querySelector('h1').innerText, desc: document.querySelector('meta[name=description]').content,
            canon: !!document.querySelector('link[rel=canonical]'), ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => s.textContent)})""")
        check("Arabic page is lang=ar, dir=rtl", meta["lang"] == "ar" and meta["dir"] == "rtl", meta)
        check("SEO title", meta["title"] == "حساب العمر بالهجري والميلادي | احسب عمرك بدقة", meta["title"])
        check("H1", meta["h1"] == "حساب العمر - حاسبة العمر بالهجري والميلادي", meta["h1"])
        check("meta description mentions Hijri and the next birthday", "بالهجري" in meta["desc"] and "عيد ميلادك" in meta["desc"], meta["desc"])
        check("canonical link present", meta["canon"])
        try:
            types = [g["@type"] for s in meta["ld"] for g in json.loads(s)["@graph"]]
            check("structured data parses (WebApplication, FAQPage)", "WebApplication" in types and "FAQPage" in types, types)
        except Exception as e:
            check("structured data parses", False, e)

        # 2. Gregorian date of birth, fixed "on" date
        pg.goto(B + "/ar/?on=2026-11-10")
        pg.click("#dob [data-part=d]"); pg.keyboard.type("15")
        pg.select_option("#dob [data-part=m]", "8")
        pg.click("#dob [data-part=y]"); pg.keyboard.type("1994"); pg.wait_for_timeout(300)
        check("result appears without a Calculate button", pg.get_attribute("#result", "data-state") == "ready")
        check("Gregorian age 32 years", txt("#r-years") == "32", txt("#r-years"))
        check("Arabic grammar: 'شهران و26 يومًا' (2 months, 26 days)", txt("#r-sub") == "شهران و26 يومًا", txt("#r-sub"))
        check("Hijri age shown (33 years)", txt("#r-hyears") == "33", txt("#r-hyears"))
        stats = txt("#r-stats")
        check("Hijri birth date shown (7 Rabi al-Awwal 1415)", "7 ربيع الأول 1415" in stats, stats[:200])
        check("zodiac shown (Leo)", "برج الأسد" in stats, stats[-80:])
        check("both birthday countdowns shown", stats.count("بعد") >= 2, stats)

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

        # 9. Arabic age difference
        pg.goto(B + "/ar/age-difference/?a=1990-03-10&b=1993-07-25"); pg.wait_for_timeout(300)
        check("age difference: 3 years, 4 months, 15 days", txt("#r-years") == "3" and txt("#r-sub") == "4 أشهر و15 يومًا", (txt("#r-years"), txt("#r-sub")))

        # 10. Layout and errors
        for path in ["/ar/", "/ar/age-difference/"]:
            pg.goto(B + path)
            check(f"no sideways scrolling on a phone {path}", not pg.evaluate("document.documentElement.scrollWidth > innerWidth"))
        check("no JavaScript errors", not errors, errors)

        # Known issue (fix planned in Phase 1): the date of birth is written to the address bar while typing
        pg.goto(B + "/ar/")
        pg.fill("#dob [data-part=d]", "15"); pg.select_option("#dob [data-part=m]", "8"); pg.fill("#dob [data-part=y]", "1994")
        pg.dispatch_event("#dob [data-part=y]", "input"); pg.wait_for_timeout(200)
        known_issue("date of birth stays out of the URL until 'copy link' is pressed", "dob=" not in pg.url, pg.url.replace(B, ""))
        b.close()
    httpd.shutdown()
    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} passed")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
