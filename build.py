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
SITE_URL = "https://www.ageason.com"     # Canonical domain (enable after purchase and DNS setup)
SITE_NAME = "Ageason"                      # Public brand
CONTACT_EMAIL = "info@ageason.com"        # <-- shown on the contact page
ADSENSE_PUB_ID = ""                        # e.g. "pub-1234567890123456" (fills ads.txt + ad script)
GOOGLE_SITE_VERIFICATION = "tuYlfj3YHw96MOt78BtkEj36livlQ0tqAvIgtF8rMT4"
GOOGLE_TAG_ID = "GTM-PW9WRK2J"
BUILD_DATE = dt.date.today()
JA_TABLE_YEAR = BUILD_DATE.year            # set to next year in late December for the 年齢早見表 rush
JA_FY = BUILD_DATE.year if BUILD_DATE.month >= 4 else BUILD_DATE.year - 1   # Japanese school year (年度) for 学年早見表
# ====================================================================

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
OUT = ROOT / "public"

TOOLS = [  # top menu, in order; label is in the tool's own language
    ("home",     "/",                              "Age calculator"),
    ("days",     "/days-between-dates/",           "Days between dates"),
    ("datecalc", "/date-calculator/",             "Date calculator"),
    ("bizdays",  "/business-days-calculator/",    "Business days"),
    ("diff",     "/age-difference/",               "Age difference"),
    ("chrono",   "/chronological-age-calculator/", "Chronological age"),
    ("exam",     "/age-limit/",                    "Exam age limits"),
    ("ar",       "/ar/",                           "حساب العمر"),
    ("ja",       "/ja/",                           "年齢早見表"),
    ("ne",       "/nepali-age-calculator/",        "Nepali age"),
    ("neconv",   "/nepali-date-converter/",        "Nepali date"),
]
EXAMS = [("upsc", "/age-limit/upsc/", "UPSC age limit", "Civil Services: 21 to under 32 on 1 August, plus category relaxation and attempts."),
         ("ssc", "/age-limit/ssc/", "SSC age limit", "SSC GD (18 to 23) and CGL post groups (18 to 27 or 18 to 32), with relaxation."),
         ("nda", "/age-limit/nda/", "NDA age limit", "Birth date windows for NDA (I) and (II), for men and women."),
         ("cds", "/age-limit/cds/", "CDS age limit", "IMA, INA, AFA and OTA birth date windows, including the CPL relaxation."),
         ("agniveer", "/age-limit/agniveer/", "Agniveer age limit", "Army Agniveer and Air Force Agniveervayu birth date windows.")]
# every calculator page (menu items plus sub-pages), used by the footer and "related" lists
ALL_TOOLS = [
    ("home",       "/",                              "Age calculator"),
    ("days",       "/days-between-dates/",           "Days between dates"),
    ("datecalc",   "/date-calculator/",             "Date calculator"),
    ("bizdays",    "/business-days-calculator/",    "Business days"),
    ("experience", "/experience-calculator/",       "Experience calculator"),
    ("birthyear",  "/birth-year-calculator/",       "Birth year calculator"),
    ("catage",     "/cat-age-calculator/",           "Cat age"),
    ("dogage",     "/dog-age-calculator/",           "Dog age"),
    ("generation", "/generation-calculator/",        "Generation calculator"),
    ("diff",       "/age-difference/",               "Age difference"),
    ("chrono",     "/chronological-age-calculator/", "Chronological age"),
    ("exam",       "/age-limit/",                    "Exam age limits"),
    ("ar",         "/ar/",                           "حساب العمر"),
    ("artoday",    "/ar/today/",                     "التاريخ اليوم"),
    ("arcalendar", "/ar/calendar/",                 "التقويم الهجري"),
    ("arramadan",  "/ar/ramadan/",                  "كم باقي على رمضان"),
    ("areid",      "/ar/eid/",                      "كم باقي على العيد"),
    ("arconv",     "/ar/hijri-converter/",           "تحويل التاريخ"),
    ("ardiff",     "/ar/age-difference/",            "فرق العمر"),
    ("arages",     "/ar/ages/",                      "جدول الأعمار"),
    ("ja",         "/ja/",                           "年齢早見表"),
    ("gakunen",    "/ja/gakunen/",                   "学年早見表"),
    ("jadays",     "/ja/days/",                      "日数計算"),
    ("jaera",      "/ja/era/",                       "西暦和暦早見表"),
    ("ne",         "/nepali-age-calculator/",        "Nepali age"),
    ("neconv",     "/nepali-date-converter/",        "Nepali date"),
    ("trhome",     "/tr/",                           "Yaş hesaplama"),
    ("trdate",     "/tr/tarih-hesaplama/",           "Tarih ve gün hesaplama"),
    ("trhijri",    "/tr/hicri-takvim/",              "Hicri takvim"),
    ("dehome",     "/de/",                           "Altersrechner"),
    ("dedate",     "/de/datumsrechner/",             "Datumsrechner"),
    ("idhome",     "/id/",                           "Kalkulator umur"),
    ("iddate",     "/id/hitung-hari/",               "Hitung hari"),
    ("idhijri",    "/id/kalender-hijriyah/",         "Kalender Hijriyah"),
    ("pthome",     "/pt/",                           "Calculadora de idade"),
    ("ptdate",     "/pt/calculadora-de-dias/",       "Calculadora de dias"),
    ("kohome",     "/ko/",                           "만 나이 계산기"),
    ("kodate",     "/ko/date/",                      "날짜 계산기"),
]
DE_NAV = [("dehome", "/de/", "Altersrechner"), ("dedate", "/de/datumsrechner/", "Datumsrechner")]
ID_NAV = [("idhome", "/id/", "Kalkulator umur"), ("iddate", "/id/hitung-hari/", "Hitung hari"),
          ("idhijri", "/id/kalender-hijriyah/", "Kalender Hijriyah")]
