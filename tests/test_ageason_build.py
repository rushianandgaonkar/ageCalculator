#!/usr/bin/env python3
"""Basic deployment and brand smoke tests. Run after: python build.py."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public"

def verify():
    html_paths = [
        "index.html",
        "ar/index.html",
        "ar/age-difference/index.html",
        "ja/index.html",
        "about/index.html",
        "ar/about/index.html",
    ]
    for rel in html_paths:
        path = OUT / rel
        page = path.read_text(encoding="utf-8")
        assert 'https://ageason.com/' in page, f"canonical host missing: {rel}"
        assert 'https://www.example.com' not in page, f"placeholder host in: {rel}"
        assert 'Agewise' not in page, f"legacy brand in: {rel}"
        assert 'Ageason' in page, f"new brand missing: {rel}"
        assert re.search(r'<link rel="canonical" href="https://ageason.com/', page), f"canonical missing: {rel}"

    # V2 visual system now spans every generated page, with compact inner-page heroes.
    en = (OUT / "index.html").read_text(encoding="utf-8")
    ar_home = (OUT / "ar/index.html").read_text(encoding="utf-8")
    for label, html_page in (("English", en), ("Arabic", ar_home)):
        assert '<body class="landing-v2">' in html_page, f"Homepage V2 class missing: {label}"
        assert 'class="hero-title-accent"' in html_page, f"Hero accent missing: {label}"
        assert html_page.count('class="landing-link-card"') == 3, f"Discovery cards missing: {label}"

    all_pages = list(OUT.rglob("*.html"))
    assert len(all_pages) >= 20, f"Unexpectedly few pages: {len(all_pages)}"
    for page_path in all_pages:
        page = page_path.read_text(encoding="utf-8")
        rel = page_path.relative_to(OUT)
        assert 'class="landing-v2' in page, f"Missing V2 design: {rel}"
        assert '/assets/css/landing.css?v=' in page, f"Missing V2 stylesheet: {rel}"
        if rel not in (Path("index.html"), Path("ar/index.html")):
            assert '<body class="landing-v2 inner-v2">' in page, f"Inner-page layout missing: {rel}"
    assert (OUT / "assets/css/landing.css").exists()

    ar = (OUT / "ar/index.html").read_text(encoding="utf-8")
    assert '<html lang="ar" dir="rtl">' in ar
    assert 'id="result-status"' in ar
    assert 'name="dob_year"' in ar and 'name="on_year"' in ar
    assert '<div class="result" id="result" data-state="empty">' in ar

    sitemap = (OUT / "sitemap.xml").read_text(encoding="utf-8")
    robots = (OUT / "robots.txt").read_text(encoding="utf-8")
    manifest = json.loads((OUT / "site.webmanifest").read_text(encoding="utf-8"))
    assert 'https://ageason.com/ar/' in sitemap
    assert 'https://www.example.com' not in sitemap
    assert 'Sitemap: https://ageason.com/sitemap.xml' in robots
    assert manifest["short_name"] == "Ageason"
    print("Ageason domain, generated branding, language and accessibility smoke checks passed.")

if __name__ == "__main__":
    verify()
