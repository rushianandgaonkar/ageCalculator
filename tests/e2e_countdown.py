#!/usr/bin/env python3
"""E2E browser tests for Ramadan and Eid countdown pages."""
import functools
import http.server
import threading
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1] / "public"
PORT = 8798
B = f"http://127.0.0.1:{PORT}"


def serve():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def main():
    httpd = serve()
    print("Testing /ar/ramadan/ and /ar/eid/ in Playwright Chromium...")

    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, locale="ar-SA")
        pg = ctx.new_page()

        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))

        # 1. Ramadan Countdown Page
        resp = pg.goto(B + "/ar/ramadan/")
        assert resp.status == 200, f"Expected 200, got {resp.status}"
        pg.wait_for_timeout(1200)  # let timer tick at least once

        # Check title and headings
        assert pg.title() == "كم باقي على رمضان: العداد التنازلي لرمضان 1448"
        assert pg.inner_text("h1") == "كم باقي على رمضان"

        # Check countdown numbers are populated
        days_txt = pg.inner_text("#cd-days").strip()
        hours_txt = pg.inner_text("#cd-hours").strip()
        mins_txt = pg.inner_text("#cd-mins").strip()
        secs_txt = pg.inner_text("#cd-secs").strip()
        print(f"Ramadan Countdown: {days_txt} days, {hours_txt} hours, {mins_txt} mins, {secs_txt} secs")
        assert days_txt != "--" and int(days_txt) > 0, f"Days not numeric or zero: {days_txt}"
        assert hours_txt != "--"
        assert mins_txt != "--"
        assert secs_txt != "--"

        # Check summary sentence
        summary_txt = pg.inner_text("#cd-summary")
        print("Ramadan summary:", summary_txt)
        assert "باقي" in summary_txt and "1448" in summary_txt and "رمضان" in summary_txt

        # Check WhatsApp link
        wa_href = pg.get_attribute("#whatsapp", "href")
        print("WhatsApp link:", wa_href[:60])
        assert "api.whatsapp.com/send?text=" in wa_href
        assert "1448" in wa_href

        # Check digits toggle
        pg.click("label[for=dig-arab]")
        pg.wait_for_timeout(300)
        arab_days = pg.inner_text("#cd-days").strip()
        print("Arabic digits days:", arab_days)
        # Should contain Arabic-Indic digits
        assert any(c in "٠١٢٣٤٥٦٧٨٩" for c in arab_days), f"Expected Arabic digits, got {arab_days}"

        pg.click("label[for=dig-latn]")
        pg.wait_for_timeout(300)
        latn_days = pg.inner_text("#cd-days").strip()
        assert latn_days == days_txt

        # 2. Eid Countdown Page
        resp_eid = pg.goto(B + "/ar/eid/")
        assert resp_eid.status == 200, f"Expected 200 on Eid, got {resp_eid.status}"
        pg.wait_for_timeout(1200)

        assert pg.title() == "كم باقي على العيد: العداد التنازلي لعيد الفطر وعيد الأضحى"
        assert pg.inner_text("h1") == "كم باقي على العيد"

        # Check default selection is Eid al-Fitr (1 Shawwal 1448)
        assert pg.is_checked("#eid-fitr")
        eid_days_fitr = int(pg.inner_text("#cd-days").strip())
        print(f"Eid al-Fitr Countdown: {eid_days_fitr} days")
        assert eid_days_fitr > 0
        assert "عيد الفطر" in pg.inner_text("#target-event")
        assert "9 مارس 2027" in pg.inner_text("#target-greg")

        # Switch to Eid al-Adha
        pg.click("label[for=eid-adha]")
        pg.wait_for_timeout(400)
        assert pg.is_checked("#eid-adha")
        eid_days_adha = int(pg.inner_text("#cd-days").strip())
        print(f"Eid al-Adha Countdown: {eid_days_adha} days")
        assert eid_days_adha > eid_days_fitr, "Eid al-Adha should be further in the future than Eid al-Fitr"
        assert "عيد الأضحى" in pg.inner_text("#target-event")
        assert "16 مايو 2027" in pg.inner_text("#target-greg")
        assert "ذو الحجة" in pg.inner_text("#target-hijri")

        # Switch back to Eid al-Fitr
        pg.click("label[for=eid-fitr]")
        pg.wait_for_timeout(400)
        assert int(pg.inner_text("#cd-days").strip()) == eid_days_fitr

        # No errors
        assert len(errors) == 0, f"JavaScript errors encountered: {errors}"
        print("PASS no JavaScript errors on both pages")
        ctx.close()
        b.close()

    print("\nALL E2E BROWSER TESTS FOR RAMADAN AND EID PASSED!")


if __name__ == "__main__":
    main()
