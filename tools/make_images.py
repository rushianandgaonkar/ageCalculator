#!/usr/bin/env python3
"""
Renders favicon, app icons and social-share (Open Graph) images into src/static.
Needs: pip install playwright pillow  &&  playwright install chromium
Run again after changing SITE_NAME in build.py, then run build.py.
"""
import sys
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import build  # noqa: E402  (reads SITE_NAME and BRAND_SVG)

STATIC = ROOT / "src" / "static"
IMG = STATIC / "assets" / "img"
FONTS = (STATIC / "assets" / "fonts").as_uri()

OG = [
    ("og-home.png", "en", "ltr", "Age calculator", "Exact age in years, months and days, on any date"),
    ("og-ar.png", "ar", "rtl", "حساب العمر بالهجري والميلادي", "احسب عمرك بالسنوات والأشهر والأيام"),
    ("og-ja.png", "ja", "ltr", "年齢早見表", "満年齢・和暦・干支がひと目でわかる"),
    ("og-ne.png", "en", "ltr", "Nepali age calculator", "Age in Bikram Sambat (BS) and AD"),
    ("og-chrono.png", "en", "ltr", "Chronological age calculator", "Years;months;days for test scoring"),
    ("og-neconv.png", "en", "ltr", "Nepali date converter", "BS to AD and AD to BS, with today's Nepali date"),
    ("og-diff.png", "en", "ltr", "Age difference calculator", "The exact age gap between two people"),
    ("og-ardiff.png", "ar", "rtl", "حساب فرق العمر بين شخصين", "بالسنوات والأشهر والأيام، هجري وميلادي"),
    ("og-arconv.png", "ar", "rtl", "تحويل التاريخ هجري ميلادي", "التحويل في الاتجاهين وفق تقويم أم القرى"),
    ("og-arages.png", "ar", "rtl", "جدول الأعمار بالهجري والميلادي", "اعرف عمرك حسب سنة الميلاد لمئة عام"),
    ("og-gakunen.png", "ja", "ltr", "学年早見表", "生年月日から学年と入学・卒業年がわかる"),
    ("og-exam.png", "en", "ltr", "Exam age limit calculators", "UPSC, SSC, NDA, CDS and Agniveer, by date of birth"),
]

FONT_CSS = f"""
@font-face {{ font-family: Plex; font-weight: 300; src: url('{FONTS}/ibm-plex-sans-latin-300-normal.woff2'); }}
@font-face {{ font-family: Plex; font-weight: 400; src: url('{FONTS}/ibm-plex-sans-latin-400-normal.woff2'); }}
@font-face {{ font-family: Plex; font-weight: 600; src: url('{FONTS}/ibm-plex-sans-latin-600-normal.woff2'); }}
@font-face {{ font-family: PlexAr; font-weight: 300; src: url('{FONTS}/ibm-plex-sans-arabic-arabic-300-normal.woff2'); }}
@font-face {{ font-family: PlexAr; font-weight: 400; src: url('{FONTS}/ibm-plex-sans-arabic-arabic-400-normal.woff2'); }}
body {{ margin: 0; font-family: Plex, PlexAr, 'Noto Sans CJK JP', sans-serif; }}
"""


def og_html(lang, direction, title, sub):
    segs = "".join(f'<span class="{"f" if i < 7 else ("p" if i == 7 else "")}"></span>' for i in range(12))
    return f"""<!doctype html><html lang="{lang}" dir="{direction}"><head><meta charset="utf-8"><style>{FONT_CSS}
    .c {{ width: 1200px; height: 630px; box-sizing: border-box; padding: 72px 80px; background: #fff; color: #161616;
          display: flex; flex-direction: column; justify-content: space-between; border-top: 12px solid #0f62fe; }}
    .brand {{ display: flex; align-items: center; gap: 14px; font: 600 30px Plex; direction: ltr; }}
    .brand svg {{ width: 44px; height: 44px; }}
    h1 {{ font-weight: 300; font-size: {"88" if len(title) < 22 else "68"}px; line-height: 1.12; margin: 0 0 18px; letter-spacing: -0.5px; }}
    :lang(ja) h1 {{ font-weight: 400; }}
    p {{ font-size: 34px; color: #525252; margin: 0; }}
    .ruler {{ display: grid; grid-template-columns: repeat(12, 1fr); gap: 6px; height: 22px; direction: ltr; }}
    .ruler span {{ background: #e0e0e0; }} .ruler .f {{ background: #0f62fe; }}
    .ruler .p {{ background: linear-gradient(90deg, #0f62fe 45%, #e0e0e0 45%); }}
    </style></head><body><div class="c">
      <div class="brand">{build.BRAND_SVG}<span>{build.SITE_NAME}</span></div>
      <div><h1>{title}</h1><p>{sub}</p></div>
      <div class="ruler">{segs}</div>
    </div></body></html>"""


def icon_html(size, maskable=False, bg=None):
    pad = int(size * (0.18 if maskable else 0.06))
    bg = bg or ("#0f62fe" if maskable else "transparent")
    return f"""<!doctype html><html><head><style>html,body{{margin:0;background:{bg}}}
    div{{width:{size}px;height:{size}px;box-sizing:border-box;padding:{pad}px}} svg{{width:100%;height:100%}}</style></head>
    <body><div>{build.BRAND_SVG}</div></body></html>"""


def main():
    IMG.mkdir(parents=True, exist_ok=True)
    (STATIC / "favicon.svg").write_text(build.BRAND_SVG.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '), encoding="utf-8")
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1200, "height": 630}, device_scale_factor=1)
        for name, lang, d, title, sub in OG:
            pg.set_content(og_html(lang, d, title, sub))
            pg.wait_for_timeout(300)
            pg.screenshot(path=str(IMG / name))
        for size, name, mask in [(180, "apple-touch-icon.png", False), (192, "icon-192.png", False),
                                 (512, "icon-512.png", False), (512, "icon-maskable-512.png", True), (64, "fav-64.png", False)]:
            pg.set_viewport_size({"width": size, "height": size})
            apple = name == "apple-touch-icon.png"
            pg.set_content(icon_html(size, mask, "#ffffff" if apple else None))
            target = STATIC / name if apple else IMG / name
            pg.screenshot(path=str(target), omit_background=not (mask or apple))
        b.close()
    fav = Image.open(IMG / "fav-64.png")
    fav.save(STATIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    (IMG / "fav-64.png").unlink()
    print("Images written to", STATIC)


if __name__ == "__main__":
    main()
