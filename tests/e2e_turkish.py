#!/usr/bin/env python3
"""E2E browser tests for Turkish pages (/tr/, /tr/tarih-hesaplama/, /tr/hicri-takvim/)."""
import functools
import http.server
import re
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1] / "public"
PORT = 8802
BASE = f"http://127.0.0.1:{PORT}"
results = []

def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f"  -> {detail}"))

def serve():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd

def main():
    httpd = serve()
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            ctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, locale="tr-TR")
            pg = ctx.new_page()
            errors = []
            pg.on("pageerror", lambda e: errors.append(str(e)))

            # ================= 1. /tr/ (Yaş Hesaplama) =================
            pg.goto(BASE + "/tr/")
            check("tr-home loaded without errors", len(errors) == 0, str(errors))
            check("tr-home title", "Yaş Hesaplama: Kaç Yaşındayım, Doğum Günü ve Yaş Hesaplayıcı" in pg.title())
            check("tr-home h1", pg.inner_text("h1") == "Yaş Hesaplama")
            
            # Fill birth date: 15 August 1995
            pg.fill('#dob [data-part="d"]', "15")
            pg.fill('#dob [data-part="m"]', "08")
            pg.fill('#dob [data-part="y"]', "1995")
            pg.wait_for_timeout(300)
            
            check("tr-home result ready", pg.get_attribute("#result", "data-state") == "ready")
            r_years = pg.inner_text("#r-years")
            check("tr-home age calculated", int(r_years) >= 30, f"Got: {r_years}")
            stats_text = pg.inner_text("#r-stats")
            check("tr-home zodiac sign", "Aslan" in stats_text, stats_text)
            check("tr-home next birthday countdown", "gün kaldı" in stats_text or "Bugün" in stats_text, stats_text)
            check("tr-home ruler present", pg.is_visible("#r-ruler"))

            # ================= 2. /tr/tarih-hesaplama/ (Tarih ve Gün Hesaplama) =================
            errors.clear()
            pg.goto(BASE + "/tr/tarih-hesaplama/")
            check("tr-date loaded without errors", len(errors) == 0, str(errors))
            check("tr-date h1", pg.inner_text("h1") == "Tarih ve gün hesaplama")

            # Mode 1: Diff
            pg.fill('#d1-field [data-part="d"]', "01")
            pg.fill('#d1-field [data-part="m"]', "01")
            pg.fill('#d1-field [data-part="y"]', "2026")

            pg.fill('#d2-field [data-part="d"]', "31")
            pg.fill('#d2-field [data-part="m"]', "01")
            pg.fill('#d2-field [data-part="y"]', "2026")
            pg.wait_for_timeout(300)

            check("tr-date diff result ready", pg.get_attribute("#result", "data-state") == "ready")
            main_diff = pg.inner_text("#r-main")
            check("tr-date diff 30 days", main_diff == "30", f"Got: {main_diff}")
            
            # Test preset +30 on end date
            pg.click("#p-add-30")
            pg.wait_for_timeout(200)
            check("tr-date preset +30 works", pg.get_attribute("#result", "data-state") == "ready")

            # Mode 2: Add
            pg.click('label[for="mode-add"]')
            pg.wait_for_timeout(300)
            check("tr-date section-add visible", pg.is_visible("#section-add"))
            pg.fill("#amount", "60")
            pg.wait_for_timeout(200)
            check("tr-date add result ready", pg.get_attribute("#result", "data-state") == "ready")
            check("tr-date target date shown", len(pg.inner_text("#r-main")) > 0)

            # ================= 3. /tr/hicri-takvim/ (Hicri Takvim) =================
            errors.clear()
            pg.goto(BASE + "/tr/hicri-takvim/")
            check("tr-hijri loaded without errors", len(errors) == 0, str(errors))
            check("tr-hijri h1", pg.inner_text("h1") == "Hicri takvim ve tarih dönüştürücü")
            today_strip = pg.inner_text("#today-tr")
            check("tr-hijri today strip populated", "Hicri" in today_strip and "Miladi" in today_strip, today_strip)

            # Test 12 months table
            months_rows = pg.query_selector_all("#months-body tr")
            check("tr-hijri 12 months in table", len(months_rows) == 12, f"Got: {len(months_rows)}")
            first_row_text = months_rows[0].inner_text()
            check("tr-hijri first month is Muharrem", "Muharrem" in first_row_text, first_row_text)

            # Test converter: H2G (e.g. 1 Muharrem 1448)
            pg.fill('#dob [data-part="d"]', "01")
            pg.select_option('#dob [data-part="m"]', "1")
            pg.fill('#dob [data-part="y"]', "1448")
            pg.wait_for_timeout(300)

            check("tr-hijri h2g result ready", pg.get_attribute("#result", "data-state") == "ready")
            main_h2g = pg.inner_text("#r-main")
            check("tr-hijri h2g target is in 2026", "2026" in main_h2g, f"Got: {main_h2g}")

            # Test year nav: next year
            pg.click("#next-year")
            pg.wait_for_timeout(200)
            check("tr-hijri next year is 1449", pg.inner_text("#tbl-year") == "1.449" or pg.inner_text("#tbl-year") == "1449")

            b.close()
    finally:
        httpd.shutdown()

    failed = [name for name, ok, _ in results if not ok]
    if failed:
        print(f"\n{len(failed)} TESTS FAILED: {failed}")
        sys.exit(1)
    else:
        print(f"\nALL {len(results)} E2E BROWSER TESTS PASSED!")

if __name__ == "__main__":
    main()
