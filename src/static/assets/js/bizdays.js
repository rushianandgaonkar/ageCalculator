/* bizdays.js — calculate business days between dates or add/subtract working days. */
(function () {
  "use strict";
  var G = DC.Gregorian;
  var $ = function (id) { return document.getElementById(id); };
  var d1Field = new DC.DateField($("start-date"));
  var d2Field = new DC.DateField($("end-date"));
  var incCheck = $("include-end");
  var amountInput = $("amount");
  var hoursPerDayInput = $("hours-per-day");
  var result = $("result");

  var nf = new Intl.NumberFormat("en-US");
  var df = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" });
  var dfDateOnly = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
  var wf = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long" });
  var share = null;

  function plural(n, w) { return nf.format(n) + " " + w + (n === 1 ? "" : "s"); }
  function fmt(dayNum) { return df.format(DC.dateObj(dayNum)); }
  function fmtDateOnly(dayNum) { return dfDateOnly.format(DC.dateObj(dayNum)); }

  function getMode() {
    var checked = document.querySelector('input[name="biz-mode"]:checked');
    return checked ? checked.value : "between";
  }

  function getOp() {
    var checked = document.querySelector('input[name="biz-op"]:checked');
    return checked ? checked.value : "add";
  }

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
    var mode = getMode();
    var a = validate(d1Field, "start date");
    if (!a) {
      result.setAttribute("data-state", "empty");
      return;
    }

    var hoursPerDay = 8;
    if (hoursPerDayInput) {
      var hVal = parseFloat(hoursPerDayInput.value);
      if (!isNaN(hVal) && hVal > 0 && hVal <= 24) hoursPerDay = hVal;
    }

    if (mode === "between") {
      var b = validate(d2Field, "end date");
      if (!b) {
        result.setAttribute("data-state", "empty");
        return;
      }

      var an = G.toDays(a.y, a.m, a.d);
      var bn = G.toDays(b.y, b.m, b.d);
      var isInclusive = incCheck ? incCheck.checked : false;

      var earlierN = Math.min(an, bn);
      var laterN = Math.max(an, bn);
      var rawDiff = laterN - earlierN;
      var totalDays = isInclusive ? rawDiff + 1 : rawDiff;

      var bizDays = DC.businessDays(G, a, b, isInclusive);
      var weekendDays = totalDays - bizDays;
      var totalWorkHours = bizDays * hoursPerDay;

      var weeks = (bizDays / 5).toFixed(1);

      var captionText = "Business days between " + fmtDateOnly(earlierN) + " and " + fmtDateOnly(laterN);
      if (isInclusive) captionText += " (inclusive)";

      $("r-caption").textContent = captionText;
      $("r-big").innerHTML = nf.format(bizDays) + '<span class="unit"> business ' + (bizDays === 1 ? "day" : "days") + '</span>';
      $("r-sub").textContent = "Excludes " + plural(weekendDays, "weekend day") + " (Saturdays and Sundays)";

      var statsHtml = "";
      statsHtml += statRow("Working weeks", weeks + " weeks (5 workdays/week)");
      statsHtml += statRow("Working hours", nf.format(totalWorkHours) + " hours (" + hoursPerDay + " hrs/day)");
      statsHtml += statRow("Total calendar days", plural(totalDays, "day"));
      statsHtml += statRow("Weekend days", plural(weekendDays, "weekend day"));
      statsHtml += statRow("Workday proportion", ((bizDays / (totalDays || 1)) * 100).toFixed(1) + "% of all calendar days");

      $("r-stats").innerHTML = statsHtml;
      result.setAttribute("data-state", "ready");

      share = {
        mode: "between",
        d1: DC.iso(a),
        d2: DC.iso(b),
        inc: isInclusive ? "1" : ""
      };
    } else {
      // Add or subtract business days
      var amtVal = amountInput ? amountInput.value.trim() : "10";
      var cleanAmt = DC.toLatinDigits(amtVal).replace(/[^0-9]/g, "");
      if (cleanAmt !== amtVal && amountInput) amountInput.value = cleanAmt;
      var amount = cleanAmt === "" ? null : parseInt(cleanAmt, 10);

      if (amount === null || isNaN(amount) || amount < 0) {
        result.setAttribute("data-state", "empty");
        return;
      }

      var op = getOp();
      var target = DC.addBusinessDays(G, a, op === "sub" ? -amount : amount);
      if (!target) {
        result.setAttribute("data-state", "empty");
        return;
      }

      var startN = G.toDays(a.y, a.m, a.d);
      var targetN = G.toDays(target.y, target.m, target.d);
      var totalCalendarDays = Math.abs(targetN - startN);
      var weekendDaysSkipped = totalCalendarDays - amount;
      var totalWorkHours = amount * hoursPerDay;

      $("r-caption").textContent = op === "add" ? "Target business date" : "Past business date";
      $("r-big").innerHTML = fmt(targetN);
      $("r-sub").textContent = nf.format(amount) + " business " + (amount === 1 ? "day" : "days") + (op === "add" ? " after " : " before ") + fmtDateOnly(startN);

      var statsHtml = "";
      statsHtml += statRow("Day of the week", wf.format(DC.dateObj(targetN)));
      statsHtml += statRow("Calendar duration", plural(totalCalendarDays, "calendar day") + " elapsed");
      statsHtml += statRow("Weekend days skipped", plural(weekendDaysSkipped, "weekend day"));
      statsHtml += statRow("Working hours", nf.format(totalWorkHours) + " hours (" + hoursPerDay + " hrs/day)");
      statsHtml += statRow("ISO week number", "Week " + DC.isoWeekNumber(target));

      $("r-stats").innerHTML = statsHtml;
      result.setAttribute("data-state", "ready");

      share = {
        mode: "add",
        d1: DC.iso(a),
        op: op,
        amt: String(amount)
      };
    }
  }

  // Hook inputs
  d1Field.on(update);
  d2Field.on(update);
  if (incCheck) incCheck.addEventListener("change", update);
  if (amountInput) amountInput.addEventListener("input", update);
  if (hoursPerDayInput) hoursPerDayInput.addEventListener("input", update);

  document.querySelectorAll('input[name="biz-mode"]').forEach(function (radio) {
    radio.addEventListener("change", function () {
      var isBetween = radio.value === "between";
      $("fieldset-end-date").hidden = !isBetween;
      $("fieldset-add-biz").hidden = isBetween;
      update();
    });
  });

  document.querySelectorAll('input[name="biz-op"]').forEach(function (radio) {
    radio.addEventListener("change", update);
  });

  var btnToday = $("btn-start-today");
  if (btnToday) {
    btnToday.addEventListener("click", function () {
      d1Field.set(DC.todayParts());
      update();
    });
  }

  // Presets
  function setBizPreset(amt, op) {
    var modeBetween = document.querySelector('input[name="biz-mode"][value="add"]');
    if (modeBetween) {
      modeBetween.checked = true;
      $("fieldset-end-date").hidden = true;
      $("fieldset-add-biz").hidden = false;
    }
    d1Field.set(DC.todayParts());
    if (amountInput) amountInput.value = String(amt);
    var opRadio = document.querySelector('input[name="biz-op"][value="' + (op || "add") + '"]');
    if (opRadio) opRadio.checked = true;
    update();
  }

  var p5 = $("preset-5");
  if (p5) p5.addEventListener("click", function () { setBizPreset(5, "add"); });
  var p10 = $("preset-10");
  if (p10) p10.addEventListener("click", function () { setBizPreset(10, "add"); });
  var p20 = $("preset-20");
  if (p20) p20.addEventListener("click", function () { setBizPreset(20, "add"); });
  var p30 = $("preset-30");
  if (p30) p30.addEventListener("click", function () { setBizPreset(30, "add"); });
  var p60 = $("preset-60");
  if (p60) p60.addEventListener("click", function () { setBizPreset(60, "add"); });

  // Share URL copy button
  var copyBtn = $("copy");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      DC.copyLink(copyBtn, "Link copied!", function () { return share; });
    });
  }

  // Initial load
  var params = DC.readParams();
  var parsedD1 = DC.parseIso(params.d1);
  if (parsedD1) d1Field.set(parsedD1);
  else d1Field.set(DC.todayParts());

  if (params.mode === "add") {
    var addModeRadio = document.querySelector('input[name="biz-mode"][value="add"]');
    if (addModeRadio) {
      addModeRadio.checked = true;
      $("fieldset-end-date").hidden = true;
      $("fieldset-add-biz").hidden = false;
    }
    if (params.op === "sub") {
      var subOpRadio = document.querySelector('input[name="biz-op"][value="sub"]');
      if (subOpRadio) subOpRadio.checked = true;
    }
    if (params.amt && !isNaN(parseInt(params.amt, 10)) && amountInput) {
      amountInput.value = String(Math.abs(parseInt(params.amt, 10)));
    }
  } else {
    var parsedD2 = DC.parseIso(params.d2);
    if (parsedD2) d2Field.set(parsedD2);
    else d2Field.set(DC.addDays(G, DC.todayParts(), 30));

    if (params.inc === "1" && incCheck) incCheck.checked = true;
  }

  update();
  DC.autoReveal(d2Field, result, "end date");
})();