PT_NAV = [("pthome", "/pt/", "Calculadora de idade"), ("ptdate", "/pt/calculadora-de-dias/", "Calculadora de dias")]
KO_NAV = [("kohome", "/ko/", "만 나이 계산기"), ("kodate", "/ko/date/", "날짜 계산기")]
TR_NAV = [
    ("trhome",  "/tr/",                  "Yaş hesaplama"),
    ("trdate",  "/tr/tarih-hesaplama/",  "Tarih hesaplama"),
    ("trhijri", "/tr/hicri-takvim/",     "Hicri takvim"),
]
TR_TOOLS = [
    ("trhome",  "/tr/",                  "Yaş hesaplama"),
    ("trdate",  "/tr/tarih-hesaplama/",  "Tarih ve gün hesaplama"),
    ("trhijri", "/tr/hicri-takvim/",     "Hicri takvim"),
]
AR_NAV = [
    ("ar",     "/ar/",                 "حساب العمر"),
    ("arconv", "/ar/hijri-converter/", "تحويل التاريخ"),
    ("ardiff", "/ar/age-difference/",  "فرق العمر"),
    ("arages", "/ar/ages/",            "جدول الأعمار"),
]
AR_TOOLS = [
    ("ar",         "/ar/",                 "حساب العمر"),
    ("artoday",    "/ar/today/",           "التاريخ اليوم"),
    ("arcalendar", "/ar/calendar/",        "التقويم الهجري"),
    ("arramadan",  "/ar/ramadan/",         "كم باقي على رمضان"),
    ("areid",      "/ar/eid/",             "كم باقي على العيد"),
    ("arconv",     "/ar/hijri-converter/", "تحويل التاريخ"),
    ("ardiff",     "/ar/age-difference/",  "فرق العمر"),
    ("arages",     "/ar/ages/",            "جدول الأعمار"),
]
PATHS = {k: p for k, p, _ in ALL_TOOLS}
PATHS.update({k: p for k, p, _ in AR_TOOLS})
PATHS.update({k: p for k, p, _, _ in EXAMS})
TOOL_LANG = {
    "ar": "ar", "artoday": "ar", "arcalendar": "ar", "arramadan": "ar", "areid": "ar",
    "ardiff": "ar", "arconv": "ar", "arages": "ar",
    "ja": "ja", "gakunen": "ja", "jadays": "ja", "jaera": "ja",
    "trhome": "tr", "trdate": "tr", "trhijri": "tr",
    "dehome": "de", "dedate": "de", "idhome": "id", "iddate": "id", "idhijri": "id",
    "pthome": "pt", "ptdate": "pt", "kohome": "ko", "kodate": "ko",
}
# per-language home page and header menu (English is the fallback)
HOME_PATH = {"ar": "/ar/", "ja": "/ja/", "tr": "/tr/", "de": "/de/", "id": "/id/", "pt": "/pt/", "ko": "/ko/"}
JA_NAV = [("ja", "/ja/", "年齢早見表"), ("gakunen", "/ja/gakunen/", "学年早見表"),
          ("jadays", "/ja/days/", "日数計算"), ("jaera", "/ja/era/", "西暦和暦早見表")]
LANG_NAV = {"ar": AR_NAV, "tr": TR_NAV, "de": DE_NAV, "id": ID_NAV, "pt": PT_NAV, "ko": KO_NAV, "ja": JA_NAV}
# English header: grouped dropdown menus (key, label, intro, tool keys); names and blurbs come from RELATED["en"] and EXAMS
NAV_GROUPS = [
    ("age", "Age", "Exact age, age gaps and the milestones in between.",
     ["home", "chrono", "diff", "birthyear", "generation", "experience"]),
    ("dates", "Dates", "Count days, add dates and find working days.", ["days", "datecalc", "bizdays"]),
    ("pets", "Pets", "Your dog’s or cat’s age in human years.", ["dogage", "catage"]),
    ("exams", "Exams", "Age limits for Indian government exams, checked by date of birth.",
     ["exam", "upsc", "ssc", "nda", "cds", "agniveer"]),
]
# Language switcher: (id, home path, native name, flag file or None, lang attribute).
# Arabic and English span many countries, so they get no flag.
LANGS = [
    ("en", "/", "English", None, "en"),
    ("ar", "/ar/", "العربية", None, "ar"),
    ("de", "/de/", "Deutsch", "de", "de"),
    ("id", "/id/", "Bahasa Indonesia", "id", "id"),
    ("ja", "/ja/", "日本語", "jp", "ja"),
    ("ko", "/ko/", "한국어", "kr", "ko"),
    ("pt", "/pt/", "Português (Brasil)", "br", "pt"),
    ("tr", "/tr/", "Türkçe", "tr", "tr"),
    ("ne", "/nepali-age-calculator/", "Nepali calendar", "np", "en"),
]
LANG_FLAG = {code: flag for code, _, _, flag, _ in LANGS}
KEY_FLAG = {"ne": "np", "neconv": "np"}  # tool keys whose flag isn't their UI language's

RELATED = {
    "en": [
        ("home", "Age calculator", "Exact age in years, months and days, on any date. Checks exam age limits."),
        ("days", "Days between dates", "Calculate the exact number of days, weeks, months and business days between two dates."),
        ("datecalc", "Date calculator", "Add or subtract days, weeks, months or years from any calendar date."),
        ("bizdays", "Business days calculator", "Calculate working days between two dates or add business days to a date."),
        ("experience", "Experience calculator", "Calculate total work experience in years, months and days across multiple employments with career gap tracking."),
        ("birthyear", "Birth year calculator", "Determine your birth year from age or calculate total days and hours alive with life milestones."),
        ("catage", "Cat age calculator", "Calculate your cat’s exact age in human years using veterinary guidelines."),
        ("dogage", "Dog age calculator", "Calculate your dog’s age in human years based on size and weight."),
        ("generation", "Generation calculator", "Find your generation name, age range and birth years."),
        ("diff", "Age difference calculator", "The exact time span between two people in years, months and days."),
        ("chrono", "Chronological age calculator", "Years;months;days for clinical scoring, with adjustment for prematurity."),
        ("exam", "Exam age limit calculators", "UPSC, SSC, NDA, CDS and Agniveer eligibility by date of birth."),
        ("ar", "حساب العمر بالهجري والميلادي", "Date breakdown in Arabic with Hijri (Umm al Qura) and Gregorian calendars."),
        ("ja", "年齢早見表", "Japanese age chart by Reiwa, Heisei and Showa year, with zodiac animal."),
        ("ne", "Nepali age calculator", "Age in Bikram Sambat and AD from a BS or AD date of birth."),
        ("neconv", "Nepali date converter", "Convert BS dates to AD and AD to BS, with today's Nepali date."),
    ],
    "ar": [
        ("ar", "حساب العمر بالهجري والميلادي", "احسب عمرك بالسنوات والأشهر والأيام بالتقويمين الهجري والميلادي."),
        ("artoday", "التاريخ الهجري اليوم", "اعرف تاريخ اليوم بالهجري والميلادي مع المناسبات الإسلامية القادمة."),
        ("arcalendar", "التقويم الهجري", "عرض تقويم أم القرى لجميع أشهر السنة الهجرية وما يقابلها بالميلادي."),
        ("arramadan", "كم باقي على رمضان", "العداد التنازلي المباشر لمعرفة الوقت المتبقي لبداية شهر رمضان المبارك."),
        ("areid", "كم باقي على العيد", "العداد التنازلي المباشر لعيد الفطر المبارك وعيد الأضحى لعام 1448 هـ."),
        ("arconv", "تحويل التاريخ من هجري إلى ميلادي", "حوّل أي تاريخ بين التقويم الهجري (أم القرى) والميلادي مع جدول أشهر السنة."),
        ("ardiff", "حساب فرق العمر بين شخصين", "اعرف فرق العمر بين شخصين بالهجري والميلادي."),
        ("arages", "جدول الأعمار بالهجري والميلادي", "اعرف عمر مواليد أي سنة هجرية أو ميلادية من جدول 100 عام."),
    ],
    "ja": [
        ("ja", "年齢早見表", "生まれ年ごとの満年齢・和暦・干支と長寿祝いの早見表。"),
        ("gakunen", "学年早見表", "生年月日から今年度の学年と入学・卒業年がわかります。"),
        ("jadays", "日数計算", "2つの日付の間の日数や、指定日数の何日後・何日前を計算。"),
        ("jaera", "西暦和暦変換・早見表", "西暦と和暦の相互変換、満年齢と数え年、厄年早見表。"),
        ("home", "Age calculator (English)", "英語版の年齢計算。任意の日付時点の年齢を計算できます。"),
        ("ar", "حساب العمر", "アラビア語版。ヒジュラ暦と西暦で年齢を計算します。"),
        ("ne", "Nepali age calculator", "ネパール暦（ビクラム暦）で年齢を計算します。"),
        ("chrono", "Chronological age calculator", "心理検査などで使う生活年齢（年;月;日）を計算します。"),
    ],
    "tr": [
        ("trhome", "Yaş hesaplama", "Doğum tarihinize göre tam yaşınızı, sonraki doğum gününüzü ve burcunuzu hesaplayın."),
        ("trdate", "Tarih ve gün hesaplama", "İki tarih arasındaki gün sayısını hesaplayın veya tarihe gün ekleyin."),
        ("trhijri", "Hicri takvim ve dönüştürücü", "Bugünün hicri tarihini öğrenin ve miladi ile hicri tarihleri dönüştürün."),
    ],
    "de": [
        ("dehome", "Altersrechner", "Genaues Alter in Jahren, Monaten und Tagen, mit Sternzeichen und Geburtstags-Countdown."),
        ("dedate", "Datumsrechner und Tagerechner", "Tage zwischen zwei Daten, Arbeitstage und Tage zu einem Datum addieren."),
        ("home", "Age calculator (Englisch)", "Englische Version des Altersrechners für jedes Stichtagsdatum."),
    ],
    "id": [
        ("idhome", "Kalkulator umur", "Hitung umur dalam tahun, bulan dan hari, lengkap dengan zodiak dan ulang tahun berikutnya."),
        ("iddate", "Hitung hari dan kalkulator tanggal", "Selisih hari antara dua tanggal, hari kerja dan tambah atau kurangi hari."),
        ("idhijri", "Kalender Hijriyah", "Tanggal hijriyah hari ini dan konversi tanggal masehi ke hijriyah."),
    ],
    "pt": [
        ("pthome", "Calculadora de idade", "Idade exata em anos, meses e dias, com signo e contagem para o aniversário."),
        ("ptdate", "Calculadora de dias e datas", "Dias entre duas datas, dias úteis e soma ou subtração de dias."),
        ("home", "Age calculator (inglês)", "Versão em inglês da calculadora de idade em qualquer data."),
    ],
    "ko": [
        ("kohome", "만 나이 계산기", "생년월일로 만 나이, 연 나이, 세는나이와 띠를 계산합니다."),
        ("kodate", "날짜 및 디데이 계산기", "두 날짜 사이 일수, 100일 단위 기념일과 영업일을 계산합니다."),
        ("ja", "年齢早見表 (일본어)", "일본어 연령 조견표와 연호별 나이."),
    ],
}

