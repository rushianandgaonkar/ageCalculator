"""Generate English and Arabic screenshots from the locally built static site."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
out = root / "artifacts" / "design-v2"
out.mkdir(parents=True, exist_ok=True)

with sync_playwright() as playwright:
    browser = playwright.chromium.launch()
    for lang, path in [("en", "/"), ("ar", "/ar/")]:
        for device, width, height in [("desktop", 1440, 900), ("mobile", 390, 844)]:
            page = browser.new_page(viewport={"width":width,"height":height})
            page.goto("http://127.0.0.1:8000" + path, wait_until="networkidle")
            page.screenshot(path=str(out / (lang + "-" + device + ".png")), full_page=True)
            page.close()
    browser.close()
print("Saved 4 design previews.")
