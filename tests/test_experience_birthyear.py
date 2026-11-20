#!/usr/bin/env python3
"""Integration and smoke tests for Experience Calculator and Birth Year Calculator."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
PUBLIC = ROOT / "public"


def check_no_dashes(text, context):
    dashes = ["–", "—", " - "]
    for d in dashes:
        if d in text:
            raise AssertionError(f"Found dash '{d}' in {context}: {text}")


def main():
    print("Testing Experience Calculator and Birth Year Calculator...")

    # 1. Source and public files existence
    expected_files = [
        SRC / "pages" / "experience-calculator.html",
        SRC / "static" / "assets" / "js" / "experience.js",
        SRC / "pages" / "birth-year-calculator.html",
        SRC / "static" / "assets" / "js" / "birth-year.js",
        PUBLIC / "experience-calculator" / "index.html",
        PUBLIC / "birth-year-calculator" / "index.html",
        PUBLIC / "assets" / "js" / "experience.js",
        PUBLIC / "assets" / "js" / "birth-year.js",
    ]
    for p in expected_files:
        assert p.exists(), f"Missing expected file: {p}"
        print(f"PASS exists: {p.relative_to(ROOT)}")

    # 2. Experience Calculator assertions
    exp_html = (PUBLIC / "experience-calculator" / "index.html").read_text(encoding="utf-8")

    m_title = re.search(r"<title>(.*?)</title>", exp_html)
    assert m_title, "Missing title in experience calculator"
    exp_title = m_title.group(1).strip()
    assert exp_title.startswith("Experience Calculator: Total Work Experience in Years, Months and Days"), f"Unexpected title: {exp_title}"
    check_no_dashes(exp_title, "Experience Calculator title")
    assert not any(c in exp_title for c in ["—", "–", " - "]), "Experience Calculator title has dash!"

    m_desc = re.search(r'<meta name="description" content="(.*?)">', exp_html)
    assert m_desc, "Missing description in experience calculator"
    exp_desc = m_desc.group(1).strip()
    check_no_dashes(exp_desc, "Experience Calculator description")

    m_h1 = re.search(r"<h1>(.*?)</h1>", exp_html)
    assert m_h1, "Missing H1 in experience calculator"
    assert m_h1.group(1).strip() == "Experience calculator"

    m_lede = re.search(r'<p class="lede">(.*?)</p>', exp_html)
    assert m_lede, "Missing lede in experience calculator"
    exp_lede = m_lede.group(1).strip()
    words_exp = exp_lede.split()
    assert len(words_exp) <= 12, f"Experience Calculator lede has {len(words_exp)} words (>12): {exp_lede}"
    check_no_dashes(exp_lede, "Experience Calculator lede")

    # Essential UI IDs in Experience Calculator
    for el_id in ["calc", "jobs-container", "btn-add-job", "btn-reset", "result", "r-caption", "r-years", "r-years-unit", "r-sub", "r-stats", "copy"]:
        assert f'id="{el_id}"' in exp_html, f"Missing id={el_id} in experience calculator"

    # Script tag check
    assert "/assets/js/datecore.js" in exp_html, "datecore.js script missing in experience calculator"
    assert "/assets/js/experience.js" in exp_html, "experience.js script missing in experience calculator"

    # FAQ schema check
    assert 'itemtype="https://schema.org/FAQPage"' in exp_html or '"@type": "FAQPage"' in exp_html or '"@type":"FAQPage"' in exp_html

    # 3. Birth Year Calculator assertions
    by_html = (PUBLIC / "birth-year-calculator" / "index.html").read_text(encoding="utf-8")

    m_by_title = re.search(r"<title>(.*?)</title>", by_html)
    assert m_by_title, "Missing title in birth year calculator"
    by_title = m_by_title.group(1).strip()
    assert by_title.startswith("Birth Year Calculator: What Year Was I Born and Days Alive"), f"Unexpected title: {by_title}"
    check_no_dashes(by_title, "Birth Year Calculator title")
    assert not any(c in by_title for c in ["—", "–", " - "]), "Birth Year Calculator title has dash!"

    m_by_desc = re.search(r'<meta name="description" content="(.*?)">', by_html)
    assert m_by_desc, "Missing description in birth year calculator"
    by_desc = m_by_desc.group(1).strip()
    check_no_dashes(by_desc, "Birth Year Calculator description")

    m_by_h1 = re.search(r"<h1>(.*?)</h1>", by_html)
    assert m_by_h1, "Missing H1 in birth year calculator"
    assert m_by_h1.group(1).strip() == "Birth year calculator"

    m_by_lede = re.search(r'<p class="lede">(.*?)</p>', by_html)
    assert m_by_lede, "Missing lede in birth year calculator"
    by_lede = m_by_lede.group(1).strip()
    words_by = by_lede.split()
    assert len(words_by) <= 12, f"Birth Year Calculator lede has {len(words_by)} words (>12): {by_lede}"
    check_no_dashes(by_lede, "Birth Year Calculator lede")

    # Essential UI IDs in Birth Year Calculator
    for el_id in ["calc", "mode-year", "mode-days", "panel-year", "panel-days", "input-age", "dob-field", "result", "r-caption", "r-main", "r-sub", "r-stats", "copy"]:
        assert f'id="{el_id}"' in by_html, f"Missing id={el_id} in birth year calculator"

    # Script tag check
    assert "/assets/js/datecore.js" in by_html, "datecore.js script missing in birth year calculator"
    assert "/assets/js/birth-year.js" in by_html, "birth-year.js script missing in birth year calculator"

    # Sitemap check
    sitemap = (PUBLIC / "sitemap.xml").read_text(encoding="utf-8")
    assert "https://www.ageason.com/experience-calculator/" in sitemap, "Missing experience-calculator in sitemap"
    assert "https://www.ageason.com/birth-year-calculator/" in sitemap, "Missing birth-year-calculator in sitemap"

    # llms.txt check
    llms = (PUBLIC / "llms.txt").read_text(encoding="utf-8")
    assert "/experience-calculator/" in llms, "Missing experience-calculator in llms.txt"
    assert "/birth-year-calculator/" in llms, "Missing birth-year-calculator in llms.txt"

    print("ALL EXPERIENCE AND BIRTH YEAR CALCULATOR TESTS PASSED!")


if __name__ == "__main__":
    main()