UI = {
    "en": {
        "skip": "Skip to calculator", "tools": "Calculators", "site": "Site",
        "about": "About", "privacy": "Privacy", "terms": "Terms", "contact": "Contact",
        "tagline": "Free date and age calculators in several languages and calendars. Everything is calculated in your browser; nothing you enter is sent or stored.",
        "faq": "Frequently asked questions", "related": "Other calculators", "updated": "Last updated",
        "home": "Home", "theme": "Dark mode", "language": "Language",
    },
    "ar": {
        "skip": "انتقل إلى الحاسبة", "tools": "الحاسبات", "site": "الموقع",
        "about": "من نحن", "privacy": "الخصوصية", "terms": "الشروط", "contact": "اتصل بنا",
        "tagline": "حاسبات مجانية للتاريخ والعمر بالتقويمين الهجري والميلادي. تتم جميع العمليات داخل متصفحك، ولا يُرسل أو يُحفظ أي شيء تدخله.",
        "faq": "أسئلة شائعة", "related": "حاسبات أخرى", "updated": "آخر تحديث",
        "home": "الرئيسية", "theme": "الوضع الداكن", "language": "اللغة",
    },
    "ja": {
        "skip": "計算フォームへ移動", "tools": "計算ツール", "site": "サイト情報",
        "about": "About（英語）", "privacy": "プライバシー（英語）", "terms": "利用規約（英語）", "contact": "お問い合わせ（英語）",
        "tagline": "多言語・多暦対応の無料年齢計算ツール。計算はすべてブラウザ内で行われ、入力内容が送信・保存されることはありません。",
        "faq": "よくある質問", "related": "ほかの計算ツール", "updated": "最終更新",
        "home": "ホーム", "theme": "ダークモード", "language": "言語",
    },
    "tr": {
        "skip": "Hesaplayıcıya geç", "tools": "Hesaplayıcılar", "site": "Site",
        "about": "Hakkında", "privacy": "Gizlilik", "terms": "Kullanım Koşulları", "contact": "İletişim",
        "tagline": "Farklı takvimlerde ve dillerde ücretsiz yaş ve tarih hesaplayıcıları. Tüm hesaplamalar tarayıcınızda yapılır; hiçbir bilginiz gönderilmez veya saklanmaz.",
        "faq": "Sıkça sorulan sorular", "related": "Diğer hesaplayıcılar", "updated": "Son güncelleme",
        "home": "Ana sayfa", "theme": "Karanlık mod", "language": "Dil",
    },
    "de": {
        "skip": "Zum Rechner springen", "tools": "Rechner", "site": "Website",
        "about": "Über uns (Englisch)", "privacy": "Datenschutz (Englisch)", "terms": "Nutzungsbedingungen (Englisch)", "contact": "Kontakt (Englisch)",
        "tagline": "Kostenlose Alters- und Datumsrechner in mehreren Sprachen. Alles wird in Ihrem Browser berechnet; Ihre Eingaben werden weder gesendet noch gespeichert.",
        "faq": "Häufig gestellte Fragen", "related": "Weitere Rechner", "updated": "Zuletzt aktualisiert",
        "home": "Startseite", "theme": "Dunkelmodus", "language": "Sprache",
    },
    "id": {
        "skip": "Langsung ke kalkulator", "tools": "Kalkulator", "site": "Situs",
        "about": "Tentang (Inggris)", "privacy": "Privasi (Inggris)", "terms": "Ketentuan (Inggris)", "contact": "Kontak (Inggris)",
        "tagline": "Kalkulator umur dan tanggal gratis dalam beberapa bahasa dan kalender. Semua dihitung di browser Anda; data yang Anda masukkan tidak dikirim atau disimpan.",
        "faq": "Pertanyaan yang sering diajukan", "related": "Kalkulator lainnya", "updated": "Terakhir diperbarui",
        "home": "Beranda", "theme": "Mode gelap", "language": "Bahasa",
    },
    "pt": {
        "skip": "Ir para a calculadora", "tools": "Calculadoras", "site": "Site",
        "about": "Sobre (inglês)", "privacy": "Privacidade (inglês)", "terms": "Termos (inglês)", "contact": "Contato (inglês)",
        "tagline": "Calculadoras gratuitas de idade e datas em vários idiomas. Tudo é calculado no seu navegador; nada do que você digita é enviado ou armazenado.",
        "faq": "Perguntas frequentes", "related": "Outras calculadoras", "updated": "Última atualização",
        "home": "Início", "theme": "Modo escuro", "language": "Idioma",
    },
    "ko": {
        "skip": "계산기로 바로가기", "tools": "계산기", "site": "사이트",
        "about": "소개 (영어)", "privacy": "개인정보 처리방침 (영어)", "terms": "이용약관 (영어)", "contact": "문의 (영어)",
        "tagline": "여러 언어로 제공되는 무료 나이 및 날짜 계산기입니다. 모든 계산은 브라우저에서 이루어지며 입력한 내용은 전송되거나 저장되지 않습니다.",
        "faq": "자주 묻는 질문", "related": "다른 계산기", "updated": "최종 업데이트",
        "home": "홈", "theme": "다크 모드", "language": "언어",
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


CHEVRON = ('<svg class="nav-chevron" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">'
           '<path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>')
GLOBE = ('<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.6">'
         '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></g></svg>')


def flag_img(code):
    if not code:
        return '<span class="flag flag-none" aria-hidden="true"></span>'
    return f'<img class="flag" src="/assets/img/flags/{code}.svg" width="20" height="14" alt="" loading="lazy" decoding="async">'


def current_lang(page):
    return "ne" if page.get("nav") in ("ne", "neconv") else ui_lang(page)


def render_nav(page):
    """Header menu: grouped dropdowns for English pages, a flat list for other languages."""
    lang = ui_lang(page)
    t = UI[lang]
    menu = LANG_NAV.get(lang)
    if menu:
        keys = {k for k, _, _ in menu}
        own = page.get("id") if page.get("id") in keys else page.get("nav")
        items = []
        for key, path, label in menu:
            cur = ' aria-current="page"' if key == own else ""
            tl = TOOL_LANG.get(key, "en")
            lang_attr = ' lang="ar" dir="rtl"' if tl == "ar" else f' lang="{tl}"'
            items.append(f'<li><a href="{path}"{cur}{lang_attr}>{html.escape(label)}</a></li>')
        return (f'<nav class="tool-nav" aria-label="{t["tools"]}">\n      <ul>\n' + "\n".join(items)
                + '\n      </ul>\n    </nav>')
    info = {k: (n, d) for k, n, d in RELATED["en"]}
    info.update({k: (n, d) for k, _, n, d in EXAMS})
    own = page.get("id") or page.get("nav")
    groups = []
    for gid, label, intro, keys in NAV_GROUPS:
        links = []
        for k in keys:
            name, desc = info[k]
            cur = ' aria-current="page"' if k == own else ""
            links.append(f'<li><a href="{PATHS[k]}"{cur}><strong>{html.escape(name)}</strong>'
                         f'<span>{html.escape(desc)}</span></a></li>')
        is_cur = " is-current" if own in keys else ""
        groups.append(
            f'<li><details class="nav-group" name="site-menu"><summary class="nav-trigger{is_cur}">{label}{CHEVRON}</summary>'
            f'<div class="mega" id="menu-{gid}"><div class="wrap mega-inner">'
            f'<div class="mega-intro"><p class="mega-title">{label}</p><p>{html.escape(intro)}</p></div>'
            f'<ul class="mega-links">{"".join(links)}</ul></div></div></details></li>')
    return (f'<nav class="site-menu" aria-label="{t["tools"]}">\n      <ul>\n' + "\n".join(groups)
            + '\n      </ul>\n    </nav>')


def render_lang_menu(page):
    t = UI[ui_lang(page)]
    me = current_lang(page)
    items = []
    for code, path, name, flag, la in LANGS:
        cur = ' aria-current="page"' if code == me else ""
        dir_attr = ' dir="rtl"' if la == "ar" else ""
        items.append(f'<li><a href="{path}" lang="{la}" hreflang="{la}"{cur}>{flag_img(flag)}<span{dir_attr}>{html.escape(name)}</span></a></li>')
    short = "NE" if me == "ne" else me.upper()
    return (f'<details class="lang-menu" name="site-menu"><summary class="nav-trigger lang-trigger">{GLOBE}'
            f'<span aria-hidden="true">{short}</span><span class="visually-hidden">{t["language"]}</span>{CHEVRON}</summary>'
            f'<ul class="lang-list">{"".join(items)}</ul></details>')


def render_faq(page):
    """Localized, accessible FAQ accordion with an illustrated intro.

    Native <details name="ageason-faq"> provides a one-open-at-a-time accordion
    without JavaScript, and degrades gracefully on older browsers.
    Keep original questions and answers unchanged for SEO and FAQ JSON-LD.
    """
    faq = page.get("faq")
    if not faq:
        return ""
    lang = ui_lang(page)
    t = UI[lang]
    copy = {
        "en": ("COMMON QUESTIONS", "Clear answers about this calculator and how to understand its results."),
        "ar": ("إجابات على استفساراتك", "إجابات مبسطة عن طريقة استخدام الحاسبة وفهم النتائج."),
        "ja": ("ご利用ガイド", "この計算ツールの使い方と結果について、よくある疑問にお答えします。"),
        "tr": ("SIKÇA SORULAN SORULAR", "Bu hesaplayıcı ve sonuçları hakkında anlaşılır cevaplar."),
        "de": ("HÄUFIGE FRAGEN", "Klare Antworten zu diesem Rechner und seinen Ergebnissen."),
        "id": ("PERTANYAAN UMUM", "Jawaban jelas tentang kalkulator ini dan cara membaca hasilnya."),
        "pt": ("DÚVIDAS COMUNS", "Respostas claras sobre esta calculadora e seus resultados."),
        "ko": ("자주 묻는 질문", "이 계산기와 결과에 대한 명확한 답변입니다."),
    }
    eyebrow, intro = copy[lang]
    chevron = ('<svg class="faq-chevron" viewBox="0 0 20 20" width="20" height="20" '
               'fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">'
               '<path d="m4 7 6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>')
    rows = "\n".join(
        f'<details name="ageason-faq"><summary><span class="faq-question">{html.escape(q)}</span>'
        f'{chevron}</summary><div class="answer"><p>{a}</p></div></details>'
        for q, a in faq)
    art = (
        '<div class="faq-art" aria-hidden="true">'
        '<svg viewBox="0 0 340 240" role="presentation" focusable="false">'
        '<defs><linearGradient id="faq-card-shade" x1="0" x2="1" y1="0" y2="1">'
        '<stop stop-color="#ffffff"/><stop offset="1" stop-color="#eff0ff"/>'
        '</linearGradient></defs>'
        '<circle cx="275" cy="52" r="42" fill="#e5defe"/>'
        '<circle cx="63" cy="187" r="33" fill="#dfedff"/>'
        '<rect x="78" y="30" width="198" height="177" rx="23" fill="#c9c9ed" opacity=".45"/>'
        '<rect x="65" y="23" width="198" height="177" rx="23" fill="url(#faq-card-shade)" '
        'stroke="#d8daf2" stroke-width="2"/>'
        '<rect x="65" y="23" width="198" height="44" rx="23" fill="#5f64d5"/>'
        '<path d="M65 50h198v16H65z" fill="#5f64d5"/>'
        '<rect x="104" y="12" width="12" height="30" rx="6" fill="#c9c8fa"/>'
        '<rect x="212" y="12" width="12" height="30" rx="6" fill="#c9c8fa"/>'
        '<rect x="88" y="88" width="41" height="41" rx="10" fill="#e8e9ff"/>'
        '<rect x="143" y="88" width="41" height="41" rx="10" fill="#ecf2ff"/>'
        '<rect x="198" y="88" width="41" height="41" rx="10" fill="#e9e9ff"/>'
        '<path d="M100 106h17M155 106h17M210 106h17M100 117h17M155 117h17" '
        'stroke="#9ca5dc" stroke-width="3" stroke-linecap="round"/>'
        '<circle cx="220" cy="161" r="37" fill="#766be4"/>'
        '<path d="M211 152c0-6 5-10 11-10s11 4 11 10c0 6-7 8-11 13v4" '
        'fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>'
        '<circle cx="222" cy="178" r="3" fill="#fff"/>'
        '<path d="m48 56 7 7m0-7-7 7M299 159l7 7m0-7-7 7" '
        'stroke="#aaa1e9" stroke-width="4" stroke-linecap="round"/>'
        '</svg></div>'
    )
    return (
        '<section class="faq-section" aria-labelledby="faq">'
        '<div class="faq-intro">'
        f'<h2 id="faq">{html.escape(t["faq"])}</h2>'
        f'<p class="faq-blurb"><strong>{html.escape(eyebrow)}.</strong> {html.escape(intro)}</p>{art}'
        '</div>'
        f'<div class="faq faq-accordion">{rows}</div>'
        '</section>'
    )


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
        # two sub-columns, each sorted A to Z
        "local_groups": [
            ("Age", [("home", "Age calculator"), ("diff", "Age difference"), ("birthyear", "Birth year calculator"),
                     ("chrono", "Chronological age"), ("experience", "Experience calculator"),
                     ("generation", "Generation calculator")]),
            ("Dates, pets and exams", [("bizdays", "Business days"), ("catage", "Cat age"), ("datecalc", "Date calculator"),
                                       ("days", "Days between dates"), ("dogage", "Dog age"), ("exam", "Exam age limits")]),
        ],
        "other_title": "Other languages",
        "other": [("ar", "العربية (حاسبة العمر)"), ("ja", "日本語 (年齢早見表)"),
                  ("trhome", "Türkçe (Yaş hesaplama)"), ("dehome", "Deutsch (Altersrechner)"),
                  ("idhome", "Bahasa Indonesia (Kalkulator umur)"), ("pthome", "Português (Calculadora de idade)"),
                  ("kohome", "한국어 (만 나이 계산기)"),
                  ("ne", "Nepali (Age calculator)"), ("neconv", "Nepali (Date converter)")],
        "site_title": "Explore Ageason",
        "foot_note": "Free tools · No account required",
    },
    "ar": {
        "local_title": "الحاسبات بالعربية",
        "local": [
            ("ar", "حساب العمر"),
            ("artoday", "التاريخ اليوم"),
            ("arcalendar", "التقويم الهجري"),
            ("arramadan", "كم باقي على رمضان"),
            ("areid", "كم باقي على العيد"),
            ("arconv", "تحويل التاريخ"),
            ("ardiff", "فرق العمر"),
            ("arages", "جدول الأعمار"),
        ],
        "other_title": "حاسبات بلغات أخرى",
        "other": [("home", "الإنجليزية (حاسبة العمر)"), ("ja", "اليابانية (جدول الأعمار)"),
                  ("trhome", "التركية (حساب العمر)"), ("dehome", "الألمانية (حساب العمر)"),
                  ("idhome", "الإندونيسية (حساب العمر)"), ("pthome", "البرتغالية (حساب العمر)"),
                  ("kohome", "الكورية (حساب العمر)"),
                  ("ne", "النيبالية (حاسبة العمر)"), ("neconv", "النيبالية (تحويل التاريخ)")],
        "site_title": "تعرف على Ageason",
        "foot_note": "أدوات مجانية · لا تحتاج إلى تسجيل",
    },
    "ja": {
        "local_title": "日本語のツール",
        "local": [("ja", "年齢早見表"), ("gakunen", "学年早見表"), ("jadays", "日数計算"), ("jaera", "西暦和暦早見表")],
        "other_title": "ほかの言語",
        "other": [("home", "英語 (年齢計算)"), ("ar", "アラビア語 (年齢計算)"),
                  ("trhome", "トルコ語 (年齢計算)"), ("dehome", "ドイツ語 (年齢計算)"),
                  ("idhome", "インドネシア語 (年齢計算)"), ("pthome", "ポルトガル語 (年齢計算)"),
                  ("kohome", "韓国語 (満年齢計算)"),
                  ("ne", "ネパール暦 (年齢計算)"), ("neconv", "ネパール暦 (日付変換)")],
        "site_title": "サイト案内",
        "foot_note": "無料の計算ツール · 登録不要",
    },
    "tr": {
        "local_title": "Türkçe hesaplayıcılar",
        "local": [
            ("trhome", "Yaş hesaplama"),
            ("trdate", "Tarih ve gün hesaplama"),
            ("trhijri", "Hicri takvim"),
        ],
        "other_title": "Diğer diller",
        "other": [
            ("home", "İngilizce (Age calculator)"),
            ("ar", "Arapça (حاسبة العمر)"),
            ("ja", "Japonca (年齢早見表)"),
            ("ne", "Nepalce (Nepali age)"),
            ("dehome", "Almanca (Altersrechner)"),
            ("idhome", "Endonezce (Kalkulator umur)"),
            ("pthome", "Portekizce (Calculadora de idade)"),
            ("kohome", "Korece (만 나이 계산기)"),
        ],
        "site_title": "Ageason Hakkında",
        "foot_note": "Ücretsiz araçlar · Kayıt gerekmez",
    },
    "de": {
        "local_title": "Rechner auf Deutsch",
        "local": [("dehome", "Altersrechner"), ("dedate", "Datumsrechner")],
        "other_title": "Weitere Sprachen",
        "other": [("home", "Englisch (Age calculator)"), ("ar", "Arabisch (حساب العمر)"), ("ja", "Japanisch (年齢早見表)"),
                  ("trhome", "Türkisch (Yaş hesaplama)"), ("idhome", "Indonesisch (Kalkulator umur)"),
                  ("pthome", "Portugiesisch (Calculadora de idade)"), ("kohome", "Koreanisch (만 나이 계산기)")],
        "site_title": "Über Ageason",
        "foot_note": "Kostenlose Rechner · Keine Anmeldung nötig",
    },
    "id": {
        "local_title": "Kalkulator bahasa Indonesia",
        "local": [("idhome", "Kalkulator umur"), ("iddate", "Hitung hari"), ("idhijri", "Kalender Hijriyah")],
        "other_title": "Bahasa lain",
        "other": [("home", "Inggris (Age calculator)"), ("ar", "Arab (حساب العمر)"), ("ja", "Jepang (年齢早見表)"),
                  ("trhome", "Turki (Yaş hesaplama)"), ("dehome", "Jerman (Altersrechner)"),
                  ("pthome", "Portugis (Calculadora de idade)"), ("kohome", "Korea (만 나이 계산기)")],
        "site_title": "Tentang Ageason",
        "foot_note": "Kalkulator gratis · Tanpa daftar akun",
    },
    "pt": {
        "local_title": "Calculadoras em português",
        "local": [("pthome", "Calculadora de idade"), ("ptdate", "Calculadora de dias")],
        "other_title": "Outros idiomas",
        "other": [("home", "Inglês (Age calculator)"), ("ar", "Árabe (حساب العمر)"), ("ja", "Japonês (年齢早見表)"),
                  ("trhome", "Turco (Yaş hesaplama)"), ("dehome", "Alemão (Altersrechner)"),
                  ("idhome", "Indonésio (Kalkulator umur)"), ("kohome", "Coreano (만 나이 계산기)")],
        "site_title": "Sobre o Ageason",
        "foot_note": "Ferramentas gratuitas · Sem cadastro",
    },
    "ko": {
        "local_title": "한국어 계산기",
        "local": [("kohome", "만 나이 계산기"), ("kodate", "날짜 계산기")],
        "other_title": "다른 언어",
        "other": [("home", "영어 (Age calculator)"), ("ar", "아랍어 (حساب العمر)"), ("ja", "일본어 (年齢早見表)"),
                  ("trhome", "터키어 (Yaş hesaplama)"), ("dehome", "독일어 (Altersrechner)"),
                  ("idhome", "인도네시아어 (Kalkulator umur)"), ("pthome", "포르투갈어 (Calculadora de idade)")],
        "site_title": "Ageason 안내",
        "foot_note": "무료 계산기 · 회원가입 불필요",
    },
    "ne": {
        "local_title": "Nepali calendar tools",
        "local": [("ne", "Nepali age calculator"), ("neconv", "Nepali date converter")],
        "other_title": "Other languages",
        "other": [("home", "English (Age calculator)"), ("ar", "العربية (حاسبة العمر)"),
                  ("ja", "日本語 (年齢早見表)"), ("trhome", "Turkish (Age calculator)"),
                  ("dehome", "Deutsch (Altersrechner)"), ("idhome", "Bahasa Indonesia (Kalkulator umur)"),
                  ("pthome", "Português (Calculadora de idade)"), ("kohome", "한국어 (만 나이 계산기)")],
        "site_title": "Explore Ageason",
        "foot_note": "Free tools · No account required",
    }
}


