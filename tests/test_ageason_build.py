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
        assert "github.com/rushianandgaonkar/ageCalculator" not in page, f"Repository link exposed: {rel}"

    # V2 visual system now spans every generated page, with compact inner-page heroes.
    en = (OUT / "index.html").read_text(encoding="utf-8")
    ar_home = (OUT / "ar/index.html").read_text(encoding="utf-8")
    for label, html_page in (("English", en), ("Arabic", ar_home)):
        assert '<body class="landing-v2">' in html_page, f"Homepage V2 class missing: {label}"
        assert 'class="hero-title-accent"' in html_page, f"Hero accent missing: {label}"
        assert html_page.count('class="landing-link-card"') == 3, f"Discovery cards missing: {label}"
        assert 'class="wrap tool-grid"' in html_page, f"Calculator layout missing: {label}"
        assert 'data-hero-shader' not in html_page, f"Unwanted shader remains: {label}"
        assert 'beam-frame' not in html_page, f"Unwanted border effect remains: {label}"
        assert '/assets/js/hero-shader.js' not in html_page, f"Unwanted shader script remains: {label}"

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
    footer_css = (OUT / "assets/css/landing.css").read_text(encoding="utf-8")
    assert ".footer-v2.footer-rounded" in footer_css
    assert "border-radius: 30px 30px 0 0" in footer_css
    assert not (OUT / "assets/js/hero-shader.js").exists()
    assert "Age Calculator" in en and "Calculate Your Exact Age" in en
    assert "Your age, beautifully calculated." not in en

    # Footer navigation groups the current language separately from alternatives.
    footer_cases = [
        ("index.html", "English calculators", "Other languages"),
        ("ar/index.html", "الحاسبات بالعربية", "حاسبات بلغات أخرى"),
        ("ja/index.html", "日本語のツール", "ほかの言語"),
        ("nepali-age-calculator/index.html", "Nepali calendar tools", "Other languages"),
    ]
    for rel, own_label, others_label in footer_cases:
        html_text = (OUT / rel).read_text(encoding="utf-8")
        assert 'class="site-footer footer-v2 footer-rounded"' in html_text, rel
        assert 'data-slot="footer-inner"' in html_text, rel
        assert 'class="footer-legal"' in html_text, rel
        assert 'class="footer-brand-column"' in html_text, rel
        assert 'href="https://github.com/' not in html_text, rel
        assert own_label in html_text and others_label in html_text, rel
        assert html_text.count('class="footer-column"') == 3, rel
        assert 'href="/contact/"' in html_text or 'href="/ar/contact/"' in html_text, rel
        assert 'hello@example.com' not in html_text.split('<footer class="site-footer footer-v2">')[1], rel

    # Timeline progress is an accessible enhancement, not a dependency for using calculators.
    for rel in ("index.html", "ar/index.html"):
        html_text = (OUT / rel).read_text(encoding="utf-8")
        assert 'data-timeline' in html_text, rel
        assert html_text.count('data-timeline-step') == 3, rel
        assert '/assets/js/scroll-timeline.js?v=' in html_text, rel
    assert (OUT / "assets/js/scroll-timeline.js").exists()

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
    for public_html in OUT.rglob("*.html"):
        assert "github.com/rushianandgaonkar/ageCalculator" not in public_html.read_text(encoding="utf-8"), f"Repository link in {public_html}"
    assert manifest["short_name"] == "Ageason"
    print("Ageason domain, generated branding, language and accessibility smoke checks passed.")

if __name__ == "__main__":
    verify()
