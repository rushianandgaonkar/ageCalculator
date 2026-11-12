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
            if device == "mobile" and name not in ("japanese", "exam-age-limits"):
                overflow = page.evaluate("document.documentElement.scrollWidth > window.innerWidth + 2")
                assert not overflow, "Horizontal viewport overflow: " + name
            # Tall Japanese tables are internally scrollable; capture the first viewport.
            page.screenshot(path=str(out / (name + "-" + device + ".png")),
                            full_page=name not in ("japanese", "exam-age-limits"))
            page.close()
    browser.close()
print("Saved 18 visual screenshots for Ageason Design V2.")