def footer_navigation(page):
    lang = ui_lang(page)
    # Nepali calendar tools currently have English-language interfaces.
    group = "ne" if page.get("nav") in ("ne", "neconv") else lang
    config = FOOTER_SECTIONS[group]
    language_for_link = TOOL_LANG
    def render_links(entries, flags=False):
        return "\n".join(
            '<li><a href="{}" lang="{}" hreflang="{}">{}{}</a></li>'.format(
                html.escape(PATHS[key], quote=True),
                "en" if group == "ne" else lang,
                language_for_link.get(key, "en"),
                flag_img(KEY_FLAG.get(key, LANG_FLAG.get(language_for_link.get(key, "en")))) if flags else "",
                html.escape(label))
            for key, label in entries
        )
    if "local_groups" in config:
        local = "\n".join(f'<div class="footer-sub"><h3>{html.escape(h)}</h3><ul>\n{render_links(e)}\n</ul></div>'
                          for h, e in config["local_groups"])
    else:
        local = f'<ul>\n{render_links(config["local"])}\n</ul>'
    return {
        "local_heading": html.escape(config["local_title"]),
        "local_links": local,
        "local_cols": ' data-cols="2"' if "local_groups" in config else "",
        "other_heading": html.escape(config["other_title"]),
        "other_links": render_links(config["other"], flags=True),
        "site_heading": html.escape(config["site_title"]),
        "foot_note": html.escape(config["foot_note"]),
    }


