#!/usr/bin/env python3
"""
Static site builder. Python 3.8+, no packages needed.

    python build.py            -> writes the deployable site to ./public

Edit the CONFIG block below (domain, name, email, AdSense ID), then rebuild.
Page bodies live in src/pages/*.html; each starts with a <!--meta {json} --> block.
Static files (css, js, fonts, icons) live in src/static and are copied as-is.
"""
import datetime as dt
import hashlib
import html
import json
import re
import shutil
from bisect import bisect_right
from pathlib import Path

# ============================== CONFIG ==============================
SITE_URL = "https://ageason.com"         # Canonical domain (enable after purchase and DNS setup)
SITE_NAME = "Ageason"                      # Public brand
CONTACT_EMAIL = "hello@example.com"        # <-- shown on the contact page
ADSENSE_PUB_ID = ""                        # e.g. "pub-1234567890123456" (fills ads.txt + ad script)
BUILD_DATE = dt.date.today()
JA_TABLE_YEAR = BUILD_DATE.year            # set to next year in late December for the 年齢早見表 rush
JA_FY = BUILD_DATE.year if BUILD_DATE.month >= 4 else BUILD_DATE.year - 1   # Japanese school year (年度) for 学年早見表
# ====================================================================

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
OUT = ROOT / "public"

TOOLS = [  # top menu, in order; label is in the tool's own language
    ("home",   "/",                              "Age calculator"),
    ("ar",     "/ar/",                           "حساب العمر"),
    ("ja",     "/ja/",                           "年齢早見表"),
    ("exam",   "/age-limit/",                    "Exam age limits"),
    ("ne",     "/nepali-age-calculator/",        "Nepali age"),
    ("neconv", "/nepali-date-converter/",        "Nepali date"),
    ("diff",   "/age-difference/",               "Age difference"),
    ("chrono", "/chronological-age-calculator/", "Chronological age"),
]
EXAMS = [("upsc", "/age-limit/upsc/", "UPSC age limit", "Civil Services: 21 to under 32 on 1 August, plus category relaxation and attempts."),
         ("ssc", "/age-limit/ssc/", "SSC age limit", "SSC GD (18–23) and CGL post groups (18–27 to 18–32), with relaxation."),
         ("nda", "/age-limit/nda/", "NDA age limit", "Born-between dates for NDA (I) and (II), for men and women."),
         ("cds", "/age-limit/cds/", "CDS age limit", "IMA, INA, AFA and OTA date-of-birth windows, including the CPL relaxation."),
         ("agniveer", "/age-limit/agniveer/", "Agniveer age limit", "Army Agniveer and Air Force Agniveervayu date-of-birth windows.")]
# every calculator page (menu items plus sub-pages), used by the footer and "related" lists
ALL_TOOLS = TOOLS[:3] + [("ardiff", "/ar/age-difference/", "حساب فرق العمر"), ("gakunen", "/ja/gakunen/", "学年早見表")] + TOOLS[3:]
AR_TOOLS = [
    ("ar",     "/ar/",                 "حساب العمر"),
    ("arconv", "/ar/hijri-converter/", "تحويل التاريخ"),
    ("ardiff", "/ar/age-difference/",  "فرق العمر"),
    ("arages", "/ar/ages/",            "جدول الأعمار"),
]
PATHS = {k: p for k, p, _ in ALL_TOOLS}
PATHS.update({k: p for k, p, _ in AR_TOOLS})
PATHS.update({k: p for k, p, _, _ in EXAMS})
TOOL_LANG = {"ar": "ar", "ardiff": "ar", "arconv": "ar", "arages": "ar", "ja": "ja", "gakunen": "ja"}

RELATED = {
    "en": [
        ("home", "Age calculator", "Exact age in years, months and days, on any date. Checks exam age limits."),
        ("ar", "حساب العمر بالهجري والميلادي", "Age calculator in Arabic with Hijri (Umm al-Qura) and Gregorian dates."),
        ("ja", "年齢早見表", "Japanese age chart by Reiwa, Heisei and Showa year, with zodiac animal."),
        ("ne", "Nepali age calculator", "Age in Bikram Sambat and AD from a BS or AD date of birth."),
        ("exam", "Exam age limit calculators", "UPSC, SSC, NDA, CDS and Agniveer eligibility by date of birth."),
        ("neconv", "Nepali date converter", "Convert BS dates to AD and AD to BS, with today's Nepali date."),
        ("diff", "Age difference calculator", "The exact age gap between two people in years, months and days."),
        ("chrono", "Chronological age calculator", "Years;months;days for test scoring, with adjusted age for prematurity."),
    ],
    "ar": [
        ("ar", "حساب العمر بالهجري والميلادي", "احسب عمرك بالسنوات والأشهر والأيام بالتقويمين الهجري والميلادي."),
        ("arconv", "تحويل التاريخ من هجري إلى ميلادي", "حوّل أي تاريخ بين التقويم الهجري (أم القرى) والميلادي مع جدول أشهر السنة."),
        ("ardiff", "حساب فرق العمر بين شخصين", "اعرف فرق العمر بين شخصين بالهجري والميلادي."),
        ("arages", "جدول الأعمار بالهجري والميلادي", "اعرف عمر مواليد أي سنة هجرية أو ميلادية من جدول 100 عام."),
    ],
    "ja": [
        ("ja", "年齢早見表", "生まれ年ごとの満年齢・和暦・干支と長寿祝いの早見表。"),
        ("gakunen", "学年早見表", "生年月日から今年度の学年と入学・卒業年がわかります。"),
        ("home", "Age calculator (English)", "英語版の年齢計算。任意の日付時点の年齢を計算できます。"),
        ("ar", "حساب العمر", "アラビア語版。ヒジュラ暦と西暦で年齢を計算します。"),
        ("ne", "Nepali age calculator", "ネパール暦（ビクラム暦）で年齢を計算します。"),
        ("chrono", "Chronological age calculator", "心理検査などで使う生活年齢（年;月;日）を計算します。"),
    ],
}

