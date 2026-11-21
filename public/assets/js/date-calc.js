/* date-calc.js: add or subtract days, weeks, months or years from any date. */
(function () {
  "use strict";
  var G = DC.Gregorian;
  var $ = function (id) { return document.getElementById(id); };
  var startField = new DC.DateField($("start-date"));
  var amountInput = $("amount");
  var unitSelect = $("unit");
  var result = $("result");
  var nf = new Intl.NumberFormat("en-US");
  var df = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" });
  var dfDateOnly = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
  var wf = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long" });
  var share = null;

  function plural(n, w) { return nf.format(n) + " " + w + (n === 1 ? "" : "s"); }
  function fmt(dayNum) { return df.format(DC.dateObj(dayNum)); }
  function fmtDateOnly(dayNum) { return dfDateOnly.format(DC.dateObj(dayNum)); }

  function getOp() {
    var checked = document.querySelector('input[name="op"]:checked');
    return checked ? checked.value : "add";
  }

  function validateStart() {
    if (startField.isEmpty()) { startField.error(""); return null; }
    var v = startField.get();
    if (!v) { startField.error(""); return null; }
    if (v.y < 1800 || v.y > 2200) { startField.error("Enter a year between 1800 and 2200."); return null; }
    if (G.toDays(v.y, v.m, v.d) === null) { startField.error("That date doesn’t exist. Check the day and month."); return null; }
    startField.error("");
    return v;
  }

  function statRow(dt, dd) {
    return "<div><dt>" + DC.esc(dt) + "</dt><dd>" + DC.esc(dd) + "</dd></div>";
  }

  function update() {
    share = null;
    var start = validateStart();
    if (!start) {
      result.setAttribute("data-state", "empty");
      return;
    }

    var amtVal = amountInput.value.trim();
    var cleanAmt = DC.toLatinDigits(amtVal).replace(/[^0-9]/g, "");
    if (cleanAmt !== amtVal) amountInput.value = cleanAmt;
    var amount = cleanAmt === "" ? null : parseInt(cleanAmt, 10);

    if (amount === null || isNaN(amount) || amount < 0) {
      result.setAttribute("data-state", "empty");
      return;
    }

    var op = getOp();
    var unit = unitSelect.value;
    var target = DC.addUnits(G, start, amount, unit, op);
    if (!target) {
      result.setAttribute("data-state", "empty");
      return;
    }

    var startN = G.toDays(start.y, start.m, start.d);
    var targetN = G.toDays(target.y, target.m, target.d);
    var todayN = G.toDays(DC.todayParts().y, DC.todayParts().m, DC.todayParts().d);

    var isStartToday = startN === todayN;
    var unitLabel = unit === "businessDays" ? (amount === 1 ? "business day" : "business days")
      : (unit === "days" ? (amount === 1 ? "day" : "days")
      : (unit === "weeks" ? (amount === 1 ? "week" : "weeks")
      : (unit === "months" ? (amount === 1 ? "month" : "months")
      : (amount === 1 ? "year" : "years"))));

    var distanceText = nf.format(amount) + " " + unitLabel + (op === "add" ? " after " : " before ") + fmtDateOnly(startN);
    if (isStartToday) {
      distanceText = nf.format(amount) + " " + unitLabel + (op === "add" ? " from today" : " ago");
    }

    var diffFromToday = targetN - todayN;
    var relativeToTodayText = diffFromToday === 0 ? "Today"
      : (diffFromToday > 0 ? "In " + plural(diffFromToday, "day")
      : plural(Math.abs(diffFromToday), "day") + " ago");

    var doy = DC.dayOfYear(G, target);
    var totalYearDays = DC.isLeap(target.y) ? 366 : 365;
    var weekNum = DC.isoWeekNumber(target);

    $("r-caption").textContent = op === "add" ? "Calculated target date" : "Calculated past date";
    $("r-date").textContent = fmt(targetN);
    $("r-sub").textContent = distanceText;

    var statsHtml = "";
    statsHtml += statRow("Day of the week", wf.format(DC.dateObj(targetN)));
    statsHtml += statRow("Day of the year", "Day " + doy + " of " + totalYearDays);
    statsHtml += statRow("ISO week number", "Week " + weekNum);
    statsHtml += statRow("Relative to today", relativeToTodayText);
    statsHtml += statRow("Calendar year", target.y + (DC.isLeap(target.y) ? " (leap year)" : " (standard year)"));

    $("r-stats").innerHTML = statsHtml;
    result.setAttribute("data-state", "ready");

    share = {
      date: DC.iso(start),
      op: op,
      amount: String(amount),
      unit: unit
    };
  }

  // Hook inputs
  startField.on(update);
  amountInput.addEventListener("input", update);
  unitSelect.addEventListener("change", update);
  document.querySelectorAll('input[name="op"]').forEach(function (radio) {
    radio.addEventListener("change", update);
  });

  // Today reset button
  var btnToday = $("btn-start-today");
  if (btnToday) {
    btnToday.addEventListener("click", function () {
      startField.set(DC.todayParts());
      update();
    });
  }

  // Preset chips
  function setPreset(amount, unit, op) {
    startField.set(DC.todayParts());
    amountInput.value = String(amount);
    unitSelect.value = unit;
    var targetRadio = document.querySelector('input[name="op"][value="' + (op || "add") + '"]');
    if (targetRadio) targetRadio.checked = true;
    update();
  }

  var p30 = $("preset-30");
  if (p30) p30.addEventListener("click", function () { setPreset(30, "days", "add"); });
  var p60 = $("preset-60");
  if (p60) p60.addEventListener("click", function () { setPreset(60, "days", "add"); });
  var p90 = $("preset-90");
  if (p90) p90.addEventListener("click", function () { setPreset(90, "days", "add"); });
  var p100 = $("preset-100");
  if (p100) p100.addEventListener("click", function () { setPreset(100, "days", "add"); });
  var p6m = $("preset-6m");
  if (p6m) p6m.addEventListener("click", function () { setPreset(6, "months", "add"); });
  var p1y = $("preset-1y");
  if (p1y) p1y.addEventListener("click", function () { setPreset(1, "years", "add"); });

  // Share URL copy button
  var copyBtn = $("copy");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      DC.copyLink(copyBtn, "Link copied!", function () { return share; });
    });
  }

  // Load from URL or defaults
  var params = DC.readParams();
  var parsedDate = DC.parseIso(params.date);
  if (parsedDate) startField.set(parsedDate);
  else startField.set(DC.todayParts());

  if (params.op === "sub") {
    var subRadio = document.querySelector('input[name="op"][value="sub"]');
    if (subRadio) subRadio.checked = true;
  }
  if (params.amount && !isNaN(parseInt(params.amount, 10))) {
    amountInput.value = String(Math.abs(parseInt(params.amount, 10)));
  } else {
    amountInput.value = "30";
  }
  if (params.unit && ["days", "businessDays", "weeks", "months", "years"].indexOf(params.unit) !== -1) {
    unitSelect.value = params.unit;
  } else {
    unitSelect.value = "days";
  }

  update();
  DC.autoReveal(startField, result, "start date");
})();
