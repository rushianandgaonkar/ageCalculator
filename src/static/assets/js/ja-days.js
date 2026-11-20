/* ja-days.js — 日数計算: 2つの日付間の日数計算と指定日数の計算（何日後・何日前） */
(function () {
  "use strict";
  var G = DC.Gregorian;
  var $ = function (id) { return document.getElementById(id); };

  var modeDiffRadio = $("mode-diff");
  var modeAddRadio = $("mode-add");
  var formDiff = $("form-diff");
  var formAdd = $("form-add");

  var diffStartField = new DC.DateField($("diff-start"));
  var diffEndField = new DC.DateField($("diff-end"));
  var diffIncCheck = $("diff-include-end");

  var addStartField = new DC.DateField($("add-start"));
  var addAmountInput = $("add-amount");
  var addUnitSelect = $("add-unit");
  var dirAfterRadio = $("dir-after");

  var result = $("result");
  var nf = new Intl.NumberFormat("ja-JP");
  var share = null;

  var WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
  var ERAS = [
    ["令和", 2018, [2019, 5, 1]],
    ["平成", 1988, [1989, 1, 8]],
    ["昭和", 1925, [1926, 12, 25]],
    ["大正", 1911, [1912, 7, 30]],
    ["明治", 1867, [1868, 1, 25]]
  ];

  function eraOfDate(y, m, d) {
    var n = G.toDays(y, m, d);
    if (n === null) return "";
    for (var i = 0; i < ERAS.length; i++) {
      var s = ERAS[i][2];
      if (n >= G.toDays(s[0], s[1], s[2])) {
        var k = y - ERAS[i][1];
        return ERAS[i][0] + (k === 1 ? "元" : k) + "年";
      }
    }
    return "";
  }

  function fmtJa(d) {
    var n = G.toDays(d.y, d.m, d.d);
    var w = WEEKDAYS[DC.weekday(n)];
    return d.y + "年" + d.m + "月" + d.d + "日（" + w + "）";
  }

  function validate(field, label) {
    if (field.isEmpty()) { field.error(""); return null; }
    var v = field.get();
    if (!v) { field.error(""); return null; }
    if (v.y < 1800 || v.y > 2200) { field.error("1800年〜2200年の範囲で入力してください。"); return null; }
    if (G.toDays(v.y, v.m, v.d) === null) { field.error("入力された" + label + "は存在しません。月と日を確認してください。"); return null; }
    field.error("");
    return v;
  }

  function statRow(dt, dd) {
    return "<div><dt>" + DC.esc(dt) + "</dt><dd>" + DC.esc(dd) + "</dd></div>";
  }

  function getMode() {
    return modeAddRadio && modeAddRadio.checked ? "add" : "diff";
  }

  function update() {
    share = null;
    var mode = getMode();

    if (mode === "diff") {
      var a = validate(diffStartField, "開始日");
      var b = validate(diffEndField, "終了日");
      if (!a || !b) {
        result.setAttribute("data-state", "empty");
        return;
      }

      var an = G.toDays(a.y, a.m, a.d);
      var bn = G.toDays(b.y, b.m, b.d);
      var isInclusive = diffIncCheck ? diffIncCheck.checked : false;

      var earlierN = Math.min(an, bn);
      var laterN = Math.max(an, bn);
      var earlier = an <= bn ? a : b;
      var later = an <= bn ? b : a;

      var rawDiff = laterN - earlierN;
      var totalDays = isInclusive ? rawDiff + 1 : rawDiff;
      var weeks = Math.floor(totalDays / 7);
      var remDays = totalDays % 7;

      var cDiff = DC.age(G, earlier, later);
      var ymdText = "";
      if (cDiff) {
        var parts = [];
        if (cDiff.y > 0) parts.push(cDiff.y + "年");
        if (cDiff.m > 0) parts.push(cDiff.m + "ヶ月");
        if (cDiff.d > 0 || parts.length === 0) parts.push(cDiff.d + "日");
        ymdText = parts.join(" ");
      }

      var bizDays = DC.businessDays(G, a, b, isInclusive);
      var weekendDays = totalDays - bizDays;
      var totalHours = totalDays * 24;

      var yearDays = DC.isLeap(a.y) || DC.isLeap(b.y) ? 366 : 365;
      var pctOfYear = ((totalDays / yearDays) * 100).toFixed(1) + "%";

      var captionText = fmtJa(earlier) + " から " + fmtJa(later) + " まで" + (isInclusive ? "（両端入れ）" : "（片落とし）");
      $("r-caption").textContent = captionText;
      $("r-main").textContent = nf.format(totalDays);
      $("r-unit").textContent = "日";
      $("r-sub").textContent = ymdText ? "カレンダー換算: " + ymdText : "";

      var statsHtml = "";
      statsHtml += statRow("週数換算", nf.format(weeks) + "週" + (remDays > 0 ? " と " + remDays + "日" : ""));
      statsHtml += statRow("営業日数（平日）", nf.format(bizDays) + "日（土日を除く月〜金）");
      statsHtml += statRow("休日数（土日）", nf.format(weekendDays) + "日");
      statsHtml += statRow("合計時間数", nf.format(totalHours) + "時間");
      statsHtml += statRow("1年に占める割合", pctOfYear + "（" + yearDays + "日中）");

      $("r-stats").innerHTML = statsHtml;
      result.setAttribute("data-state", "ready");

      share = {
        mode: "diff",
        d1: DC.iso(a),
        d2: DC.iso(b),
        inc: isInclusive ? "1" : ""
      };
    } else {
      var start = validate(addStartField, "基準日");
      if (!start) {
        result.setAttribute("data-state", "empty");
        return;
      }

      var amtVal = addAmountInput.value.trim();
      var cleanAmt = DC.toLatinDigits(amtVal).replace(/[^0-9]/g, "");
      if (cleanAmt !== amtVal) addAmountInput.value = cleanAmt;
      var amount = cleanAmt === "" ? null : parseInt(cleanAmt, 10);

      if (amount === null || isNaN(amount) || amount < 0) {
        result.setAttribute("data-state", "empty");
        return;
      }

      var isAfter = dirAfterRadio ? dirAfterRadio.checked : true;
      var op = isAfter ? "add" : "sub";
      var unit = addUnitSelect ? addUnitSelect.value : "days";

      var target = null;
      if (unit === "biz") {
        target = isAfter ? DC.addBusinessDays(G, start, amount) : DC.addBusinessDays(G, start, -amount);
      } else {
        target = DC.addUnits(G, start, amount, unit, op);
      }

      if (!target) {
        result.setAttribute("data-state", "empty");
        return;
      }

      var startN = G.toDays(start.y, start.m, start.d);
      var targetN = G.toDays(target.y, target.m, target.d);
      var todayParts = DC.todayParts();
      var todayN = G.toDays(todayParts.y, todayParts.m, todayParts.d);

      var unitLabels = {
        days: "日",
        biz: "営業日",
        weeks: "週間",
        months: "ヶ月",
        years: "年"
      };
      var unitLabel = unitLabels[unit] || "日";
      var dirLabel = isAfter ? "後" : "前";

      var captionText = fmtJa(start) + " の " + nf.format(amount) + unitLabel + dirLabel;
      var targetWeekday = WEEKDAYS[DC.weekday(targetN)];
      var targetEra = eraOfDate(target.y, target.m, target.d);

      $("r-caption").textContent = captionText;
      $("r-main").textContent = target.y + "年" + target.m + "月" + target.d + "日";
      $("r-unit").textContent = "（" + targetWeekday + "）";
      $("r-sub").textContent = targetEra ? "和暦: " + targetEra + target.m + "月" + target.d + "日" : "";

      var daysDiff = Math.abs(targetN - startN);
      var fromToday = targetN - todayN;
      var fromTodayText = fromToday === 0 ? "今日" : (fromToday > 0 ? "今日から " + nf.format(fromToday) + "日後" : "今日から " + nf.format(Math.abs(fromToday)) + "日前");

      var dec31N = G.toDays(target.y, 12, 31);
      var remOfYear = dec31N - targetN;

      var statsHtml = "";
      statsHtml += statRow("計算対象", nf.format(amount) + unitLabel + dirLabel + "（" + nf.format(daysDiff) + "暦日）");
      statsHtml += statRow("曜日", targetWeekday + "曜日");
      statsHtml += statRow("今日からの日数", fromTodayText);
      statsHtml += statRow("年間週番号", "第" + DC.isoWeekNumber(target) + "週");
      statsHtml += statRow("年末までの残日数", nf.format(remOfYear) + "日");

      $("r-stats").innerHTML = statsHtml;
      result.setAttribute("data-state", "ready");

      share = {
        mode: "add",
        d1: DC.iso(start),
        amt: String(amount),
        dir: isAfter ? "after" : "before",
        u: unit
      };
    }
  }

  function setMode(newMode) {
    if (newMode === "add") {
      modeAddRadio.checked = true;
      formDiff.hidden = true;
      formAdd.hidden = false;
    } else {
      modeDiffRadio.checked = true;
      formDiff.hidden = false;
      formAdd.hidden = true;
    }
    update();
  }

  if (modeDiffRadio) modeDiffRadio.addEventListener("change", function () { setMode("diff"); });
  if (modeAddRadio) modeAddRadio.addEventListener("change", function () { setMode("add"); });

  diffStartField.on(update);
  diffEndField.on(update);
  if (diffIncCheck) diffIncCheck.addEventListener("change", update);

  addStartField.on(update);
  if (addAmountInput) addAmountInput.addEventListener("input", update);
  if (addUnitSelect) addUnitSelect.addEventListener("change", update);
  if (dirAfterRadio) {
    dirAfterRadio.addEventListener("change", update);
    var dirBeforeRadio = $("dir-before");
    if (dirBeforeRadio) dirBeforeRadio.addEventListener("change", update);
  }

  // Reset to today buttons
  var btnDiffStartToday = $("btn-diff-start-today");
  if (btnDiffStartToday) {
    btnDiffStartToday.addEventListener("click", function () {
      diffStartField.set(DC.todayParts());
      update();
    });
  }
  var btnAddStartToday = $("btn-add-start-today");
  if (btnAddStartToday) {
    btnAddStartToday.addEventListener("click", function () {
      addStartField.set(DC.todayParts());
      update();
    });
  }

  // Presets in Mode 1 (Diff)
  function setDiffPreset(offsetDays, toEndOfMonth, toEndOfYear) {
    var a = diffStartField.get() || DC.todayParts();
    if (toEndOfMonth) {
      var daysInM = G.dim(a.y, a.m);
      diffEndField.set({ y: a.y, m: a.m, d: daysInM });
    } else if (toEndOfYear) {
      diffEndField.set({ y: a.y, m: 12, d: 31 });
    } else if (offsetDays != null) {
      var target = DC.addDays(G, a, offsetDays);
      diffEndField.set(target);
    }
    update();
  }

  var pd30 = $("preset-diff-30"); if (pd30) pd30.addEventListener("click", function () { setDiffPreset(30, false, false); });
  var pd60 = $("preset-diff-60"); if (pd60) pd60.addEventListener("click", function () { setDiffPreset(60, false, false); });
  var pd90 = $("preset-diff-90"); if (pd90) pd90.addEventListener("click", function () { setDiffPreset(90, false, false); });
  var pd100 = $("preset-diff-100"); if (pd100) pd100.addEventListener("click", function () { setDiffPreset(100, false, false); });
  var pdMonth = $("preset-diff-month"); if (pdMonth) pdMonth.addEventListener("click", function () { setDiffPreset(null, true, false); });
  var pdYear = $("preset-diff-year"); if (pdYear) pdYear.addEventListener("click", function () { setDiffPreset(null, false, true); });

  // Presets in Mode 2 (Add)
  function setAddPreset(offsetDays, toEndOfMonth, toEndOfYear) {
    var a = addStartField.get() || DC.todayParts();
    if (dirAfterRadio) dirAfterRadio.checked = true;
    if (addUnitSelect) addUnitSelect.value = "days";

    if (toEndOfMonth) {
      var dim = G.dim(a.y, a.m);
      var diff = dim - a.d;
      addAmountInput.value = String(Math.max(0, diff));
    } else if (toEndOfYear) {
      var dec31N = G.toDays(a.y, 12, 31);
      var curN = G.toDays(a.y, a.m, a.d);
      addAmountInput.value = String(Math.max(0, dec31N - curN));
    } else if (offsetDays != null) {
      addAmountInput.value = String(offsetDays);
    }
    update();
  }

  var pa30 = $("preset-add-30"); if (pa30) pa30.addEventListener("click", function () { setAddPreset(30, false, false); });
  var pa60 = $("preset-add-60"); if (pa60) pa60.addEventListener("click", function () { setAddPreset(60, false, false); });
  var pa90 = $("preset-add-90"); if (pa90) pa90.addEventListener("click", function () { setAddPreset(90, false, false); });
  var pa100 = $("preset-add-100"); if (pa100) pa100.addEventListener("click", function () { setAddPreset(100, false, false); });
  var paMonth = $("preset-add-month"); if (paMonth) paMonth.addEventListener("click", function () { setAddPreset(null, true, false); });
  var paYear = $("preset-add-year"); if (paYear) paYear.addEventListener("click", function () { setAddPreset(null, false, true); });

  // Share link
  var copyBtn = $("copy");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      DC.copyLink(copyBtn, "リンクをコピーしました", function () { return share; });
    });
  }

  // Restore state from URL parameters or defaults
  var params = DC.readParams();
  var today = DC.todayParts();

  if (params.mode === "add") {
    setMode("add");
    var p1 = DC.parseIso(params.d1);
    if (p1) addStartField.set(p1);
    else addStartField.set(today);

    if (params.amt && /^\d+$/.test(params.amt)) addAmountInput.value = params.amt;
    if (params.dir === "before") {
      var dirB = $("dir-before");
      if (dirB) dirB.checked = true;
    }
    if (params.u && addUnitSelect) addUnitSelect.value = params.u;
  } else {
    setMode("diff");
    var p1 = DC.parseIso(params.d1);
    var p2 = DC.parseIso(params.d2);
    if (p1) diffStartField.set(p1);
    else diffStartField.set(today);

    if (p2) diffEndField.set(p2);
    else diffEndField.set(DC.addDays(G, today, 30));

    if (params.inc === "1" && diffIncCheck) diffIncCheck.checked = true;
  }

  DC.autoReveal(diffEndField, result, "日付を変更");
  DC.autoReveal(addStartField, result, "日付を変更");
  update();
})();