def json_ld(page):
    url = abs_url(page["path"])
    graph = []
    if page["path"] == "/":
        org_id = abs_url("/#organization")
        graph.append({
            "@type": "Organization",
            "@id": org_id,
            "name": SITE_NAME,
            "url": abs_url("/"),
            "logo": abs_url("/assets/img/icon-512.png"),
        })
        graph.append({
            "@type": "WebSite",
            "@id": abs_url("/#website"),
            "name": SITE_NAME,
            "url": abs_url("/"),
            "inLanguage": ["en", "ar", "ja"],
            "logo": abs_url("/assets/img/icon-512.png"),
            "publisher": {"@id": org_id},
        })
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
    home_path = "/" if ui_lang(page) == "ja" else HOME_PATH.get(ui_lang(page), "/")
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


JA_ERAS = [("令和", 2019), ("平成", 1989), ("昭和", 1926), ("大正", 1912), ("明治", 1868)]
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
            f'<td>{after}歳</td><td>{"" if before < 0 else str(before) + "歳"}</td></tr>')
    return "\n".join(rows)


def yakudoshi_label(kazoe):
    """Return Yakudoshi label tuple (male, female) for a kazoe age."""
    m, f = "", ""
    if kazoe == 24: m = "前厄"
    elif kazoe == 25: m = "本厄"
    elif kazoe == 26: m = "後厄"
    elif kazoe == 41: m = "前厄"
    elif kazoe == 42: m = "大厄"
    elif kazoe == 43: m = "後厄"
    elif kazoe == 60: m = "前厄"
    elif kazoe == 61: m = "本厄（還暦）"
    elif kazoe == 62: m = "後厄"

    if kazoe == 18: f = "前厄"
    elif kazoe == 19: f = "本厄"
    elif kazoe == 20: f = "後厄"
    elif kazoe == 32: f = "前厄"
    elif kazoe == 33: f = "大厄"
    elif kazoe == 34: f = "後厄"
    elif kazoe == 36: f = "前厄"
    elif kazoe == 37: f = "本厄"
    elif kazoe == 38: f = "後厄"
    elif kazoe == 60: f = "前厄"
    elif kazoe == 61: f = "本厄（還暦）"
    elif kazoe == 62: f = "後厄"
    return m, f


