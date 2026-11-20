/* tr-date.js: Turkish date duration and date addition / subtraction calculator. */
(function () {
  "use strict";
  var G = DC.Gregorian;
  var $ = function (id) { return document.getElementById(id); };

  var d1Field = new DC.DateField($("d1-field"));
  var d2Field = new DC.DateField($("d2-field"));
  var baseField = new DC.DateField($("base-field"));
  var incCheck = $("include-end");
  var amountInput = $("amount");
  var unitSelect = $("unit");
  var result = $("result");

  var secDiff = $("section-diff");
  var secAdd = $("section-add");

  var nf = new Intl.NumberFormat("tr-TR");
  var df = new Intl.DateTimeFormat("tr-TR", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
  var wf = new Intl.DateTimeFormat("tr-TR", { timeZone: "UTC", weekday: "long" });
  var share = null;

  function fmt(dayNum) { return df.format(DC.dateObj(dayNum)); }

  function getMode() {
    var checked = document.querySelector('input[name="mode"]:checked');
    return checked ? checked.value : "diff";
  }

  function getOp() {
    var checked = document.querySelector('input[name="op"]:checked');
    return checked ? checked.value : "add";
  }

  function validate(field, label) {
    if (field.isEmpty()) { field.error(""); return null; }
    var v = field.get();
    if (!v) { field.error(""); return null; }
    if (v.y < 1800 || v.y > 2200) { field.error("Lütfen 1800 ile 2200 arasında bir yıl girin."); return null; }
    if (G.toDays(v.y, v.m, v.d) === null) { field.error("Girdiğiniz " + label + " takvimde bulunmuyor."); return null; }
    field.error("");
    return v;
  }

  function statRow(dt, dd) {
    return "<div><dt>" + DC.esc(dt) + "</dt><dd>" + DC.esc(dd) + "</dd></div>";
  }

  function updateDiff() {
    var a = validate(d1Field, "başlangıç tarihi");
    var b = validate(d2Field, "bitiş tarihi");
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

    var cDiff = DC.age(G, earlierDate, laterDate);
    var ymdText = "";
    if (cDiff) {
      var parts = [];
      if (cDiff.y > 0) parts.push(nf.format(cDiff.y) + " yıl");
      if (cDiff.m > 0) parts.push(nf.format(cDiff.m) + " ay");
      if (cDiff.d > 0 || parts.length === 0) parts.push(nf.format(cDiff.d) + " gün");
      ymdText = parts.join(", ");
    }

    var bizDays = DC.businessDays(G, a, b, isInclusive);
    var weekendDays = totalDays - bizDays;
    var totalHours = totalDays * 24;
    var totalMinutes = totalHours * 60;

    var yearDays = DC.isLeap(a.y) || DC.isLeap(b.y) ? 366 : 365;
    var pctOfYear = ((totalDays / yearDays) * 100).toFixed(1) + "%";

    var captionText = fmt(earlierN) + " ile " + fmt(laterN) + " arası";
    if (isInclusive) captionText += " (dahil)";

    $("r-caption").textContent = captionText;
    $("r-main").textContent = nf.format(totalDays);
    $("r-unit").textContent = "gün";
    $("r-sub").textContent = ymdText ? "Takvim karşılığı: " + ymdText : "";

    var statsHtml = "";
    statsHtml += statRow("Hafta ve gün", nf.format(weeks) + " hafta" + (remDays > 0 ? ", " + nf.format(remDays) + " gün" : ""));
    statsHtml += statRow("İş günleri", nf.format(bizDays) + " iş günü (Pazartesi ile Cuma arası)");
    statsHtml += statRow("Hafta sonu günleri", nf.format(weekendDays) + " gün (Cumartesi ve Pazar)");
    statsHtml += statRow("Toplam saat", nf.format(totalHours) + " saat");
    statsHtml += statRow("Toplam dakika", nf.format(totalMinutes) + " dakika");
    statsHtml += statRow("Yıl içerisindeki oranı", pctOfYear + " (toplam " + yearDays + " gün içinden)");

    $("r-stats").innerHTML = statsHtml;
    result.setAttribute("data-state", "ready");

    share = {
      mode: "diff",
      d1: DC.iso(a),
      d2: DC.iso(b),
      inc: isInclusive ? "1" : ""
    };
  }

  function updateAdd() {
    var base = validate(baseField, "tarih");
    if (!base) {
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
    var target = DC.addUnits(G, base, amount, unit, op);
    if (!target) {
      result.setAttribute("data-state", "empty");
      return;
    }

    var baseN = G.toDays(base.y, base.m, base.d);
    var targetN = G.toDays(target.y, target.m, target.d);
    var todayN = G.toDays(DC.todayParts().y, DC.todayParts().m, DC.todayParts().d);

    var unitLabel = unit === "businessDays" ? "iş günü"
      : (unit === "days" ? "gün"
      : (unit === "weeks" ? "hafta"
      : (unit === "months" ? "ay" : "yıl")));

    var distanceText = nf.format(amount) + " " + unitLabel + (op === "add" ? " sonra" : " önce");
    var diffFromToday = targetN - todayN;
    var relativeToTodayText = diffFromToday === 0 ? "Bugün"
      : (diffFromToday > 0 ? nf.format(diffFromToday) + " gün sonra"
      : nf.format(Math.abs(diffFromToday)) + " gün önce");

    var doy = DC.dayOfYear(G, target);
    var totalYearDays = DC.isLeap(target.y) ? 366 : 365;
    var weekNum = DC.isoWeekNumber(target);

    $("r-caption").textContent = op === "add" ? "Hesaplanan hedef tarih" : "Hesaplanan geçmiş tarih";
    $("r-main").textContent = fmt(targetN);
    $("r-unit").textContent = "";
    $("r-sub").textContent = fmt(baseN) + " tarihinden " + distanceText;

    var statsHtml = "";
    statsHtml += statRow("Haftanın günü", wf.format(DC.dateObj(targetN)));
    statsHtml += statRow("Yılın kaçıncı günü", totalYearDays + " gün içinde " + doy + ". gün");
    statsHtml += statRow("ISO hafta numarası", weekNum + ". hafta");
    statsHtml += statRow("Bugüne göre durumu", relativeToTodayText);
    statsHtml += statRow("Takvim yılı", target.y + (DC.isLeap(target.y) ? " (artık yıl)" : " (standart yıl)"));

    $("r-stats").innerHTML = statsHtml;
    result.setAttribute("data-state", "ready");

    share = {
      mode: "add",
      date: DC.iso(base),
      op: op,
      amount: String(amount),
      unit: unit
    };
  }

  function update() {
    share = null;
    var mode = getMode();
    if (mode === "diff") {
      secDiff.hidden = false;
      secAdd.hidden = true;
      updateDiff();
    } else {
      secDiff.hidden = true;
      secAdd.hidden = false;
      updateAdd();
    }
  }

  // Hook events
  document.querySelectorAll('input[name="mode"]').forEach(function (radio) {
    radio.addEventListener("change", update);
  });

  d1Field.on(update);
  d2Field.on(update);
  if (incCheck) incCheck.addEventListener("change", update);

  baseField.on(update);
  amountInput.addEventListener("input", update);
  unitSelect.addEventListener("change", update);
  document.querySelectorAll('input[name="op"]').forEach(function (radio) {
    radio.addEventListener("change", update);
  });

  // Today buttons
  $("btn-d1-today").addEventListener("click", function () {
    d1Field.set(DC.todayParts());
    update();
  });
  $("btn-base-today").addEventListener("click", function () {
    baseField.set(DC.todayParts());
    update();
  });

  // Mode 1 presets
  function setDiffPreset(offsetDays, toEndOfMonth, toEndOfYear) {
    var a = d1Field.get() || DC.todayParts();
    if (toEndOfMonth) {
      var lastDay = G.dim(a.y, a.m);
      d2Field.set({ y: a.y, m: a.m, d: lastDay });
    } else if (toEndOfYear) {
      d2Field.set({ y: a.y, m: 12, d: 31 });
    } else {
      var target = DC.addDays(G, a, offsetDays);
      if (target) d2Field.set(target);
    }
    update();
  }

  $("p-add-30").addEventListener("click", function () { setDiffPreset(30, false, false); });
  $("p-add-90").addEventListener("click", function () { setDiffPreset(90, false, false); });
  $("p-add-180").addEventListener("click", function () { setDiffPreset(180, false, false); });
  $("p-month-end").addEventListener("click", function () { setDiffPreset(0, true, false); });
  $("p-year-end").addEventListener("click", function () { setDiffPreset(0, false, true); });

  // Mode 2 presets
  function setAddPreset(amount, unit) {
    baseField.set(DC.todayParts());
    amountInput.value = String(amount);
    unitSelect.value = unit;
    var addRadio = $("op-add");
    if (addRadio) addRadio.checked = true;
    update();
  }

  $("chip-30").addEventListener("click", function () { setAddPreset(30, "days"); });
  $("chip-60").addEventListener("click", function () { setAddPreset(60, "days"); });
  $("chip-90").addEventListener("click", function () { setAddPreset(90, "days"); });
  $("chip-180").addEventListener("click", function () { setAddPreset(180, "days"); });
  $("chip-1y").addEventListener("click", function () { setAddPreset(1, "years"); });

  $("copy").addEventListener("click", function () { DC.copyLink(this, "Bağlantı kopyalandı", share); });

  // Init
  var p = DC.readParams();
  if (p.mode === "add") {
    var addModeRadio = $("mode-add");
    if (addModeRadio) addModeRadio.checked = true;
  }
  baseField.set(DC.parseIso(p.date) || DC.todayParts());
  d1Field.set(DC.parseIso(p.d1) || DC.todayParts());
  var d2Iso = DC.parseIso(p.d2);
  if (d2Iso) d2Field.set(d2Iso);
  else d2Field.set(DC.addDays(G, DC.todayParts(), 30));

  if (p.inc === "1" && incCheck) incCheck.checked = true;
  if (p.amount) amountInput.value = p.amount;
  if (p.unit) unitSelect.value = p.unit;
  if (p.op === "sub") {
    var subRadio = $("op-sub");
    if (subRadio) subRadio.checked = true;
  }

  update();
})();