UI = {
    "en": {
        "skip": "Skip to calculator", "tools": "Calculators", "site": "Site",
        "about": "About", "privacy": "Privacy", "terms": "Terms", "contact": "Contact",
        "tagline": "Free date and age calculators in several languages and calendars. Everything is calculated in your browser; nothing you enter is sent or stored.",
        "faq": "Frequently asked questions", "related": "Other calculators", "updated": "Last updated",
        "home": "Home",
    },
    "ar": {
        "skip": "انتقل إلى الحاسبة", "tools": "الحاسبات", "site": "الموقع",
        "about": "من نحن", "privacy": "الخصوصية", "terms": "الشروط", "contact": "اتصل بنا",
        "tagline": "حاسبات مجانية للتاريخ والعمر بالتقويمين الهجري والميلادي. تتم جميع العمليات داخل متصفحك، ولا يُرسل أو يُحفظ أي شيء تدخله.",
        "faq": "أسئلة شائعة", "related": "حاسبات أخرى", "updated": "آخر تحديث",
        "home": "الرئيسية",
    },
    "ja": {
        "skip": "計算フォームへ移動", "tools": "計算ツール", "site": "サイト情報",
        "about": "About（英語）", "privacy": "プライバシー（英語）", "terms": "利用規約（英語）", "contact": "お問い合わせ（英語）",
        "tagline": "多言語・多暦対応の無料年齢計算ツール。計算はすべてブラウザ内で行われ、入力内容が送信・保存されることはありません。",
        "faq": "よくある質問", "related": "ほかの計算ツール", "updated": "最終更新",
        "home": "ホーム",
    },
}

BRAND_SVG = ('<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="2" y="5" width="28" height="25" rx="3" fill="#0f62fe"/>'
             '<rect x="2" y="5" width="28" height="7" rx="3" fill="#0043ce"/><rect x="8" y="2" width="3" height="7" rx="1.5" fill="#161616"/>'
             '<rect x="21" y="2" width="3" height="7" rx="1.5" fill="#161616"/><rect x="7" y="17" width="18" height="3" fill="#fff"/>'
             '<rect x="7" y="23" width="11" height="3" fill="#fff"/></svg>')


def abs_url(path):
    return SITE_URL.rstrip("/") + path


def load_pages():
    pages = []
    for f in sorted((SRC / "pages").glob("*.html")):
        text = f.read_text(encoding="utf-8")
        m = re.match(r"\s*<!--meta\s*(\{.*?\})\s*-->\s*", text, re.S)
        if not m:
            raise SystemExit(f"{f.name}: missing <!--meta {{...}} --> block")
        meta = json.loads(m.group(1))
        meta["body"] = text[m.end():]
        meta["src"] = f.name
        meta.setdefault("lang", "en")
        meta.setdefault("dir", "ltr")
        pages.append(meta)
    return pages


def asset_versions():
    vers = {}
    for p in (SRC / "static" / "assets").rglob("*"):
        if p.suffix in (".css", ".js"):
            rel = "/" + p.relative_to(SRC / "static").as_posix()
            vers[rel] = hashlib.sha1(p.read_bytes()).hexdigest()[:10]
    return vers


def ui_lang(page):
    return page["lang"] if page["lang"] in UI else "en"


def render_nav(page):
    menu = AR_TOOLS if ui_lang(page) == "ar" else TOOLS
    items = []
    for key, path, label in menu:
        cur = ' aria-current="page"' if page.get("nav") == key else ""
        lang_attr = {"ar": ' lang="ar" dir="rtl"', "ja": ' lang="ja"'}.get(TOOL_LANG.get(key), ' lang="en"')
        items.append(f'<li><a href="{path}"{cur}{lang_attr}>{html.escape(label)}</a></li>')
    return "\n".join(items)


def render_faq(page):
    faq = page.get("faq")
    if not faq:
        return ""
    t = UI[ui_lang(page)]
    rows = "\n".join(
        f'<details><summary>{html.escape(q)}</summary><div class="answer"><p>{a}</p></div></details>' for q, a in faq)
    return f'<h2 id="faq">{t["faq"]}</h2>\n<div class="faq">\n{rows}\n</div>'


