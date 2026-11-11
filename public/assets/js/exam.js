/* exam.js — exam age-limit eligibility (UPSC, SSC, NDA, CDS, Agniveer).
   Rules come from <script type="application/json" id="exam-rules"> (built from src/data/exams/*.json).
   Two kinds of rule:
   - "age": min/max age on a cutoff date. Indian notices read the maximum as "must not have
     reached": UPSC 21–32 on 1 Aug 2026 = born 2 Aug 1994 to 1 Aug 2005. Category relaxation adds years.
   - "window": explicit "born not earlier than / not later than" dates (both inclusive). */
(function () {
  "use strict";
  var G = DC.Gregorian;
  var $ = function (id) { return document.getElementById(id); };
  var R = JSON.parse($("exam-rules").textContent);
  var dob = new DC.DateField($("dob"));
  var result = $("result");
  var nf = new Intl.NumberFormat("en-IN");
  var df = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
  var sel = { cycle: $("x-cycle"), band: $("x-band"), cat: $("x-cat"), entry: $("x-entry") };
  var share = null;

  function fmt(n) { return df.format(DC.dateObj(n)); }
  function plural(n, w) { return nf.format(n) + " " + w + (n === 1 ? "" : "s"); }
  function ymd(a) { return plural(a.y, "year") + ", " + plural(a.m, "month") + ", " + plural(a.d, "day"); }
  function isoDays(s) { var g = DC.parseIso(s); return G.toDays(g.y, g.m, g.d); }
  function cycle() { for (var i = 0; i < R.cycles.length; i++) if (R.cycles[i].id === sel.cycle.value) return R.cycles[i]; return R.cycles[0]; }
  function find(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return list[0]; }
  function fill(s, list) {
    var cur = s.value;
    s.innerHTML = list.map(function (x) { return '<option value="' + x.id + '">' + DC.esc(x.label) + "</option>"; }).join("");
    if (cur && list.some(function (x) { return x.id === cur; })) s.value = cur;
    s.closest(".x-row").hidden = list.length < 2;
  }
  function setupCycle() {
    var c = cycle();
    if (c.mode === "age") { fill(sel.band, c.bands); fill(sel.cat, c.cats); sel.entry.closest(".x-row").hidden = true; }
    else { fill(sel.entry, c.entries); sel.band.closest(".x-row").hidden = true; sel.cat.closest(".x-row").hidden = true; }
    var st = $("x-status");
    st.className = "status-note " + c.status;
    st.innerHTML = (c.status === "official" ? "<strong>Official rules.</strong> " + DC.esc(c.source || "") + ". "
                                             : "<strong>Expected rules, not yet notified.</strong> ") + DC.esc(c.note || "");
  }

  /* Eligible birth-date window for the current choices, shifted by k years (for "last attempt") */
  function windowFor(c, k) {
    k = k || 0;
    if (c.mode === "age") {
      var band = find(c.bands, sel.band.value), cat = find(c.cats, sel.cat.value);
      var cut = DC.parseIso(c.cutoff); cut = { y: cut.y + k, m: cut.m, d: cut.d };
      var max = band.max + (cat.relax || 0);
      var f = DC.addMonths(G, cut, -12 * max), t = DC.addMonths(G, cut, -12 * band.min);
      return { from: G.toDays(f.y, f.m, f.d) + 1, to: G.toDays(t.y, t.m, t.d), ref: G.toDays(cut.y, cut.m, cut.d),
               refLabel: "the cutoff date", max: max, min: band.min, note: cat.note };
    }
    var e = find(c.entries, sel.entry.value);
    return { from: isoDays(e.from), to: isoDays(e.to), ref: c.ref ? isoDays(c.ref) : null, refLabel: c.refLabel, note: e.note };
  }

  function validate() {
    if (dob.isEmpty()) { dob.error(""); return null; }
    var v = dob.get();
    if (!v) { dob.error(""); return null; }
    if (v.y < 1940 || v.y > 2030) { dob.error("Enter a year between 1940 and 2030."); return null; }
    var n = G.toDays(v.y, v.m, v.d);
    if (n === null) { dob.error("That date doesn’t exist. Check the day and month."); return null; }
    dob.error("");
    return n;
  }

  function update() {
    share = null;
    var c = cycle(), bn = validate();
    if (bn === null) { result.setAttribute("data-state", "empty"); return; }
    var w = windowFor(c), ok = bn >= w.from && bn <= w.to;
    var t = DC.todayParts(), refN = w.ref !== null ? w.ref : G.toDays(t.y, t.m, t.d);
    $("r-caption").textContent = c.label + (c.status === "expected" ? " (expected rules)" : "");
    $("r-verdict").textContent = ok ? "Eligible" : "Not eligible";
    $("r-verdict").className = "age-big conv-big verdict " + (ok ? "is-ok" : "is-bad");
    var b = G.fromDays(bn), refG = G.fromDays(refN);
    $("r-sub").textContent = bn <= refN ? "Age on " + fmt(refN) + ": " + ymd(DC.age(G, b, refG)) : "Born after " + fmt(refN);

    var box = $("r-why");
    box.className = "callout " + (ok ? "ok" : "bad");
    if (ok) box.innerHTML = "<p><strong>Your date of birth is inside the eligible range.</strong></p><p>Born between " + fmt(w.from) + " and " + fmt(w.to) + ", both dates included." + (w.note ? " " + DC.esc(w.note) : "") + "</p>";
    else if (bn < w.from) box.innerHTML = "<p><strong>Over the age limit.</strong></p><p>You would need to be born on or after " + fmt(w.from) + "; you were born " + plural(w.from - bn, "day") + " too early." + (c.mode === "age" ? " The limit is under " + w.max + " years on the cutoff date." : "") + "</p>";
    else box.innerHTML = "<p><strong>Below the minimum age.</strong></p><p>You would need to be born on or before " + fmt(w.to) + "; you were born " + plural(bn - w.to, "day") + " too late.</p>";

    var rows = [["Eligible dates of birth", fmt(w.from) + " to " + fmt(w.to)]];
    if (c.mode === "age") {
      rows.push(["Age limit", w.min + " to under " + w.max + " years on " + fmt(w.ref)]);
      if (c.yearly) {
        var first = null, last = null, base = DC.parseIso(c.cutoff).y;
        for (var k = 0; k <= 45; k++) { var wk = windowFor(c, k); if (bn >= wk.from && bn <= wk.to) { if (first === null) first = base + k; last = base + k; } }
        if (last !== null) rows.push(["Exam years you fit (same rules)", first === last ? String(first) : first + " to " + last]);
      }
    }
    rows.push(["Status", c.status === "official" ? "Official notification" : "Expected, confirm when notified"]);
    $("r-stats").innerHTML = rows.map(function (r) { return "<div><dt>" + r[0] + "</dt><dd>" + DC.esc(r[1]) + "</dd></div>"; }).join("");
    result.setAttribute("data-state", "ready");
    share = { dob: DC.iso(b), c: c.id === R.cycles[0].id ? "" : c.id, b: c.mode === "age" && c.bands.length > 1 ? sel.band.value : "",
              k: c.mode === "age" && sel.cat.value !== "gen" ? sel.cat.value : "", e: c.mode === "window" && c.entries.length > 1 ? sel.entry.value : "" };
  }

  // ---- init ----
  sel.cycle.innerHTML = R.cycles.map(function (c) { return '<option value="' + c.id + '">' + DC.esc(c.label) + (c.status === "expected" ? " (expected)" : "") + "</option>"; }).join("");
  var p = DC.readParams();
  if (p.c && R.cycles.some(function (c) { return c.id === p.c; })) sel.cycle.value = p.c;
  setupCycle();
  if (p.b) sel.band.value = p.b;
  if (p.k) sel.cat.value = p.k;
  if (p.e) sel.entry.value = p.e;
  var pd = DC.parseIso(p.dob); if (pd) dob.set(pd);
  sel.cycle.addEventListener("change", function () { setupCycle(); update(); });
  [sel.band, sel.cat, sel.entry].forEach(function (s) { s.addEventListener("change", update); });
  dob.on(update);
  DC.autoReveal(dob, result, "Change date of birth");
  $("copy").addEventListener("click", function () { DC.copyLink(this, "Link copied", share); });
  update();
})();
