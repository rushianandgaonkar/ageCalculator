/* ar-today.js: Live Islamic Hijri & Gregorian today display and occasions countdown. */
(function () {
  "use strict";

  var G = DC.Gregorian;
  var H = DC.Hijri;
  var $ = function (id) { return document.getElementById(id); };

  var GM = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];
  var HM = [
    "محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة",
    "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"
  ];
  var HM_ORDER = [
    "الشهر الأول", "الشهر الثاني", "الشهر الثالث", "الشهر الرابع",
    "الشهر الخامس", "الشهر السادس", "الشهر السابع", "الشهر الثامن",
    "الشهر التاسع", "الشهر العاشر", "الشهر الحادي عشر", "الشهر الثاني عشر"
  ];
  var WEEKDAYS = [
    "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"
  ];

  var OCCASIONS = [
    { id: "ramadan", title: "شهر رمضان المبارك", m: 9, d: 1 },
    { id: "fitr", title: "عيد الفطر المبارك", m: 10, d: 1 },
    { id: "arafah", title: "يوم عرفة (موسم الحج)", m: 12, d: 9 },
    { id: "adha", title: "عيد الأضحى المبارك", m: 12, d: 10 },
    { id: "newyear", title: "رأس السنة الهجرية", m: 1, d: 1 },
    { id: "ashura", title: "يوم عاشوراء", m: 1, d: 10 },
    { id: "mawlid", title: "المولد النبوي الشريف", m: 3, d: 12 }
  ];

  var pr = new Intl.PluralRules("ar");
  var digits = DC.store.get("ac-digits") === "arab" ? "arab" : "latn";
  var hijriOK = H.supported();
  var F = {};
  var lastDayN = null;

  function makeFormats() {
    F.num = new Intl.NumberFormat("ar-SA-u-nu-" + digits);
    F.time = new Intl.DateTimeFormat("ar-SA-u-nu-" + digits, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  function num(n) {
    return F.num.format(n);
  }

  function dig(s) {
    return DC.toDigits(s, digits);
  }

  function countDays(n) {
    if (n === 0) return "اليوم";
    if (n === 1) return "غدًا";
    if (n === 2) return "بعد يومين";
    var c = pr.select(n);
    var word = c === "few" ? "أيام" : (c === "many" ? "يومًا" : "يوم");
    return "باقي " + num(n) + " " + word;
  }

  function countDaysGen(n) {
    if (n === 1) return "يوم واحد";
    if (n === 2) return "يومان";
    var c = pr.select(n);
    var word = c === "few" ? "أيام" : (c === "many" ? "يومًا" : "يوم");
    return num(n) + " " + word;
  }

  function getTodayN() {
    var p = DC.todayParts();
    return G.toDays(p.y, p.m, p.d);
  }

  function renderToday(dayN) {
    lastDayN = dayN;
    var w = DC.weekday(dayN);
    var g = G.fromDays(dayN);
    var h = H.fromDays(dayN);

    var weekdayName = WEEKDAYS[w];
    var hMonthName = HM[h.m - 1];
    var gMonthName = GM[g.m - 1];

    var hijriDateStr = dig(h.d) + " " + hMonthName + " " + dig(h.y) + " هـ";
    var gregDateStr = dig(g.d) + " " + gMonthName + " " + dig(g.y) + " م";

    var weekdayEl = $("today-weekday");
    if (weekdayEl) weekdayEl.textContent = weekdayName;

    var hDayEl = $("today-h-day");
    if (hDayEl) hDayEl.textContent = dig(h.d);

    var hMonthYearEl = $("today-h-month-year");
    if (hMonthYearEl) hMonthYearEl.textContent = hMonthName + " " + dig(h.y) + " هـ";

    var gregLineEl = $("today-greg-line");
    if (gregLineEl) {
      gregLineEl.textContent = "الموافق بالميلادي: " + gregDateStr;
    }

    // Month details
    var monthLen = H.dim(h.y, h.m);
    var monthRemain = monthLen - h.d;
    var pct = Math.min(100, Math.round((h.d / monthLen) * 100));

    var monthLenEl = $("detail-month-len");
    if (monthLenEl) monthLenEl.textContent = countDaysGen(monthLen);

    var monthRemainEl = $("detail-month-remain");
    if (monthRemainEl) monthRemainEl.textContent = countDaysGen(monthRemain);

    var monthOrderEl = $("detail-month-order");
    if (monthOrderEl) monthOrderEl.textContent = HM_ORDER[h.m - 1];

    var progressFillEl = $("today-progress-fill");
    if (progressFillEl) progressFillEl.style.width = pct + "%";

    var progressTextEl = $("today-progress-text");
    if (progressTextEl) {
      progressTextEl.textContent = "مضى من الشهر " + num(pct) + "% (" + countDaysGen(h.d) + " من أصل " + countDaysGen(monthLen) + ")";
    }

    renderOccasions(dayN, h);

    // Setup share and copy links
    var fullDateText = weekdayName + " " + hijriDateStr + " الموافق " + gregDateStr;
    var copyBtn = $("copy-today");
    if (copyBtn) {
      copyBtn.onclick = function () {
        var doneText = "تم نسخ التاريخ!";
        var note = $("copied-note");
        function done() {
          if (note) {
            note.textContent = doneText;
            setTimeout(function () { note.textContent = ""; }, 2500);
          }
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(fullDateText).then(done, function () {
            prompt("انسخ التاريخ:", fullDateText);
          });
        } else {
          prompt("انسخ التاريخ:", fullDateText);
        }
      };
    }

    var waLink = $("whatsapp-share");
    if (waLink) {
      var shareMsg = "تاريخ اليوم بالهجري والميلادي:\n" + fullDateText + "\nhttps://www.ageason.com/ar/today/";
      waLink.href = "https://wa.me/?text=" + encodeURIComponent(shareMsg);
    }
  }

  function renderOccasions(todayN, h) {
    var container = $("occasions-list");
    if (!container) return;

    var list = [];
    OCCASIONS.forEach(function (occ) {
      var targetYear = h.y;
      var targetN = H.toDays(targetYear, occ.m, occ.d);
      if (targetN === null || targetN < todayN) {
        targetYear++;
        targetN = H.toDays(targetYear, occ.m, occ.d);
      }
      if (targetN === null) return;

      var diff = targetN - todayN;
      var gOcc = G.fromDays(targetN);
      var wOcc = DC.weekday(targetN);

      list.push({
        title: occ.title,
        diff: diff,
        hijriStr: dig(occ.d) + " " + HM[occ.m - 1] + " " + dig(targetYear) + " هـ",
        gregStr: WEEKDAYS[wOcc] + " " + dig(gOcc.d) + " " + GM[gOcc.m - 1] + " " + dig(gOcc.y) + " م"
      });
    });

    list.sort(function (a, b) { return a.diff - b.diff; });

    var html = "";
    list.forEach(function (item) {
      html += '<article class="occasion-card">' +
        '<div class="occasion-card-head">' +
          '<h3 class="occasion-title">' + DC.esc(item.title) + '</h3>' +
          '<span class="occasion-countdown">' + DC.esc(countDays(item.diff)) + '</span>' +
        '</div>' +
        '<div class="occasion-dates">' +
          '<div><span>التاريخ الهجري: </span><strong>' + DC.esc(item.hijriStr) + '</strong></div>' +
          '<div><span>الموافق بالميلادي: </span><strong>' + DC.esc(item.gregStr) + '</strong></div>' +
        '</div>' +
      '</article>';
    });

    container.innerHTML = html;
  }

  function updateClock() {
    var now = new Date();
    var clockEl = $("today-clock");
    if (clockEl) {
      clockEl.textContent = F.time ? F.time.format(now) : now.toLocaleTimeString("ar-SA");
    }

    var currentDayN = getTodayN();
    if (currentDayN !== lastDayN) {
      renderToday(currentDayN);
    }
  }

  function initDigits() {
    var latnRadio = $("dig-latn");
    var arabRadio = $("dig-arab");
    if (!latnRadio || !arabRadio) return;

    if (digits === "arab") arabRadio.checked = true;
    else latnRadio.checked = true;

    function onDigitChange(e) {
      digits = e.target.value;
      DC.store.set("ac-digits", digits);
      makeFormats();
      renderToday(getTodayN());
      updateClock();
    }

    latnRadio.addEventListener("change", onDigitChange);
    arabRadio.addEventListener("change", onDigitChange);
  }

  function init() {
    makeFormats();
    initDigits();

    var todayN = getTodayN();
    renderToday(todayN);
    updateClock();

    setInterval(updateClock, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
