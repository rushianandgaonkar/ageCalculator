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
