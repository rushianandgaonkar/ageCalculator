/* ar-calendar.js — Interactive monthly Hijri calendar viewer and year months table. */
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
  var WEEKDAYS_SAT = [
    "السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"
  ];

  var pr = new Intl.PluralRules("ar");
  var digits = DC.store.get("ac-digits") === "arab" ? "arab" : "latn";
  var hijriOK = H.supported();
  var F = {};

  var curY = 1448;
  var curM = 6;
  var selD = 10;

  function makeFormats() {
    F.num = new Intl.NumberFormat("ar-SA-u-nu-" + digits);
  }

  function num(n) {
    return F.num.format(n);
  }

  function dig(s) {
    return DC.toDigits(s, digits);
  }

  function countDays(n) {
    if (n === 1) return "يوم واحد";
    if (n === 2) return "يومان";
    var c = pr.select(n);
    var word = c === "few" ? "أيام" : (c === "many" ? "يومًا" : "يوم");
    return num(n) + " " + word;
  }

  function getTodayHijri() {
    var p = DC.todayParts();
    var n = G.toDays(p.y, p.m, p.d);
    return H.fromDays(n);
  }

  function getTodayN() {
    var p = DC.todayParts();
    return G.toDays(p.y, p.m, p.d);
  }

  function getMonthType(m) {
    if (m === 1 || m === 7 || m === 11 || m === 12) {
      return "شهر حرام";
    }
    if (m === 9) {
      return "شهر الصيام والقرآن";
    }
    return "شهر هجري";
  }

  function populateMonthSelect() {
    var sel = $("select-month");
    if (!sel) return;
    var html = "";
    for (var i = 0; i < 12; i++) {
      html += '<option value="' + (i + 1) + '">' + HM[i] + " (" + num(i + 1) + ")</option>";
    }
    sel.innerHTML = html;
  }

  function setMonth(y, m, preserveDay) {
    y = Math.max(1300, Math.min(1600, y));
    m = Math.max(1, Math.min(12, m));

    curY = y;
    curM = m;

    var monthLen = H.dim(curY, curM);
    if (!preserveDay || selD > monthLen) {
      selD = Math.min(selD || 1, monthLen);
    }

    renderCalendar();
    renderYearTable(curY);

    var selM = $("select-month");
    if (selM) selM.value = String(curM);

    var inputY = $("input-year");
    if (inputY && document.activeElement !== inputY) {
      inputY.value = String(curY);
    }
  }

  function renderCalendar() {
    var todayN = getTodayN();
    var monthLen = H.dim(curY, curM);
    var sN = H.toDays(curY, curM, 1);
    var eN = sN + monthLen - 1;

    var gStart = G.fromDays(sN);
    var gEnd = G.fromDays(eN);

    // Title and sub
    var titleEl = $("cal-month-title");
    if (titleEl) {
      titleEl.textContent = HM[curM - 1] + " " + dig(curY) + " هـ";
    }

    var subEl = $("cal-month-sub");
    if (subEl) {
      var gSpanStr = "الموافق بالميلادي: من " + dig(gStart.d) + " " + GM[gStart.m - 1] + " " + dig(gStart.y) +
                     " إلى " + dig(gEnd.d) + " " + GM[gEnd.m - 1] + " " + dig(gEnd.y) + " م (" + countDays(monthLen) + ")";
      subEl.textContent = gSpanStr;
    }

    // Prev / Next button states
    var prevBtn = $("btn-prev-month");
    if (prevBtn) prevBtn.disabled = (curY === 1300 && curM === 1);
    var nextBtn = $("btn-next-month");
    if (nextBtn) nextBtn.disabled = (curY === 1600 && curM === 12);

    // Build Grid
    // Columns: Sat (0), Sun (1), Mon (2), Tue (3), Wed (4), Thu (5), Fri (6)
    var startWeekday = DC.weekday(sN); // 0=Sun, 1=Mon, ..., 6=Sat
    var offset = (startWeekday + 1) % 7; // cells before 1st

    var tbody = $("cal-grid-body");
    if (!tbody) return;

    var html = "";
    var currentDay = 1;
    var done = false;

    while (!done) {
      html += "<tr>";
      for (var col = 0; col < 7; col++) {
        if ((currentDay === 1 && col < offset) || currentDay > monthLen) {
          html += '<td class="cal-cell is-empty" aria-hidden="true"></td>';
        } else {
          var dayN = sN + currentDay - 1;
          var g = G.fromDays(dayN);
          var isToday = (dayN === todayN);
          var isSel = (currentDay === selD);
          var isFri = (col === 6);

          var classes = ["cal-cell"];
          if (isToday) classes.push("is-today");
          if (isSel) classes.push("is-selected");
          if (isFri) classes.push("is-friday");

          var labelText = WEEKDAYS_SAT[col] + " " + dig(currentDay) + " " + HM[curM - 1] + " الموافق " +
                          dig(g.d) + " " + GM[g.m - 1] + " " + dig(g.y) + " م";

          html += '<td class="' + classes.join(" ") + '" data-day="' + currentDay + '" tabindex="0" role="gridcell" aria-label="' + DC.esc(labelText) + '">' +
            '<div class="cal-cell-content">' +
              '<span class="cal-h-day">' + dig(currentDay) + '</span>' +
              '<span class="cal-g-day">' + dig(g.d) + ' ' + GM[g.m - 1] + '</span>' +
            '</div>' +
          '</td>';

          currentDay++;
          if (currentDay > monthLen) {
            // Fill remaining columns in the week row
            for (var remain = col + 1; remain < 7; remain++) {
              html += '<td class="cal-cell is-empty" aria-hidden="true"></td>';
            }
            done = true;
            break;
          }
        }
      }
      html += "</tr>";
    }

    tbody.innerHTML = html;

    // Attach click and enter handlers to cells
    var cells = tbody.querySelectorAll(".cal-cell:not(.is-empty)");
    cells.forEach(function (cell) {
      var d = parseInt(cell.getAttribute("data-day"), 10);
      function select() {
        selD = d;
        cells.forEach(function (c) { c.classList.remove("is-selected"); });
        cell.classList.add("is-selected");
        renderSelectedDayInfo();
      }
      cell.addEventListener("click", select);
      cell.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          select();
        }
      });
    });

    renderSelectedDayInfo();
  }

  function renderSelectedDayInfo() {
    var infoEl = $("cal-selected-info");
    if (!infoEl) return;

    var monthLen = H.dim(curY, curM);
    var d = Math.max(1, Math.min(selD, monthLen));
    var sN = H.toDays(curY, curM, d);
    var g = G.fromDays(sN);
    var w = DC.weekday(sN);

    var weekdayName = WEEKDAYS_SAT[(w + 1) % 7];
    var hDateText = weekdayName + " " + dig(d) + " " + HM[curM - 1] + " " + dig(curY) + " هـ";
    var gDateText = dig(g.d) + " " + GM[g.m - 1] + " " + dig(g.y) + " م";

    var hDateLabel = $("sel-hijri-date");
    if (hDateLabel) hDateLabel.textContent = hDateText;

    var gDateLabel = $("sel-greg-date");
    if (gDateLabel) gDateLabel.textContent = gDateText;

    var toAgeLink = $("sel-to-age");
    if (toAgeLink) {
      toAgeLink.href = "/ar/?by=" + curY + "&bm=" + curM + "&bd=" + d + "&bcal=h";
    }

    var toConvLink = $("sel-to-conv");
    if (toConvLink) {
      toConvLink.href = "/ar/hijri-converter/";
    }
  }

  function renderYearTable(hy) {
    hy = Math.max(1300, Math.min(1600, hy));
    var titleEl = $("tbl-year-num");
    if (titleEl) titleEl.textContent = dig(hy);

    var total = 0;
    var html = "";

    for (var m = 1; m <= 12; m++) {
      var len = H.dim(hy, m);
      total += len;
      var sN = H.toDays(hy, m, 1);
      var eN = sN + len - 1;
      var gS = G.fromDays(sN);
      var gE = G.fromDays(eN);

      var isCurMonth = (hy === curY && m === curM);
      var cls = isCurMonth ? ' class="is-you"' : "";

      var gStartStr = dig(gS.d) + " " + GM[gS.m - 1] + " " + dig(gS.y) + " م";
      var gEndStr = dig(gE.d) + " " + GM[gE.m - 1] + " " + dig(gE.y) + " م";

      html += '<tr' + cls + '>' +
        '<td><strong>' + num(m) + '. ' + HM[m - 1] + '</strong></td>' +
        '<td>' + countDays(len) + '</td>' +
        '<td>' + DC.esc(gStartStr) + '</td>' +
        '<td>' + DC.esc(gEndStr) + '</td>' +
        '<td>' + getMonthType(m) + '</td>' +
      '</tr>';
    }

    var tbody = $("year-months-tbody");
    if (tbody) tbody.innerHTML = html;

    var summaryEl = $("year-summary-text");
    if (summaryEl) {
      var isLeapYear = (total === 355);
      var typeDesc = isLeapYear ? "سنة هجرية كبيسة" : "سنة هجرية بسيطة";
      summaryEl.textContent = typeDesc + " (" + countDays(total) + ") وفق تقويم أم القرى الرسمي.";
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
      populateMonthSelect();
      setMonth(curY, curM, true);
    }

    latnRadio.addEventListener("change", onDigitChange);
    arabRadio.addEventListener("change", onDigitChange);
  }

  function initEvents() {
    var prevBtn = $("btn-prev-month");
    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        if (curM > 1) {
          setMonth(curY, curM - 1, false);
        } else if (curY > 1300) {
          setMonth(curY - 1, 12, false);
        }
      });
    }

    var nextBtn = $("btn-next-month");
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        if (curM < 12) {
          setMonth(curY, curM + 1, false);
        } else if (curY < 1600) {
          setMonth(curY + 1, 1, false);
        }
      });
    }

    var todayBtn = $("btn-today");
    if (todayBtn) {
      todayBtn.addEventListener("click", function () {
        var th = getTodayHijri();
        selD = th.d;
        setMonth(th.y, th.m, true);
      });
    }

    var selM = $("select-month");
    if (selM) {
      selM.addEventListener("change", function () {
        var m = parseInt(selM.value, 10);
        if (m >= 1 && m <= 12) {
          setMonth(curY, m, false);
        }
      });
    }

    var inputY = $("input-year");
    if (inputY) {
      inputY.addEventListener("change", function () {
        var clean = DC.toLatinDigits(inputY.value).replace(/[^0-9]/g, "");
        var y = parseInt(clean, 10);
        if (y >= 1300 && y <= 1600) {
          setMonth(y, curM, true);
        } else {
          inputY.value = String(curY);
        }
      });
      inputY.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          inputY.blur();
        }
      });
    }
  }

  function init() {
    makeFormats();
    populateMonthSelect();

    var params = DC.readParams();
    var th = getTodayHijri();

    var initY = th ? th.y : 1448;
    var initM = th ? th.m : 6;
    selD = th ? th.d : 1;

    if (params.y) {
      var py = parseInt(DC.toLatinDigits(params.y), 10);
      if (py >= 1300 && py <= 1600) initY = py;
    }
    if (params.m) {
      var pm = parseInt(DC.toLatinDigits(params.m), 10);
      if (pm >= 1 && pm <= 12) initM = pm;
    }

    setMonth(initY, initM, true);
    initDigits();
    initEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