def era_table(year):
    """Rows for 西暦和暦早見表: newest birth year first, from year down to 1912 (Taisho/Meiji)."""
    rows = []
    for y in range(year, 1911, -1):
        after = year - y
        before = after - 1
        kazoe = after + 1
        m_yaku, f_yaku = yakudoshi_label(kazoe)
        yaku_badge = []
        if m_yaku:
            cls = "tag danger" if "大厄" in m_yaku else "tag warning"
            yaku_badge.append(f'<span class="{cls}">男:{m_yaku}</span>')
        if f_yaku:
            cls = "tag danger" if "大厄" in f_yaku else "tag warning"
            yaku_badge.append(f'<span class="{cls}">女:{f_yaku}</span>')
        yaku_cell = " ".join(yaku_badge) if yaku_badge else ""
        before_str = "" if before < 0 else f"{before}歳"
        era_str = era_label(y)
        era_class = ' class="era-change"' if "／" in era_str else ""
        rows.append(
            f'<tr data-y="{y}" data-era="{era_str}"><td>{y}年</td><td{era_class}>{era_str}</td>'
            f'<td>{JA_ETO[(y - 4) % 12]}</td><td>{after}歳</td><td>{before_str}</td>'
            f'<td>{kazoe}歳</td><td>{yaku_cell}</td></tr>')
    return "\n".join(rows)


