/* date-l10n.js: shared "days between dates" and "add days to date" engine for localized pages.
   The page loads a language file first that sets window.DATE_L10N:
   { locale, t: {strings}, units: {days, businessDays, weeks, months, years}, extraDiff(ctx)? }
   Preset buttons use data attributes: data-diff-days="N" | data-diff-end="month|year" | data-add="N" data-unit="days" */
(function () {
  "use strict";
  var L = window.DATE_L10N, t = L.t, sep = L.sep == null ? " " : L.sep;
  var G = DC.Gregorian;
  var $ = function (id) { return document.getElementById(id); };

  var d1Field = new DC.DateField($("d1-field"));
  var d2Field = new DC.DateField($("d2-field"));
  var baseField = new DC.DateField($("base-field"));
  var incCheck = $("include-end");
  var amountInput = $("amount");
  var unitSelect = $("unit");
  var result = $("result");

  var nf = new Intl.NumberFormat(L.locale);
  var pf = new Intl.NumberFormat(L.locale, { style: "percent", maximumFractionDigits: 1 });
  var df = new Intl.DateTimeFormat(L.locale, { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
  var wf = new Intl.DateTimeFormat(L.locale, { timeZone: "UTC", weekday: "long" });
  var share = null;

  function fmt(n) { return df.format(DC.dateObj(n)); }
  function weekday(n) { return wf.format(DC.dateObj(n)); }
  function checked(name, dflt) {
    var c = document.querySelector('input[name="' + name + '"]:checked');
    return c ? c.value : dflt;
  }
  function todayN() { var x = DC.todayParts(); return G.toDays(x.y, x.m, x.d); }

  function validate(field) {
    if (field.isEmpty()) { field.error(""); return null; }
    var v = field.get();
    if (!v) { field.error(""); return null; }
    if (v.y < 1800 || v.y > 2200) { field.error(t.errYear); return null; }
    if (G.toDays(v.y, v.m, v.d) === null) { field.error(t.errDate); return null; }
    field.error("");
    return v;
  }

  function render(rows) {
    $("r-stats").innerHTML = rows.map(function (r) {
      return "<div><dt>" + DC.esc(r[0]) + "</dt><dd>" + DC.esc(r[1]) + "</dd></div>";
    }).join("");
    result.setAttribute("data-state", "ready");
  }

  function updateDiff() {
    var a = validate(d1Field), b = validate(d2Field);
    if (!a || !b) { result.setAttribute("data-state", "empty"); return; }
    var an = G.toDays(a.y, a.m, a.d), bn = G.toDays(b.y, b.m, b.d);
    var inc = incCheck.checked;
    var lo = Math.min(an, bn), hi = Math.max(an, bn);
    var total = hi - lo + (inc ? 1 : 0);
    var c = DC.age(G, an <= bn ? a : b, an <= bn ? b : a);
    var biz = DC.businessDays(G, a, b, inc);
    var yearDays = DC.isLeap(a.y) || DC.isLeap(b.y) ? 366 : 365;

    $("r-caption").textContent = t.between(fmt(lo), fmt(hi)) + (inc ? " " + t.inclusive : "");
    $("r-main").textContent = nf.format(total);
    $("r-unit").textContent = L.units.days;
    $("r-sub").textContent = t.calendar + ": " + t.ymd(c, nf);

    var rows = [
      [t.weeks, nf.format(Math.floor(total / 7)) + sep + L.units.weeks + (total % 7 ? ", " + nf.format(total % 7) + sep + L.units.days : "")],
      [t.business, nf.format(biz) + sep + t.businessNote],
      [t.weekend, nf.format(total - biz) + sep + t.weekendNote],
      [t.hours, nf.format(total * 24)],
      [t.minutes, nf.format(total * 1440)],
      [t.pctYear, pf.format(total / yearDays) + " (" + yearDays + sep + L.units.days + ")"]
    ];
    if (L.extraDiff) rows = rows.concat(L.extraDiff({ lo: lo, hi: hi, total: total, nf: nf, fmt: fmt, weekday: weekday, todayN: todayN() }));
    render(rows);
    share = { mode: "diff", d1: DC.iso(a), d2: DC.iso(b), inc: inc ? "1" : "" };
  }

  function updateAdd() {
    var base = validate(baseField);
    if (!base) { result.setAttribute("data-state", "empty"); return; }
    var raw = amountInput.value.trim();
    var clean = DC.toLatinDigits(raw).replace(/[^0-9]/g, "");
    if (clean !== raw) amountInput.value = clean;
    var amount = clean === "" ? NaN : parseInt(clean, 10);
    if (isNaN(amount)) { result.setAttribute("data-state", "empty"); return; }

    var op = checked("op", "add"), unit = unitSelect.value;
    var target = DC.addUnits(G, base, amount, unit, op);
    if (!target) { result.setAttribute("data-state", "empty"); return; }
    var baseN = G.toDays(base.y, base.m, base.d), targetN = G.toDays(target.y, target.m, target.d);
    var rel = targetN - todayN();

    $("r-caption").textContent = op === "add" ? t.targetFuture : t.targetPast;
    $("r-main").textContent = fmt(targetN);
    $("r-unit").textContent = "";
    $("r-sub").textContent = t.offset(fmt(baseN), nf.format(amount) + sep + L.units[unit], op === "add");

    render([
      [t.weekday, weekday(targetN)],
      [t.dayOfYear, t.dayOfYearText(DC.dayOfYear(G, target), DC.isLeap(target.y) ? 366 : 365)],
      [t.isoWeek, String(DC.isoWeekNumber(target))],
      [t.relToday, rel === 0 ? t.today : t.rel(nf.format(Math.abs(rel)), rel > 0)],
      [t.year, target.y + " " + (DC.isLeap(target.y) ? t.leap : t.common)]
    ]);
    share = { mode: "add", date: DC.iso(base), op: op, amount: String(amount), unit: unit };
  }

  function update() {
    share = null;
    var diff = checked("mode", "diff") === "diff";
    $("section-diff").hidden = !diff;
    $("section-add").hidden = diff;
    if (diff) updateDiff(); else updateAdd();
  }

  document.querySelectorAll('input[name="mode"], input[name="op"]').forEach(function (r) { r.addEventListener("change", update); });
  d1Field.on(update);
  d2Field.on(update);
  baseField.on(update);
  incCheck.addEventListener("change", update);
  amountInput.addEventListener("input", update);
  unitSelect.addEventListener("change", update);
  $("btn-d1-today").addEventListener("click", function () { d1Field.set(DC.todayParts()); update(); });
  $("btn-base-today").addEventListener("click", function () { baseField.set(DC.todayParts()); update(); });

  document.querySelectorAll("[data-diff-days], [data-diff-end]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var a = d1Field.get() || DC.todayParts(), end = btn.getAttribute("data-diff-end");
      if (end === "month") d2Field.set({ y: a.y, m: a.m, d: G.dim(a.y, a.m) });
      else if (end === "year") d2Field.set({ y: a.y, m: 12, d: 31 });
      else d2Field.set(DC.addDays(G, a, parseInt(btn.getAttribute("data-diff-days"), 10)));
      update();
    });
  });
  document.querySelectorAll("[data-add]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (baseField.isEmpty()) baseField.set(DC.todayParts());
      amountInput.value = btn.getAttribute("data-add");
      unitSelect.value = btn.getAttribute("data-unit") || "days";
      $("op-add").checked = true;
      update();
    });
  });
  $("copy").addEventListener("click", function () { DC.copyLink(this, t.copied, share); });

  var p = DC.readParams();
  if (p.mode === "add") $("mode-add").checked = true;
  baseField.set(DC.parseIso(p.date) || DC.todayParts());
  d1Field.set(DC.parseIso(p.d1) || DC.todayParts());
  d2Field.set(DC.parseIso(p.d2) || DC.addDays(G, DC.todayParts(), L.defaultSpan || 30));
  if (p.inc === "1") incCheck.checked = true;
  if (p.amount) amountInput.value = p.amount;
  if (p.unit && L.units[p.unit]) unitSelect.value = p.unit;
  if (p.op === "sub") $("op-sub").checked = true;
  update();
})();