def render_related(page):
    lang = ui_lang(page)
    own = page.get("id", page.get("nav"))
    if page.get("nav") == "exam":
        rel = [(k, n, d) for k, _, n, d in EXAMS if k != own] + [("home", "Age calculator (age as on any date)", "For any other exam: enter the cutoff date and the limits from the notice.")]
    else:
        rel = [r for r in RELATED[lang] if r[0] != own]
    paths = PATHS
    t = UI[lang]
    lis = "\n".join(
        f'<li><a href="{paths[k]}"><strong>{html.escape(n)}</strong><span>{html.escape(d)}</span></a></li>' for k, n, d in rel)
    return f'<h2>{t["related"]}</h2>\n<ul class="related">\n{lis}\n</ul>'


# Footer navigation: local tools are always first; tools in other languages
# have their own column so no visitor must navigate a mixed-language link list.
FOOTER_SECTIONS = {
    "en": {
        "local_title": "English calculators",
        "local": [("home", "Age calculator"), ("diff", "Age difference"),
                  ("chrono", "Chronological age"), ("exam", "Exam age limits")],
        "other_title": "Other languages",
        "other": [("ar", "العربية — حاسبة العمر"), ("ja", "日本語 — 年齢早見表"),
                  ("ne", "Nepali — Age calculator"), ("neconv", "Nepali — Date converter")],
        "site_title": "Explore Ageason",
        "foot_note": "Free tools · No account required",
    },
    "ar": {
        "local_title": "الحاسبات بالعربية",
        "local": [("ar", "حساب العمر"), ("arconv", "تحويل التاريخ"),
                  ("ardiff", "فرق العمر"), ("arages", "جدول الأعمار")],
        "other_title": "حاسبات بلغات أخرى",
        "other": [("home", "الإنجليزية — حاسبة العمر"), ("ja", "اليابانية — جدول الأعمار"),
                  ("ne", "النيبالية — حاسبة العمر"), ("neconv", "النيبالية — تحويل التاريخ")],
        "site_title": "تعرف على Ageason",
        "foot_note": "أدوات مجانية · لا تحتاج إلى تسجيل",
    },
    "ja": {
        "local_title": "日本語のツール",
        "local": [("ja", "年齢早見表"), ("gakunen", "学年早見表")],
        "other_title": "ほかの言語",
        "other": [("home", "英語 — 年齢計算"), ("ar", "アラビア語 — 年齢計算"),
                  ("ne", "ネパール暦 — 年齢計算"), ("neconv", "ネパール暦 — 日付変換")],
        "site_title": "サイト案内",
        "foot_note": "無料の計算ツール · 登録不要",
    },
    "ne": {
        "local_title": "Nepali calendar tools",
        "local": [("ne", "Nepali age calculator"), ("neconv", "Nepali date converter")],
        "other_title": "Other languages",
        "other": [("home", "English — Age calculator"), ("ar", "العربية — حاسبة العمر"),
                  ("ja", "日本語 — 年齢早見表")],
        "site_title": "Explore Ageason",
        "foot_note": "Free tools · No account required",
    }
}


def footer_navigation(page):
    lang = ui_lang(page)
    # Nepali calendar tools currently have English-language interfaces.
    group = "ne" if page.get("nav") in ("ne", "neconv") else lang
    config = FOOTER_SECTIONS[group]
    language_for_link = {"ar": "ar", "arconv": "ar", "ardiff": "ar", "arages": "ar",
                         "ja": "ja", "gakunen": "ja"}
    def render_links(entries):
        return "\n".join(
            '<li><a href="{}" lang="{}" hreflang="{}">{}</a></li>'.format(
                html.escape(PATHS[key], quote=True),
                "en" if group == "ne" else lang,
                language_for_link.get(key, "en"),
                html.escape(label))
            for key, label in entries
        )
    return {
        "local_heading": html.escape(config["local_title"]),
        "local_links": render_links(config["local"]),
        "other_heading": html.escape(config["other_title"]),
        "other_links": render_links(config["other"]),
        "site_heading": html.escape(config["site_title"]),
        "foot_note": html.escape(config["foot_note"]),
    }


def json_ld(page):
    url = abs_url(page["path"])
    graph = []
    if page["path"] == "/":
        graph.append({"@type": "WebSite", "@id": abs_url("/#website"), "name": SITE_NAME, "url": abs_url("/"),
                      "inLanguage": ["en", "ar", "ja"]})
    if page.get("kind") == "tool":
        graph.append({
            "@type": "WebApplication", "name": page.get("app_name", page["title"]), "url": url,
            "description": page["description"], "inLanguage": page["lang"],
            "applicationCategory": "UtilitiesApplication", "operatingSystem": "Any",
            "browserRequirements": "Requires JavaScript",
            "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
            "isAccessibleForFree": True,
        })
    else:
        graph.append({"@type": "WebPage", "name": page["title"], "url": url, "description": page["description"],
                      "inLanguage": page["lang"]})
    if page.get("faq"):
        graph.append({"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q,
             "acceptedAnswer": {"@type": "Answer", "text": re.sub(r"<[^>]+>", "", a)}} for q, a in page["faq"]]})
    home_path = "/ar/" if ui_lang(page) == "ar" else "/"
    if page["path"] != home_path:
        crumbs = page.get("breadcrumb") or [[UI[ui_lang(page)]["home"], home_path], [page.get("crumb", page["title"]), page["path"]]]
        if len(crumbs) >= 2:
            graph.append({"@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": i + 1, "name": n, "item": abs_url(p)} for i, (n, p) in enumerate(crumbs)]})
    return json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, indent=1)