def yakudoshi_table(year):
    """Generate side-by-side Yakudoshi summary tables for male and female in year."""
    male_defs = [
        (25, "本厄", 24, 26, False),
        (42, "大厄（本厄）", 41, 43, True),
        (61, "本厄（還暦）", 60, 62, False),
    ]
    female_defs = [
        (19, "本厄", 18, 20, False),
        (33, "大厄（本厄）", 32, 34, True),
        (37, "本厄", 36, 38, False),
        (61, "本厄（還暦）", 60, 62, False),
    ]
    def make_section(title, defs, gender_cls):
        rows = []
        for hon_age, hon_name, mae_age, ato_age, is_dai in defs:
            by_mae = year - mae_age + 1
            by_hon = year - hon_age + 1
            by_ato = year - ato_age + 1
            cls_attr = ' class="is-daiyaku"' if is_dai else ""
            tag_cls = "tag danger" if is_dai else "tag warning"
            rows.append(
                f'<tr{cls_attr}><td><span class="{tag_cls}">{hon_name}</span> <strong>数え{hon_age}歳</strong></td>'
                f'<td>{by_mae}年（{era_label(by_mae)}）<br><small>数え{mae_age}歳</small></td>'
                f'<td><strong>{by_hon}年（{era_label(by_hon)}）</strong><br><small>数え{hon_age}歳</small></td>'
                f'<td>{by_ato}年（{era_label(by_ato)}）<br><small>数え{ato_age}歳</small></td></tr>'
            )
        return (
            f'<div class="yakudoshi-card {gender_cls}">'
            f'<h3>{title}</h3>'
            f'<div class="table-wrap auto"><table class="data wrap-cells">'
            f'<thead><tr><th scope="col">厄名</th><th scope="col">前厄</th><th scope="col">本厄</th><th scope="col">後厄</th></tr></thead>'
            f'<tbody>{"".join(rows)}</tbody></table></div></div>'
        )

    m_html = make_section(f"男性の厄年早見表（{year}年・令和{year-2018}年）", male_defs, "male-yaku")
    f_html = make_section(f"女性の厄年早見表（{year}年・令和{year-2018}年）", female_defs, "female-yaku")
    return f'<div class="yakudoshi-grid">{m_html}\n{f_html}</div>'


JA_ERA_STARTS = [("令和", dt.date(2019, 5, 1)), ("平成", dt.date(1989, 1, 8)), ("昭和", dt.date(1926, 12, 25)), ("大正", dt.date(1912, 7, 30)), ("明治", dt.date(1868, 1, 25))]


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
                    rows.append(f'<tr><td>{html.escape(cat["label"])}</td><td>{b["min"]} to under {b["max"] + cat["relax"]}</td><td class="nw">{fmt_date(f)} to {fmt_date(t)}</td></tr>')
                head = "<tr><th scope=col>Category</th><th scope=col>Age on " + fmt_date(cut) + "</th><th scope=col>Born between</th></tr>"
            else:
                rows = []
                for b in c["bands"]:
                    f, t = age_window(c["cutoff"], b["min"], b["max"])
                    rows.append(f'<tr><td>{html.escape(b["label"])}</td><td>{b["min"]} to under {b["max"]}</td><td class="nw">{fmt_date(f)} to {fmt_date(t)}</td></tr>')
                head = "<tr><th scope=col>Post group</th><th scope=col>Age on " + fmt_date(cut) + " (General)</th><th scope=col>Born between (General)</th></tr>"
            out.append(f'<div class="table-wrap auto"><table class="data wrap-cells"><thead>{head}</thead><tbody>{"".join(rows)}</tbody></table></div>')
            if len(c["bands"]) > 1:
                rel = ", ".join(f'{html.escape(x["label"])} +{x["relax"]}' for x in c["cats"] if x["relax"])
                out.append(f'<p class="hint">Upper age relaxation: {rel} years.</p>')
        else:
            rows = []
            for e in c["entries"]:
                f, t = dt.date.fromisoformat(e["from"]), dt.date.fromisoformat(e["to"])
                rows.append(f'<tr><td>{html.escape(e["label"])}</td><td class="nw">{fmt_date(f)} to {fmt_date(t)}</td><td>{html.escape(e.get("note", ""))}</td></tr>')
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


# ---------------- Arabic age tables (Umm al-Qura 1300 to 1600 AH) ----------------
AR_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
HIJRI_EPOCH = dt.date(1882, 11, 12)  # 1 Muharram 1300 AH
# Year lengths (354 + bit) for 1300 to 1600 AH from Unicode ICU islamic-umalqura
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
        return ""
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
    return f"{a} {suffix}" if a == b else f"{a} و{b} {suffix}"


def ar_hijri_table(h_year):
    rows = []
    for hy in range(h_year, max(1299, h_year - 101), -1):
        s, e = hijri_year_span(hy)
        after, before = h_year - hy, h_year - hy - 1
        rows.append(
            f'<tr data-hy="{hy}"><td>{hy} هـ</td><td>{ar_year_range(s.year, e.year, "م")}</td>'
            f'<td>{ar_years(after)}</td><td>{"" if before < 0 else ar_years(before)}</td></tr>')
    return "\n".join(rows)


