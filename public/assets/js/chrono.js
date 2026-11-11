/* chrono.js — chronological age (y;m;d) for test scoring, with corrected age. */
(function () {
  "use strict";
  var G = DC.Gregorian;
  var $ = function (id) { return document.getElementById(id); };
  var dob = new DC.DateField($("dob")), on = new DC.DateField($("on"));
  var result = $("result");
  var nf = new Intl.NumberFormat("en-US");
  var df = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });
  var code = "";

  function plural(n, w) { return nf.format(n) + " " + w + (n === 1 ? "" : "s"); }
  function words(a) { return plural(a.y, "year") + ", " + plural(a.m, "month") + ", " + plural(a.d, "day"); }
  function semi(a) { return a.y + ";" + a.m + ";" + a.d; }
  function method() { return $("m-30").checked ? "30" : "exact"; }
  function intOf(id) { var v = DC.toLatinDigits($(id).value).replace(/[^0-9]/g, ""); $(id).value = v; return v === "" ? null : +v; }

  function validate(field) {
    if (field.isEmpty()) { field.error(""); return null; }
    var v = field.get();
    if (!v) { field.error(""); return null; }
    if (v.y < 1900 || v.y > 2200) { field.error("Enter a year between 1900 and 2200."); return null; }
    if (G.toDays(v.y, v.m, v.d) === null) { field.error("That date doesn’t exist. Check the month and day."); return null; }
    field.error("");
    return v;
  }

  function update() {
    var b = validate(dob), o = validate(on);
    if (!b || !o) { result.setAttribute("data-state", "empty"); return; }
    var bn = G.toDays(b.y, b.m, b.d), onN = G.toDays(o.y, o.m, o.d);
    if (bn > onN) { dob.error("Date of birth is after the test date."); result.setAttribute("data-state", "empty"); return; }
    var exact = DC.age(G, b, o), thirty = DC.age30(b, o);
    var main = method() === "30" ? thirty : exact;
    var other = method() === "30" ? exact : thirty;
    code = semi(main);

    $("r-caption").textContent = "Chronological age on " + df.format(DC.dateObj(onN)) + (method() === "30" ? " (30-day method)" : " (exact)");
    $("r-code").textContent = code;
    $("r-sub").textContent = words(main);
    $("copy-code").textContent = "Copy " + code;

    // corrected age
    var gw = intOf("ga-weeks"), gd = intOf("ga-days") || 0, box = $("r-corrected"), dueN = null;
    if (gw !== null && gw >= 20 && gw < 37) {
      var early = (40 * 7) - (gw * 7 + Math.min(gd, 6));
      dueN = bn + early;
      box.hidden = false; box.className = "callout";
      if (dueN > onN) box.innerHTML = "<p><strong>Adjusted age: not yet at due date</strong></p><p>Due date " + df.format(DC.dateObj(dueN)) + ", " + plural(dueN - onN, "day") + " after the test date.</p>";
      else {
        var c = DC.age(G, G.fromDays(dueN), o);
        box.innerHTML = "<p><strong>Adjusted (corrected) age: " + semi(c) + "</strong> (" + DC.esc(words(c)) + ")</p><p>Counted from the due date, " +
          df.format(DC.dateObj(dueN)) + " (" + plural(Math.floor(early / 7), "week") + (early % 7 ? " " + plural(early % 7, "day") : "") + " early).</p>";
      }
    } else box.hidden = true;

    var rows = [
      ["Years;months", main.y + ";" + main.m],
      [method() === "30" ? "Exact method" : "30-day method", other ? semi(other) : "–"],
      ["Total months", plural(exact.months, "month")],
      ["Total weeks", plural(Math.floor(exact.days / 7), "week") + (exact.days % 7 ? ", " + plural(exact.days % 7, "day") : "")],
      ["Total days", plural(exact.days, "day")],
      ["Date of birth", df.format(DC.dateObj(bn))]
    ];
    $("r-stats").innerHTML = rows.map(function (r) { return "<div><dt>" + r[0] + "</dt><dd>" + DC.esc(r[1]) + "</dd></div>"; }).join("");
    result.setAttribute("data-state", "ready");
    var t = DC.todayParts();
    DC.writeParams({ dob: DC.iso(b), on: DC.iso(o) === DC.iso(t) ? "" : DC.iso(o), method: method() === "30" ? "30" : "", ga: gw !== null ? gw + (gd ? "+" + gd : "") : "" });
  }

  var p = DC.readParams();
  on.set(DC.parseIso(p.on) || DC.todayParts());
  var pd = DC.parseIso(p.dob); if (pd) dob.set(pd);
  if (p.method === "30") $("m-30").checked = true;
  if (p.ga) { var g = /^(\d{1,2})(?:\+(\d))?$/.exec(p.ga); if (g) { $("ga-weeks").value = g[1]; $("ga-days").value = g[2] || ""; $("premature").open = true; } }

  dob.on(update); on.on(update);
  DC.autoReveal(dob, result, "Change date of birth");
  ["m-exact", "m-30"].forEach(function (id) { $(id).addEventListener("change", update); });
  ["ga-weeks", "ga-days"].forEach(function (id) { $(id).addEventListener("input", update); });
  $("reset-today").addEventListener("click", function () { on.set(DC.todayParts()); update(); });
  $("copy").addEventListener("click", function () { DC.copyLink(this, "Link copied"); });
  $("copy-code").addEventListener("click", function () {
    var btn = this;
    if (navigator.clipboard) navigator.clipboard.writeText(code).then(function () {
      var n = btn.parentNode.querySelector(".copied"); n.textContent = "Copied " + code; setTimeout(function () { n.textContent = ""; }, 2500);
    });
  });
  update();
})();
