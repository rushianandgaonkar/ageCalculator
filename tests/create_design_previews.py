"""Capture Ageason Design V2 on representative pages, screen sizes and languages.

Start the local built-site server before running this script:
python -m http.server 8000 --bind 127.0.0.1 --directory public
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
out = root / "artifacts" / "design-v2"
out.mkdir(parents=True, exist_ok=True)

pages = [
    ("english-home", "/"),
    ("arabic-home", "/ar/"),
    ("chronological", "/chronological-age-calculator/"),
    ("age-difference", "/age-difference/"),
    ("arabic-hijri-converter", "/ar/hijri-converter/"),
    ("japanese", "/ja/"),
    ("nepali", "/nepali-age-calculator/"),
    ("exam-age-limits", "/age-limit/"),
    ("about", "/about/"),
]

with sync_playwright() as playwright:
    browser = playwright.chromium.launch()
    for name, path in pages:
        for device, width, height in (("desktop", 1440, 900), ("mobile", 390, 844)):
            page = browser.new_page(viewport={"width": width, "height": height}, device_scale_factor=1)
            response = page.goto("http://127.0.0.1:8000" + path, wait_until="networkidle")
            assert response is not None and response.status == 200, name
            expected_class = "landing-v2" if name in ("english-home", "arabic-home") else "landing-v2 inner-v2"
            assert page.locator("body").get_attribute("class") == expected_class, name
            assert page.locator('link[href*="/assets/css/landing.css"]').count() == 1, name
            assert page.locator(".site-footer.footer-v2").count() == 1, name
            assert page.locator(".site-footer .footer-column").count() == 3, name
            if name in ("english-home", "arabic-home"):
                assert page.locator("canvas[data-hero-shader]").count() == 1, name
                assert page.locator(".tool .beam-frame").count() == 1, name
                frame_style = page.locator(".tool .beam-frame").evaluate(
                    "(el) => getComputedStyle(el).boxShadow")
                assert frame_style != "none", "No fallback beam border: " + name
            assert not page.locator(".site-footer a[href*='github.com']").count(), name
            if name == "arabic-home":
                assert page.get_by_text("الحاسبات بالعربية", exact=True).count() == 1
                assert page.get_by_text("حاسبات بلغات أخرى", exact=True).count() == 1
            if name == "japanese":
                assert page.get_by_text("日本語のツール", exact=True).count() == 1
            if device == "mobile" and name not in ("japanese", "exam-age-limits"):
                overflow = page.evaluate("document.documentElement.scrollWidth > window.innerWidth + 2")
                assert not overflow, "Horizontal viewport overflow: " + name
            # Tall Japanese tables are internally scrollable; capture the first viewport.
            page.screenshot(path=str(out / (name + "-" + device + ".png")),
                            full_page=name not in ("japanese", "exam-age-limits"))
            if name in ("english-home", "arabic-home"):
                timeline = page.locator("[data-timeline]")
                assert timeline.count() == 1
                start = float(timeline.evaluate("(el) => parseFloat(el.style.getPropertyValue('--timeline-progress')) || 0"))
                page.locator(".timeline-step").last.scroll_into_view_if_needed()
                page.wait_for_timeout(220)
                end = float(timeline.evaluate("(el) => parseFloat(el.style.getPropertyValue('--timeline-progress')) || 0"))
                assert end > start, f"Scroll timeline not progressing: {name} {device} {start}->{end}"
                timeline.screenshot(path=str(out / (name + "-" + device + "-timeline.png")),
                                    animations="disabled")
                page.locator(".site-footer.footer-v2").screenshot(
                    path=str(out / (name + "-" + device + "-footer.png")),
                    animations="disabled")
                if device == "desktop":
                    reduced = browser.new_page(viewport={"width": 1440, "height": 900},
                                               reduced_motion="reduce")
                    reduced.goto("http://127.0.0.1:8000" + path, wait_until="networkidle")
                    shader_display = reduced.locator("[data-hero-shader]").evaluate(
                        "(el) => getComputedStyle(el).display")
                    beam_animation = reduced.locator(".tool .beam-frame").evaluate(
                        "(el) => getComputedStyle(el, '::after').animationName")
                    assert shader_display == "none", f"Reduced motion shader still visible: {name}"
                    assert beam_animation == "none", f"Reduced motion border is animating: {name}"
                    reduced.close()
            page.close()
    browser.close()
print("Saved 26 visual screenshots for Ageason Design V2 (including timelines and footers).")