def hreflang_links(page, pages):
    group = page.get("hreflang")
    if not group:
        return ""
    alts = [p for p in pages if p.get("hreflang") == group]
    out = [f'<link rel="alternate" hreflang="{p["lang"]}" href="{abs_url(p["path"])}">' for p in alts]
    default = next((p for p in alts if p.get("x_default")), None)
    if default:
        out.append(f'<link rel="alternate" hreflang="x-default" href="{abs_url(default["path"])}">')
    return "\n  ".join(out)


JA_ERAS = [("令和", 2019), ("平成", 1989), ("昭和", 1926), ("大正", 1912)]
JA_ETO = ["子（ね）", "丑（うし）", "寅（とら）", "卯（う）", "辰（たつ）", "巳（み）",
          "午（うま）", "未（ひつじ）", "申（さる）", "酉（とり）", "戌（いぬ）", "亥（い）"]
CHOJU = [("還暦", "かんれき", 61, "60歳（数え61歳）"), ("古希", "こき", 70, None), ("喜寿", "きじゅ", 77, None),
         ("傘寿", "さんじゅ", 80, None), ("米寿", "べいじゅ", 88, None), ("卒寿", "そつじゅ", 90, None),
         ("白寿", "はくじゅ", 99, None), ("百寿", "ひゃくじゅ", 100, None)]


def era_label(y):
    """Japanese era year(s) for a Gregorian year; change-over years show both, e.g. 平成31年／令和元年."""
    labels = []
    for name, start in JA_ERAS:
        if y >= start:
            n = y - start + 1
            labels.append(f"{name}{'元' if n == 1 else n}年")
            if y == start:
                continue
            break
    return "／".join(reversed(labels))


def japanese_table(year):
    """Rows for 年齢早見表: newest birth year first, 1926 onward."""
    rows = []
    for y in range(year, 1925, -1):
        after = year - y
        before = after - 1
        rows.append(
            f'<tr data-y="{y}"><td>{y}年</td><td>{era_label(y)}</td><td>{JA_ETO[(y - 4) % 12]}</td>'
            f'<td>{after}歳</td><td>{"—" if before < 0 else str(before) + "歳"}</td></tr>')
    return "\n".join(rows)


JA_ERA_STARTS = [("令和", dt.date(2019, 5, 1)), ("平成", dt.date(1989, 1, 8)), ("昭和", dt.date(1926, 12, 25)), ("大正", dt.date(1912, 7, 30))]


def era_of_date(d):
    for name, start in JA_ERA_STARTS:
        if d >= start:
            n = d.year - start.year + 1
            return f"{name}{'元' if n == 1 else n}年"
    return ""


GAKUNEN = [(-2, "年少"), (-1, "年中"), (0, "年長")] + [(g, f"小学{g}年生") for g in range(1, 7)] + \
          [(g, f"中学{g - 6}年生") for g in range(7, 10)] + [(g, f"高校{g - 9}年生") for g in range(10, 13)] + \
          [(g, f"大学{g - 12}年生") for g in range(13, 17)]


def gakunen_table(fy):
    """学年早見表 rows for school year fy: grade -> birth-date range (2 April to 1 April)."""
    rows = []
    for g, name in GAKUNEN:
        e = fy - g + 1                      # year of entering elementary school
        y1, y2 = e - 7, e - 6
        rows.append(f'<tr data-e="{e}"><td>{name}</td><td>{y1}年4月2日〜{y2}年4月1日</td>'
                    f'<td>{era_of_date(dt.date(y1, 4, 2))}4月2日〜{era_of_date(dt.date(y2, 4, 1))}4月1日</td></tr>')
    return "\n".join(rows)


# ---------------- Exam age limits ----------------
def load_exam(name):
    return json.loads((SRC / "data" / "exams" / f"{name}.json").read_text(encoding="utf-8"))


def fmt_date(d):
    return f"{d.day} {d.strftime('%b %Y')}"


def years_before(d, n):
    try:
        return d.replace(year=d.year - n)
    except ValueError:  # 29 Feb
        return d.replace(year=d.year - n, day=28)


def age_window(cutoff, min_age, max_age):
    """Indian notices: at least min_age and NOT YET max_age on the cutoff date (both ends inclusive)."""
    c = dt.date.fromisoformat(cutoff)
    return years_before(c, max_age) + dt.timedelta(days=1), years_before(c, min_age)


