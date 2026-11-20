#!/usr/bin/env python3
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC_PAGES = ROOT / "src" / "pages"
SRC_JS = ROOT / "src" / "static" / "assets" / "js"
PUBLIC = ROOT / "public"

def test_files_exist():
    expected_src = [
        SRC_PAGES / "tr-home.html",
        SRC_JS / "tr-home.js",
        SRC_PAGES / "tr-date.html",
        SRC_JS / "tr-date.js",
        SRC_PAGES / "tr-hijri.html",
        SRC_JS / "tr-hijri.js"
    ]
    for p in expected_src:
        assert p.exists(), f"Source file does not exist: {p}"
    
    expected_public = [
        PUBLIC / "tr" / "index.html",
        PUBLIC / "tr" / "tarih-hesaplama" / "index.html",
        PUBLIC / "tr" / "hicri-takvim" / "index.html",
        PUBLIC / "assets" / "js" / "tr-home.js",
        PUBLIC / "assets" / "js" / "tr-date.js",
        PUBLIC / "assets" / "js" / "tr-hijri.js"
    ]
    for p in expected_public:
        assert p.exists(), f"Public file does not exist: {p}"
    print("All source and public files exist.")

def test_hero_and_dashes():
    pages = [
        ("tr-home.html", PUBLIC / "tr" / "index.html"),
        ("tr-date.html", PUBLIC / "tr" / "tarih-hesaplama" / "index.html"),
        ("tr-hijri.html", PUBLIC / "tr" / "hicri-takvim" / "index.html")
    ]
    
    for name, path in pages:
        content = path.read_text(encoding="utf-8")
        
        # Check lede word count (hero sentence)
        m_lede = re.search(r'<p class="lede">(.*?)</p>', content, re.DOTALL)
        assert m_lede, f"Lede not found in {name}"
        lede_text = re.sub(r'<[^>]+>', '', m_lede.group(1)).strip()
        words = lede_text.split()
        word_count = len(words)
        print(f"{name} hero sentence ({word_count} words): '{lede_text}'")
        assert word_count <= 12, f"Hero sentence has {word_count} words (> 12) in {name}: '{lede_text}'"
        
        # Check title
        m_title = re.search(r'<title>(.*?)</title>', content)
        assert m_title, f"Title not found in {name}"
        title = m_title.group(1)
        # Note: Site title may have " | Ageason" suffix added by build.py, but user title portion shouldn't have dash
        title_core = title.split(" | ")[0]
        for dash in ["-", "–", "—"]:
            assert dash not in title_core, f"Dash '{dash}' found in title of {name}: '{title}'"
        
        # Check description
        m_desc = re.search(r'<meta name="description" content="(.*?)">', content)
        assert m_desc, f"Description not found in {name}"
        desc = m_desc.group(1)
        for dash in ["-", "–", "—"]:
            assert dash not in desc, f"Dash '{dash}' found in description of {name}: '{desc}'"
            
        # Check headings
        headings = re.findall(r'<h[1-4][^>]*>(.*?)</h[1-4]>', content, re.DOTALL)
        for h in headings:
            clean_h = re.sub(r'<[^>]+>', '', h).strip()
            for dash in ["-", "–", "—"]:
                assert dash not in clean_h, f"Dash '{dash}' found in heading of {name}: '{clean_h}'"
                
        # Check FAQ in JSON-LD
        m_jsonld = re.search(r'<script type="application/ld\+json">(.*?)</script>', content, re.DOTALL)
        assert m_jsonld, f"JSON-LD not found in {name}"
        data = json.loads(m_jsonld.group(1))
        # Find FAQPage
        faq_items = []
        for g in data.get("@graph", []):
            if g.get("@type") == "FAQPage":
                faq_items = g.get("mainEntity", [])
        assert len(faq_items) >= 4, f"FAQ items missing or too few in {name}: {len(faq_items)}"
        for item in faq_items:
            q = item["name"]
            a = item["acceptedAnswer"]["text"]
            for dash in ["-", "–", "—"]:
                assert dash not in q, f"Dash '{dash}' found in FAQ question of {name}: '{q}'"
                assert dash not in a, f"Dash '{dash}' found in FAQ answer of {name}: '{a}'"
                
    print("Hero word count and zero-dash checks passed on all pages.")

def test_js_dashes():
    js_files = ["tr-home.js", "tr-date.js", "tr-hijri.js"]
    for f in js_files:
        code = (SRC_JS / f).read_text(encoding="utf-8")
        # Check strings inside JS for en-dash or em-dash or lonely minus in text
        for em in ["–", "—"]:
            assert em not in code, f"Dash '{em}' found in {f}"
    print("Zero en-dash / em-dash checks passed in JS files.")

if __name__ == "__main__":
    test_files_exist()
    test_hero_and_dashes()
    test_js_dashes()
    print("ALL TESTS PASSED SUCCESSFULLY!")
