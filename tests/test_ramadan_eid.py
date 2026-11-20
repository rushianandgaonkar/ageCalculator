#!/usr/bin/env python3
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
PUBLIC = ROOT / "public"


def check_no_dashes(text, context):
    dashes = ["–", "—"]
    for d in dashes:
        if d in text:
            raise AssertionError(f"Found dash '{d}' in {context}")


def main():
    print("Testing Ramadan and Eid pages...")

    # 1. File checks
    for p in [
        SRC / "pages" / "ar-ramadan.html",
        SRC / "pages" / "ar-eid.html",
        SRC / "static" / "assets" / "js" / "ar-countdown.js",
        PUBLIC / "ar" / "ramadan" / "index.html",
        PUBLIC / "ar" / "eid" / "index.html",
        PUBLIC / "assets" / "js" / "ar-countdown.js",
    ]:
        assert p.exists(), f"Missing file: {p}"
        print(f"PASS exists: {p.relative_to(ROOT)}")

    # 2. Ramadan checks
    r_html = (PUBLIC / "ar" / "ramadan" / "index.html").read_text(encoding="utf-8")
    assert '<html lang="ar" dir="rtl">' in r_html, "Missing RTL html tag in Ramadan"

    m_title = re.search(r"<title>(.*?)</title>", r_html)
    assert m_title, "No title in Ramadan"
    title_r = m_title.group(1).strip()
    print("Ramadan title:", title_r)
    assert title_r == "كم باقي على رمضان: العداد التنازلي لرمضان 1448", f"Unexpected title: {title_r}"
    check_no_dashes(title_r, "Ramadan title")

    m_desc = re.search(r'<meta name="description" content="(.*?)">', r_html)
    assert m_desc, "No description in Ramadan"
    desc_r = m_desc.group(1).strip()
    print("Ramadan desc:", desc_r)
    assert "1448" in desc_r and "فلكيا" in desc_r
    check_no_dashes(desc_r, "Ramadan desc")

    m_h1 = re.search(r"<h1>(.*?)</h1>", r_html)
    assert m_h1, "No H1 in Ramadan"
    h1_r = m_h1.group(1).strip()
    assert h1_r == "كم باقي على رمضان", f"Unexpected H1: {h1_r}"

    m_lede = re.search(r'<p class="lede">(.*?)</p>', r_html)
    assert m_lede, "No lede in Ramadan"
    lede_r = m_lede.group(1).strip()
    words_r = lede_r.split()
    print(f"Ramadan lede ({len(words_r)} words):", lede_r)
    assert len(words_r) <= 12, f"Lede too long: {len(words_r)} words"
    check_no_dashes(lede_r, "Ramadan lede")

    for id_val in ["cd-days", "cd-hours", "cd-mins", "cd-secs", "cd-summary", "whatsapp", "copy"]:
        assert f'id="{id_val}"' in r_html, f"Missing id={id_val} in Ramadan page"

    assert "https://api.whatsapp.com/send?text=" in r_html
    assert "/ar/eid/" in r_html
    assert "/ar/hijri-converter/" in r_html
    assert "datecore.js" in r_html
    assert "ar-countdown.js" in r_html
    assert "8 فبراير 2027" in r_html

    # Schemas
    ld_blocks = re.findall(r'<script type="application/ld\+json">\s*(.*?)\s*</script>', r_html, re.DOTALL)
    assert ld_blocks, "No JSON-LD in Ramadan"
    parsed_r = [json.loads(b) for b in ld_blocks]
    faq_r = next((x for g in parsed_r for x in g.get("@graph", []) if x.get("@type") == "FAQPage"), None)
    assert faq_r, "Missing FAQPage schema in Ramadan"
    assert len(faq_r["mainEntity"]) >= 5, "Fewer than 5 FAQs in Ramadan"
    print(f"PASS Ramadan FAQs: {len(faq_r['mainEntity'])}")

    app_r = next((x for g in parsed_r for x in g.get("@graph", []) if x.get("@type") == "WebApplication"), None)
    assert app_r, "Missing WebApplication schema in Ramadan"

    # 3. Eid checks
    e_html = (PUBLIC / "ar" / "eid" / "index.html").read_text(encoding="utf-8")
    assert '<html lang="ar" dir="rtl">' in e_html, "Missing RTL html tag in Eid"

    m_title_e = re.search(r"<title>(.*?)</title>", e_html)
    assert m_title_e, "No title in Eid"
    title_e = m_title_e.group(1).strip()
    print("Eid title:", title_e)
    assert title_e == "كم باقي على العيد: العداد التنازلي لعيد الفطر وعيد الأضحى", f"Unexpected title: {title_e}"
    check_no_dashes(title_e, "Eid title")

    m_desc_e = re.search(r'<meta name="description" content="(.*?)">', e_html)
    assert m_desc_e, "No description in Eid"
    desc_e = m_desc_e.group(1).strip()
    print("Eid desc:", desc_e)
    assert "1448" in desc_e and "عيد الفطر" in desc_e
    check_no_dashes(desc_e, "Eid desc")

    m_h1_e = re.search(r"<h1>(.*?)</h1>", e_html)
    assert m_h1_e, "No H1 in Eid"
    h1_e = m_h1_e.group(1).strip()
    assert h1_e == "كم باقي على العيد", f"Unexpected H1: {h1_e}"

    m_lede_e = re.search(r'<p class="lede">(.*?)</p>', e_html)
    assert m_lede_e, "No lede in Eid"
    lede_e = m_lede_e.group(1).strip()
    words_e = lede_e.split()
    print(f"Eid lede ({len(words_e)} words):", lede_e)
    assert len(words_e) <= 12, f"Lede too long: {len(words_e)} words"
    check_no_dashes(lede_e, "Eid lede")

    for id_val in ["eid-fitr", "eid-adha", "cd-days", "cd-hours", "cd-mins", "cd-secs", "cd-summary", "whatsapp", "copy"]:
        assert f'id="{id_val}"' in e_html, f"Missing id={id_val} in Eid page"

    assert "https://api.whatsapp.com/send?text=" in e_html
    assert "/ar/ramadan/" in e_html
    assert "/ar/hijri-converter/" in e_html
    assert "datecore.js" in e_html
    assert "ar-countdown.js" in e_html
    assert "9 مارس 2027" in e_html
    assert "16 مايو 2027" in e_html

    # Schemas
    ld_blocks_e = re.findall(r'<script type="application/ld\+json">\s*(.*?)\s*</script>', e_html, re.DOTALL)
    assert ld_blocks_e, "No JSON-LD in Eid"
    parsed_e = [json.loads(b) for b in ld_blocks_e]
    faq_e = next((x for g in parsed_e for x in g.get("@graph", []) if x.get("@type") == "FAQPage"), None)
    assert faq_e, "Missing FAQPage schema in Eid"
    assert len(faq_e["mainEntity"]) >= 5, "Fewer than 5 FAQs in Eid"
    print(f"PASS Eid FAQs: {len(faq_e['mainEntity'])}")

    app_e = next((x for g in parsed_e for x in g.get("@graph", []) if x.get("@type") == "WebApplication"), None)
    assert app_e, "Missing WebApplication schema in Eid"

    print("\nALL RAMADAN AND EID ASSERTIONS PASSED!")


if __name__ == "__main__":
    main()