def exam_tool(name):
    rules = load_exam(name)
    sel = lambda i, label: f'<div class="x-row"><label class="select-field"><span>{label}</span><select id="{i}"></select></label></div>'
    return f"""<section class="tool" aria-label="{html.escape(rules['short'])} age limit calculator">
  <div class="wrap tool-grid">
    <form class="panel" id="calc" novalidate onsubmit="return false">
      {sel("x-cycle", "Exam")}
      {sel("x-band", "Post group")}
      {sel("x-cat", "Category")}
      {sel("x-entry", "Entry")}
      <p class="status-note" id="x-status"></p>
      <fieldset class="datefield" id="dob">
        <legend>Date of birth (as in your Class 10 certificate)</legend>
        <div class="dateparts">
          <label class="p-d"><span>Day</span><input type="text" inputmode="numeric" maxlength="2" placeholder="DD" data-part="d" autocomplete="bday-day"></label>
          <label class="p-m"><span>Month</span><input type="text" inputmode="numeric" maxlength="2" placeholder="MM" data-part="m" autocomplete="bday-month"></label>
          <label class="p-y"><span>Year</span><input type="text" inputmode="numeric" maxlength="4" placeholder="YYYY" data-part="y" autocomplete="bday-year"></label>
        </div>
        <p class="field-error" hidden></p>
      </fieldset>
    </form>
    <div class="result" id="result" data-state="empty" aria-live="polite">
      <p class="result-empty"><strong>Your eligibility will appear here</strong>Choose the exam and enter your date of birth.</p>
      <div class="result-body">
        <p class="age-caption" id="r-caption"></p>
        <p class="age-big conv-big verdict" id="r-verdict"></p>
        <p class="age-sub" id="r-sub"></p>
        <div class="callout" id="r-why"></div>
        <dl class="stats" id="r-stats"></dl>
        <div class="share-row"><button class="btn btn-tertiary" type="button" id="copy">Copy link to this result</button><span class="copied" aria-live="polite"></span></div>
      </div>
    </div>
  </div>
</section>
<script type="application/json" id="exam-rules">{json.dumps(rules, ensure_ascii=False)}</script>"""


def exam_table(name):
    rules = load_exam(name)
    out = []
    for c in rules["cycles"]:
        tag = "Official" if c["status"] == "official" else "Expected, not yet notified"
        src = f'<p class="hint">{html.escape(c.get("source") or c.get("note", ""))}</p>'
        out.append(f'<h3>{html.escape(c["label"])} <span class="tag {c["status"]}">{tag}</span></h3>{src}')
        if c["mode"] == "age":
            cut = dt.date.fromisoformat(c["cutoff"])
            if len(c["bands"]) == 1:
                b = c["bands"][0]
                rows = []
                for cat in c["cats"]:
                    f, t = age_window(c["cutoff"], b["min"], b["max"] + cat["relax"])
                    rows.append(f'<tr><td>{html.escape(cat["label"])}</td><td>{b["min"]} to under {b["max"] + cat["relax"]}</td><td class="nw">{fmt_date(f)} – {fmt_date(t)}</td></tr>')
                head = "<tr><th scope=col>Category</th><th scope=col>Age on " + fmt_date(cut) + "</th><th scope=col>Born between</th></tr>"
            else:
                rows = []
                for b in c["bands"]:
                    f, t = age_window(c["cutoff"], b["min"], b["max"])
                    rows.append(f'<tr><td>{html.escape(b["label"])}</td><td>{b["min"]} to under {b["max"]}</td><td class="nw">{fmt_date(f)} – {fmt_date(t)}</td></tr>')
                head = "<tr><th scope=col>Post group</th><th scope=col>Age on " + fmt_date(cut) + " (General)</th><th scope=col>Born between (General)</th></tr>"
            out.append(f'<div class="table-wrap auto"><table class="data wrap-cells"><thead>{head}</thead><tbody>{"".join(rows)}</tbody></table></div>')
            if len(c["bands"]) > 1:
                rel = ", ".join(f'{html.escape(x["label"])} +{x["relax"]}' for x in c["cats"] if x["relax"])
                out.append(f'<p class="hint">Upper age relaxation: {rel} years.</p>')
        else:
            rows = []
            for e in c["entries"]:
                f, t = dt.date.fromisoformat(e["from"]), dt.date.fromisoformat(e["to"])
                rows.append(f'<tr><td>{html.escape(e["label"])}</td><td class="nw">{fmt_date(f)} – {fmt_date(t)}</td><td>{html.escape(e.get("note", ""))}</td></tr>')
            out.append('<div class="table-wrap auto"><table class="data wrap-cells"><thead><tr><th scope=col>Entry</th><th scope=col>Born between (both dates included)</th><th scope=col>Who can apply</th></tr></thead>'
                       f'<tbody>{"".join(rows)}</tbody></table></div>')
    return "\n".join(out)


def exam_index():
    rows = "".join(f'<li><a href="{p}"><strong>{html.escape(n)}</strong><span>{html.escape(d)}</span></a></li>' for _, p, n, d in EXAMS)
    return f'<ul class="related">{rows}</ul>'


def choju_table(year):
    """長寿祝い rows: birth years celebrating this year, by 数え年 and by 満年齢."""
    rows = []
    for name, kana, kazoe, label in CHOJU:
        if name == "還暦":
            by_kazoe = by_man = year - 60
        else:
            by_kazoe, by_man = year - kazoe + 1, year - kazoe
        age = label or f"{kazoe}歳"
        rows.append(f'<tr><td><strong>{name}</strong>（{kana}）</td><td>{age}</td>'
                    f'<td>{by_kazoe}年（{era_label(by_kazoe)}）</td><td>{by_man}年（{era_label(by_man)}）</td></tr>')
    return "\n".join(rows)