def ar_gregorian_table(g_year):
    rows = []
    for gy in range(g_year, g_year - 101, -1):
        d1, d2 = dt.date(gy, 1, 1), dt.date(gy, 12, 31)
        h_span = ar_year_range(hijri_year_of(d1), hijri_year_of(d2), "هـ") if d1 >= HIJRI_EPOCH else "خارج نطاق أم القرى"
        after, before = g_year - gy, g_year - gy - 1
        rows.append(
            f'<tr data-gy="{gy}"><td>{gy} م</td><td>{h_span}</td>'
            f'<td>{ar_years(after)}</td><td>{"" if before < 0 else ar_years(before)}</td></tr>')
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
        "{{JA_ERA_TABLE}}": era_table(JA_TABLE_YEAR) if "{{JA_ERA_TABLE}}" in body else "",
        "{{JA_YAKUDOSHI_TABLE}}": yakudoshi_table(JA_TABLE_YEAR) if "{{JA_YAKUDOSHI_TABLE}}" in body else "",
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
    og_locale = {"en": "en_US", "ar": "ar_SA", "ja": "ja_JP", "tr": "tr_TR", "de": "de_DE", "id": "id_ID", "pt": "pt_BR", "ko": "ko_KR"}.get(page["lang"], "en_US")
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
    brand_href = "/" if lang == "ja" else HOME_PATH.get(lang, "/")
    site_prefix = "/ar" if is_ar else ""
    gtm_head = (
        '  <!-- Google Tag Manager -->\n'
        "  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','"
        + GOOGLE_TAG_ID
        + "');</script>\n"
        '  <!-- End Google Tag Manager -->\n'
    ) if GOOGLE_TAG_ID else ""

    gtm_body = (
        '  <!-- Google Tag Manager (noscript) -->\n'
        '  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id='
        + GOOGLE_TAG_ID
        + '" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>\n'
        '  <!-- End Google Tag Manager (noscript) -->\n'
    ) if GOOGLE_TAG_ID else ""

    return f"""<!doctype html>
<html lang="{page['lang']}" dir="{page['dir']}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
{gtm_head}  <title>{html.escape(full_title)}</title>
  <meta name="description" content="{html.escape(desc)}">
  <meta name="robots" content="{robots}">
  <meta name="google-site-verification" content="{GOOGLE_SITE_VERIFICATION}">
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
  <script>(function(){{var t;try{{t=localStorage.getItem("theme")}}catch(e){{}}document.documentElement.dataset.theme=t||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")}})();</script>
  <style>/* Hallmark */ html,body{{overflow-x:clip}}:focus-visible{{outline:2px solid var(--focus);outline-offset:2px}}:active{{transform:none}}:disabled{{opacity:0.45;cursor:not-allowed}}</style>
  <link rel="stylesheet" href="{css}">
  {landing_css}
  <script type="application/ld+json">
{json_ld(page)}
  </script>
  {adsense}
</head>
<body{body_class}>
{gtm_body}<a class="skip-link" href="#main">{t['skip']}</a>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="{brand_href}" lang="en">{BRAND_SVG}<span>{html.escape(SITE_NAME)}</span></a>
    {render_nav(page)}
    {render_lang_menu(page)}
    <button class="theme-toggle" type="button" aria-label="{t['theme']}" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/></svg></button>
  </div>
</header>
<main id="main">
{body.strip()}
</main>
<footer class="site-footer footer-v2 footer-rounded">
  <div class="footer-wave" aria-hidden="true"><svg viewBox="0 0 1800 500" preserveAspectRatio="none" focusable="false"><path d="M0 250C150 110 300 110 450 250S750 390 900 250C1050 110 1200 110 1350 250S1650 390 1800 250V500H0Z"/><path d="M0 300C150 390 300 390 450 300S750 210 900 300C1050 390 1200 390 1350 300S1650 210 1800 300V500H0Z"/></svg></div>
  <div class="wrap footer-inner" data-slot="footer-inner">
    <div class="footer-grid">
      <div class="footer-brand-column">
        <a class="footer-brand" href="{brand_href}" lang="en">{BRAND_SVG}<span>{html.escape(SITE_NAME)}</span></a>
        <p class="footer-description">{t['tagline']}</p>
        <p class="footer-note">{footer['foot_note']}</p>
      </div>
      <nav class="footer-column" aria-label="{footer['local_heading']}"{footer['local_cols']}>
        <h2>{footer['local_heading']}</h2>
{footer['local_links']}
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
          <li><a href="{HOME_PATH.get(lang, '/')}#faq">{t['faq']}</a></li>
        </ul>
      </nav>
    </div>
    <div class="footer-bottom">
      <p class="footer-base" lang="en">© {BUILD_DATE.year} {html.escape(SITE_NAME)}</p>
      <nav class="footer-legal" aria-label="{t['site']}">
        <a href="{site_prefix}/terms/">{t['terms']}</a>
        <a href="{site_prefix}/privacy/">{t['privacy']}</a>
        <a href="{site_prefix}/contact/">{t['contact']}</a>
      </nav>
    </div>
  </div>
</footer>
<script>/* phones: scroll the current page's tab into view in the sideways menu */(function(){{var n=document.querySelector('.tool-nav'),a=n&&n.querySelector('[aria-current]');if(n&&n.scrollWidth>n.clientWidth+1)n.classList.add('is-scrolling');if(a&&n.scrollWidth>n.clientWidth){{n.scrollLeft+=a.getBoundingClientRect().left-n.getBoundingClientRect().left-(n.clientWidth-a.offsetWidth)/2;}}}})();</script>
<script>/* header dropdowns: open on hover (mouse) or click/keyboard, one at a time, close on outside click or Escape */(function(){{var ds=[].slice.call(document.querySelectorAll('details[name="site-menu"]'));function shut(keep){{ds.forEach(function(d){{if(d!==keep)d.open=false}})}}ds.forEach(function(d){{d.addEventListener('toggle',function(){{if(d.open)shut(d)}})}});if(matchMedia('(hover:hover) and (pointer:fine)').matches)ds.forEach(function(d){{var t;d.addEventListener('mouseenter',function(){{clearTimeout(t);d.open=true}});d.addEventListener('mouseleave',function(){{t=setTimeout(function(){{d.open=false}},200)}});d.querySelector('summary').addEventListener('click',function(e){{if(e.detail&&d.open)e.preventDefault()}})}});document.addEventListener('click',function(e){{if(!e.target.closest('details[name="site-menu"]'))shut()}});document.addEventListener('keydown',function(e){{var o=ds.filter(function(d){{return d.open}})[0];if(e.key==='Escape'&&o){{o.open=false;o.querySelector('summary').focus()}}}})}})();</script>
<script>(function(){{var b=document.querySelector('.theme-toggle'),r=document.documentElement;function s(){{b.setAttribute('aria-pressed',r.dataset.theme==='dark')}}s();b.addEventListener('click',function(){{r.dataset.theme=r.dataset.theme==='dark'?'light':'dark';try{{localStorage.setItem('theme',r.dataset.theme)}}catch(e){{}}s()}})}})();</script>
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
        for _ in range(5):
            try:
                shutil.rmtree(OUT)
                break
            except OSError:
                import time
                time.sleep(0.15)
    shutil.copytree(SRC / "static", OUT)
    vers = asset_versions()
    pages = load_pages()

    for page in pages:
        out = OUT / (page.get("out") or (page["path"].strip("/") + "/index.html").lstrip("/"))
        write(out, page_html(page, pages, vers))

    # ---- sitemap.xml (with hreflang alternates) ----
    # Sort pages by priority (highest first) then URL path for clean sitemap hierarchy
    sitemap_pages = sorted(
        [p for p in pages if not p.get("noindex")],
        key=lambda p: (-float(p.get("priority", "0.5")), p["path"])
    )
    urls = []
    for p in sitemap_pages:
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
    robots_content = (
        "User-Agent: *\n"
        "Allow: /\n\n"
        "User-Agent: GPTBot\n"
        "User-Agent: ClaudeBot\n"
        "User-Agent: PerplexityBot\n"
        "User-Agent: Google-Extended\n"
        "User-Agent: Applebot-Extended\n"
        "User-Agent: CCBot\n"
        "User-Agent: cohere-ai\n"
        "Allow: /\n\n"
        f"Host: {SITE_URL}\n"
        f"Sitemap: {abs_url('/sitemap.xml')}\n"
    )
    write(OUT / "robots.txt", robots_content)

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
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/*.html
  Cache-Control: public, max-age=0, must-revalidate

/sitemap.xml
  Content-Type: application/xml; charset=utf-8
  Cache-Control: public, max-age=3600, must-revalidate
""")
    print(f"Built {len(pages)} pages into {OUT}")


if __name__ == "__main__":
    main()
