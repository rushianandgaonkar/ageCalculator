/* days-between.js: calculate exact days, weeks, months and business days between two dates. */
(function () {
  "use strict";
  var G = DC.Gregorian;
  var $ = function (id) { return document.getElementById(id); };
  var d1Field = new DC.DateField($("start-date"));
  var d2Field = new DC.DateField($("end-date"));
  var incCheck = $("include-end");
  var result = $("result");
  var nf = new Intl.NumberFormat("en-US");
  var df = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
  var dfShort = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
  var wf = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long" });
  var share = null;

  function plural(n, w) { return nf.format(n) + " " + w + (n === 1 ? "" : "s"); }
  function fmt(dayNum) { return df.format(DC.dateObj(dayNum)); }

  function validate(field, label) {
    if (field.isEmpty()) { field.error(""); return null; }
    var v = field.get();
    if (!v) { field.error(""); return null; }
    if (v.y < 1800 || v.y > 2200) { field.error("Enter a year between 1800 and 2200."); return null; }
    if (G.toDays(v.y, v.m, v.d) === null) { field.error("That " + label + " doesn’t exist. Check the day and month."); return null; }
    field.error("");
    return v;
  }

  function statRow(dt, dd) {
    return "<div><dt>" + DC.esc(dt) + "</dt><dd>" + DC.esc(dd) + "</dd></div>";
  }

  function update() {
    share = null;
    var a = validate(d1Field, "start date");
    var b = validate(d2Field, "end date");
    if (!a || !b) {
      result.setAttribute("data-state", "empty");
      return;
    }

    var an = G.toDays(a.y, a.m, a.d);
    var bn = G.toDays(b.y, b.m, b.d);
    var isInclusive = incCheck ? incCheck.checked : false;

    var earlierN = Math.min(an, bn);
    var laterN = Math.max(an, bn);
    var earlierDate = an <= bn ? a : b;
    var laterDate = an <= bn ? b : a;

    var rawDiff = laterN - earlierN;
    var totalDays = isInclusive ? rawDiff + 1 : rawDiff;
    var weeks = Math.floor(totalDays / 7);
    var remDays = totalDays % 7;

    // Calendar breakdown (years, months, days)
    var cDiff = DC.age(G, earlierDate, laterDate);
    var ymdText = "";
    if (cDiff) {
      var parts = [];
      if (cDiff.y > 0) parts.push(plural(cDiff.y, "year"));
      if (cDiff.m > 0) parts.push(plural(cDiff.m, "month"));
      if (cDiff.d > 0 || parts.length === 0) parts.push(plural(cDiff.d, "day"));
      ymdText = parts.join(", ");
    }

    // Business days and weekend days
    var bizDays = DC.businessDays(G, a, b, isInclusive);
    var weekendDays = totalDays - bizDays;
    var totalHours = totalDays * 24;
    var totalMinutes = totalHours * 60;

    var yearDays = DC.isLeap(a.y) || DC.isLeap(b.y) ? 366 : 365;
    var pctOfYear = ((totalDays / yearDays) * 100).toFixed(1) + "%";

    // Result header
    var captionText = "From " + fmt(earlierN) + " to " + fmt(laterN);
    if (isInclusive) captionText += " (inclusive)";

    $("r-caption").textContent = captionText;
    $("r-days").textContent = nf.format(totalDays);
    $("r-days-unit").textContent = totalDays === 1 ? "day" : "days";
    $("r-sub").textContent = ymdText ? "Equivalent to " + ymdText : "";

    // Stats breakdown
    var statsHtml = "";
    statsHtml += statRow("Weeks and days", plural(weeks, "week") + (remDays > 0 ? " and " + plural(remDays, "day") : ""));
    statsHtml += statRow("Business days", plural(bizDays, "working day") + " (Mon to Fri)");
    statsHtml += statRow("Weekend days", plural(weekendDays, "weekend day") + " (Sat and Sun)");
    statsHtml += statRow("Total hours", plural(totalHours, "hour"));
    statsHtml += statRow("Total minutes", plural(totalMinutes, "minute"));
    statsHtml += statRow("Share of a year", pctOfYear + " of " + yearDays + " days");

    $("r-stats").innerHTML = statsHtml;
    result.setAttribute("data-state", "ready");

    share = {
      d1: DC.iso(a),
      d2: DC.iso(b),
      inc: isInclusive ? "1" : ""
    };
  }

  // Hook input events
  d1Field.on(update);
  d2Field.on(update);
  if (incCheck) incCheck.addEventListener("change", update);

  // Setup presets
  var btnStartToday = $("btn-start-today");
  if (btnStartToday) {
    btnStartToday.addEventListener("click", function () {
      d1Field.set(DC.todayParts());
      update();
    });
  }

  function setPresetEnd(offsetDays, toEndOfMonth, toEndOfYear) {
    var a = d1Field.get() || DC.todayParts();
    var cal = G;
    if (toEndOfMonth) {
      var daysInM = cal.dim(a.y, a.m);
      d2Field.set({ y: a.y, m: a.m, d: daysInM });
    } else if (toEndOfYear) {
      d2Field.set({ y: a.y, m: 12, d: 31 });
    } else if (offsetDays != null) {
      var target = DC.addDays(cal, a, offsetDays);
      d2Field.set(target);
    }
    update();
  }

  var presetMonth = $("preset-month-end");
  if (presetMonth) presetMonth.addEventListener("click", function () { setPresetEnd(null, true, false); });

  var presetYear = $("preset-year-end");
  if (presetYear) presetYear.addEventListener("click", function () { setPresetEnd(null, false, true); });

  var preset30 = $("preset-30");
  if (preset30) preset30.addEventListener("click", function () { setPresetEnd(30, false, false); });

  var preset90 = $("preset-90");
  if (preset90) preset90.addEventListener("click", function () { setPresetEnd(90, false, false); });

  var preset180 = $("preset-180");
  if (preset180) preset180.addEventListener("click", function () { setPresetEnd(180, false, false); });

  var preset365 = $("preset-365");
  if (preset365) preset365.addEventListener("click", function () { setPresetEnd(365, false, false); });

  // Share URL copy button
  var copyBtn = $("copy");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      DC.copyLink(copyBtn, "Link copied!", function () { return share; });
    });
  }

  // Initial load from URL or defaults
  var params = DC.readParams();
  var p1 = DC.parseIso(params.d1);
  var p2 = DC.parseIso(params.d2);

  if (p1) d1Field.set(p1);
  else d1Field.set(DC.todayParts());

  if (p2) d2Field.set(p2);
  else d2Field.set(DC.addDays(G, DC.todayParts(), 30));

  if (params.inc === "1" && incCheck) incCheck.checked = true;

  update();
  DC.autoReveal(d2Field, result, "end date");
})();