# ---------------- Arabic age tables (Umm al-Qura 1300–1600 AH) ----------------
AR_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
HIJRI_EPOCH = dt.date(1882, 11, 12)  # 1 Muharram 1300 AH
# Year lengths (354 + bit) for 1300–1600 AH from Unicode ICU islamic-umalqura
HIJRI_BITS = (
    "0010101000101010001101000101000101010001010000110100010110000101000101100001101000011000011010000101"
    "0001011000011010001010000110100001010001010100011001001101000011000101010000110000110100010101000101"
    "00010110000110100001100001011000010100010110000110100010100010101000011000010110000111000010101000110"
)
HIJRI_STARTS = [HIJRI_EPOCH]
for _b in HIJRI_BITS:
    HIJRI_STARTS.append(HIJRI_STARTS[-1] + dt.timedelta(days=354 + int(_b)))


def hijri_year_span(hy):
    i = hy - 1300
    return HIJRI_STARTS[i], HIJRI_STARTS[i + 1] - dt.timedelta(days=1)


def hijri_year_of(d):
    return bisect_right(HIJRI_STARTS, d) + 1299


def ar_years(n):
    if n < 0:
        return "—"
    if n == 0:
        return "أقل من سنة"
    if n == 1:
        return "سنة واحدة"
    if n == 2:
        return "سنتان"
    if 3 <= (n % 100) <= 10:
        return f"{n} سنوات"
    return f"{n} سنة"


def ar_year_range(a, b, suffix):
    return f"{a} {suffix}" if a == b else f"{a}–{b} {suffix}"


def ar_hijri_table(h_year):
    rows = []
    for hy in range(h_year, max(1299, h_year - 101), -1):
        s, e = hijri_year_span(hy)
        after, before = h_year - hy, h_year - hy - 1
        rows.append(
            f'<tr data-hy="{hy}"><td>{hy} هـ</td><td>{ar_year_range(s.year, e.year, "م")}</td>'
            f'<td>{ar_years(after)}</td><td>{"—" if before < 0 else ar_years(before)}</td></tr>')
    return "\n".join(rows)


def ar_gregorian_table(g_year):
    rows = []
    for gy in range(g_year, g_year - 101, -1):
        d1, d2 = dt.date(gy, 1, 1), dt.date(gy, 12, 31)
        h_span = ar_year_range(hijri_year_of(d1), hijri_year_of(d2), "هـ") if d1 >= HIJRI_EPOCH else "خارج نطاق أم القرى"
        after, before = g_year - gy, g_year - gy - 1
        rows.append(
            f'<tr data-gy="{gy}"><td>{gy} م</td><td>{h_span}</td>'
            f'<td>{ar_years(after)}</td><td>{"—" if before < 0 else ar_years(before)}</td></tr>')
    return "\n".join(rows)


def page_html(page, pages, vers):
    lang = ui_lang(page)
    is_ar = lang == "ar"
    t = UI[lang]
    body = page["body"]
    reiwa = JA_TABLE_YEAR - 2018
    ar_hyear = hijri_year_of(BUILD_DATE)
    ar_gyear = BUILD_DATE.year
    tokens = {
        "{{SITE_NAME}}": SITE_NAME, "{{SITE_URL}}": SITE_URL, "{{CONTACT_EMAIL}}": CONTACT_EMAIL,
        "{{UPDATED_ISO}}": BUILD_DATE.isoformat(),
        "{{UPDATED}}": BUILD_DATE.strftime("%d %B %Y").lstrip("0"),
        "{{UPDATED_AR}}": f"{BUILD_DATE.day} {AR_MONTHS[BUILD_DATE.month - 1]} {BUILD_DATE.year}",
        "{{JA_YEAR}}": str(JA_TABLE_YEAR), "{{JA_REIWA}}": str(reiwa),
        "{{JA_FY}}": str(JA_FY), "{{JA_FY_REIWA}}": str(JA_FY - 2018),
        "{{AR_HYEAR}}": str(ar_hyear), "{{AR_GYEAR}}": str(ar_gyear),
        "{{AGE_H_1420}}": ar_years(ar_hyear - 1420), "{{AGE_H_1420_PRE}}": ar_years(ar_hyear - 1421),
        "{{AGE_G_1995}}": ar_years(ar_gyear - 1995), "{{AGE_G_1995_PRE}}": ar_years(ar_gyear - 1996),
    }
    def fill(text):
        for k, v in tokens.items():
            if k in text:
                text = text.replace(k, v)
        return text
    if page.get("faq"):
        page["faq"] = [[fill(q), fill(a)] for q, a in page["faq"]]
    repl = dict(tokens)
    repl.update({
        "{{FAQ}}": render_faq(page), "{{RELATED}}": render_related(page),
        "{{GAKUNEN_TABLE}}": gakunen_table(JA_FY) if "{{GAKUNEN_TABLE}}" in body else "",
        "{{JA_TABLE}}": japanese_table(JA_TABLE_YEAR) if "{{JA_TABLE}}" in body else "",
        "{{JA_CHOJU}}": choju_table(JA_TABLE_YEAR) if "{{JA_CHOJU}}" in body else "",
        "{{AR_HIJRI_TABLE}}": ar_hijri_table(ar_hyear) if "{{AR_HIJRI_TABLE}}" in body else "",
        "{{AR_GREG_TABLE}}": ar_gregorian_table(ar_gyear) if "{{AR_GREG_TABLE}}" in body else "",
        "{{EXAM_TOOL}}": exam_tool(page["exam"]) if page.get("exam") else "",
        "{{EXAM_TABLE}}": exam_table(page["exam"]) if page.get("exam") else "",
        "{{EXAM_INDEX}}": exam_index() if "{{EXAM_INDEX}}" in body else "",
    })
    for k, v in repl.items():
        body = body.replace(k, v)
    title, desc = fill(page["title"]), fill(page["description"])
    page["title_rendered"], page["description"] = title, desc
    full_title = title if page.get("no_suffix") else f"{title} | {SITE_NAME}"
    url = abs_url(page["path"])
    og_img = abs_url("/assets/img/" + page.get("og", "og-home.png"))
    og_locale = {"en": "en_US", "ar": "ar_SA", "ja": "ja_JP"}.get(page["lang"], "en_US")
    scripts = "\n".join(f'<script src="{s}?v={vers.get(s, "1")}" defer></script>'
                        for s in ["/assets/js/" + n for n in page.get("scripts", [])])
    preload = ['<link rel="preload" href="/assets/fonts/ibm-plex-sans-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>']
    if page["lang"] == "ar":
        preload.append('<link rel="preload" href="/assets/fonts/ibm-plex-sans-arabic-arabic-400-normal.woff2" as="font" type="font/woff2" crossorigin>')
    robots = "noindex, follow" if page.get("noindex") else "index, follow, max-image-preview:large"
    adsense = (f'<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-{ADSENSE_PUB_ID}" crossorigin="anonymous"></script>'
               if ADSENSE_PUB_ID and not page.get("noindex") else "")
    canonical = "" if page.get("noindex") else f'<link rel="canonical" href="{url}">'
    css = f'/assets/css/site.css?v={vers.get("/assets/css/site.css", "1")}'
    # Ageason Design V2 is site-wide. Main landing pages retain a larger hero;
    # specialty calculators, tables and informational pages use a compact variant.
    is_primary_landing = page.get("nav") in ("home", "ar") and page.get("kind") == "tool"
    landing_css = f'<link rel="stylesheet" href="/assets/css/landing.css?v={vers.get("/assets/css/landing.css", "1")}">'
    body_class = ' class="landing-v2"' if is_primary_landing else ' class="landing-v2 inner-v2"'
    footer = footer_navigation(page)
    brand_href = "/ar/" if is_ar else "/"
    site_prefix = "/ar" if is_ar else ""

    return f"""<!doctype html>
<html lang="{page['lang']}" dir="{page['dir']}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(full_title)}</title>
  <meta name="description" content="{html.escape(desc)}">
  <meta name="robots" content="{robots}">
  {canonical}
  {hreflang_links(page, pages)}
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="{html.escape(SITE_NAME)}">
  <meta property="og:title" content="{html.escape(title)}">
  <meta property="og:description" content="{html.escape(desc)}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{og_img}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:locale" content="{og_locale}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#161616" media="(prefers-color-scheme: dark)">
  <link rel="icon" href="/favicon.ico" sizes="32x32">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  {chr(10).join("  " + x for x in preload).strip()}
  <link rel="stylesheet" href="{css}">
  {landing_css}
  <script type="application/ld+json">
{json_ld(page)}
  </script>
  {adsense}
</head>
<body{body_class}>
<a class="skip-link" href="#main">{t['skip']}</a>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="{brand_href}" lang="en">{BRAND_SVG}<span>{html.escape(SITE_NAME)}</span></a>
    <nav class="tool-nav" aria-label="{t['tools']}">
      <ul>
{render_nav(page)}
      </ul>
    </nav>
  </div>
</header>
<main id="main">
{body.strip()}
</main>
<footer class="site-footer footer-v2">
  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-brand-column">
        <a class="footer-brand" href="{brand_href}" lang="en">{BRAND_SVG}<span>{html.escape(SITE_NAME)}</span></a>
        <p class="footer-description">{t['tagline']}</p>
      </div>
      <nav class="footer-column" aria-label="{footer['local_heading']}">
        <h2>{footer['local_heading']}</h2>
        <ul>
{footer['local_links']}
        </ul>
      </nav>
      <nav class="footer-column" aria-label="{footer['other_heading']}">
        <h2>{footer['other_heading']}</h2>
        <ul>
{footer['other_links']}
        </ul>
      </nav>
      <nav class="footer-column" aria-label="{footer['site_heading']}">
        <h2>{footer['site_heading']}</h2>
        <ul>
          <li><a href="{site_prefix}/about/">{t['about']}</a></li>
          <li><a href="{site_prefix}/privacy/">{t['privacy']}</a></li>
          <li><a href="{site_prefix}/terms/">{t['terms']}</a></li>
          <li><a href="{site_prefix}/contact/">{t['contact']}</a></li>
          <li><a href="{('/ar/#faq' if is_ar else '/ja/#faq' if lang == 'ja' else '/#faq')}">{t['faq']}</a></li>
        </ul>
      </nav>
    </div>
    <div class="footer-bottom">
      <p class="footer-base" lang="en">© {BUILD_DATE.year} {html.escape(SITE_NAME)}. All rights reserved.</p>
      <p class="footer-note">{footer['foot_note']}</p>
    </div>
  </div>
</footer>
<script>/* phones: scroll the current page's tab into view in the sideways menu */(function(){{var n=document.querySelector('.tool-nav'),a=n&&n.querySelector('[aria-current]');if(n&&n.scrollWidth>n.clientWidth+1)n.classList.add('is-scrolling');if(a&&n.scrollWidth>n.clientWidth){{n.scrollLeft+=a.getBoundingClientRect().left-n.getBoundingClientRect().left-(n.clientWidth-a.offsetWidth)/2;}}}})();</script>
{scripts}
</body>
</html>
"""


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="\n")


def main():
    if "example.com" in SITE_URL:
        print("WARNING: SITE_URL is still the placeholder. Set your domain in build.py before deploying.")
    if CONTACT_EMAIL.lower().endswith("@example.com"):
        print("WARNING: CONTACT_EMAIL is a placeholder. Set up a real mailbox before going live.")
    if OUT.exists():
        shutil.rmtree(OUT)
    shutil.copytree(SRC / "static", OUT)
    vers = asset_versions()
    pages = load_pages()

    for page in pages:
        out = OUT / (page.get("out") or (page["path"].strip("/") + "/index.html").lstrip("/"))
        write(out, page_html(page, pages, vers))

    # ---- sitemap.xml (with hreflang alternates) ----
    urls = []
    for p in pages:
        if p.get("noindex"):
            continue
        alts = ""
        if p.get("hreflang"):
            group = [q for q in pages if q.get("hreflang") == p["hreflang"]]
            alts = "".join(f'\n    <xhtml:link rel="alternate" hreflang="{q["lang"]}" href="{abs_url(q["path"])}"/>' for q in group)
            xd = next((q for q in group if q.get("x_default")), None)
            if xd:
                alts += f'\n    <xhtml:link rel="alternate" hreflang="x-default" href="{abs_url(xd["path"])}"/>'
        urls.append(f"  <url>\n    <loc>{abs_url(p['path'])}</loc>\n    <lastmod>{BUILD_DATE.isoformat()}</lastmod>"
                    f"\n    <changefreq>{p.get('changefreq', 'monthly')}</changefreq>\n    <priority>{p.get('priority', '0.5')}</priority>{alts}\n  </url>")
    write(OUT / "sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n'
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
          + "\n".join(urls) + "\n</urlset>\n")

    # ---- robots.txt ----
    write(OUT / "robots.txt", f"User-agent: *\nAllow: /\n\nSitemap: {abs_url('/sitemap.xml')}\n")

    # ---- ads.txt ----
    if ADSENSE_PUB_ID:
        ads = f"google.com, {ADSENSE_PUB_ID}, DIRECT, f08c47fec0942fa0\n"
    else:
        ads = ("# Add your AdSense line here once approved, e.g.\n"
               "# google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n"
               "# (Set ADSENSE_PUB_ID in build.py and rebuild to fill this in automatically.)\n")
    write(OUT / "ads.txt", ads)

    # ---- llms.txt (plain summary for AI crawlers) ----
    lines = [f"# {SITE_NAME}", "",
             "> Free age and date calculators in English, Arabic, Japanese and for the Nepali (Bikram Sambat) calendar. "
             "All calculations run in the browser.", "", "## Calculators", ""]
    for p in sorted(pages, key=lambda q: -float(q.get("priority", 0))):
        if p.get("kind") == "tool":
            lines.append(f"- [{p['title_rendered']}]({abs_url(p['path'])}): {p['description']}")
    lines += ["", "## About", "", f"- [About]({abs_url('/about/')})", f"- [Privacy]({abs_url('/privacy/')})",
              f"- [من نحن]({abs_url('/ar/about/')})", f"- [سياسة الخصوصية]({abs_url('/ar/privacy/')})", ""]
    write(OUT / "llms.txt", "\n".join(lines))

    # ---- web manifest ----
    write(OUT / "site.webmanifest", json.dumps({
        "name": f"{SITE_NAME} age calculators", "short_name": SITE_NAME, "start_url": "/", "display": "standalone",
        "background_color": "#ffffff", "theme_color": "#0f62fe",
        "icons": [{"src": "/assets/img/icon-192.png", "sizes": "192x192", "type": "image/png"},
                  {"src": "/assets/img/icon-512.png", "sizes": "512x512", "type": "image/png"},
                  {"src": "/assets/img/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}],
    }, ensure_ascii=False, indent=2))

    # ---- Cloudflare Pages headers ----
    write(OUT / "_headers", """/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
  X-Frame-Options: SAMEORIGIN

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/*.html
  Cache-Control: public, max-age=0, must-revalidate
""")
    print(f"Built {len(pages)} pages into {OUT}")


if __name__ == "__main__":
    main()
