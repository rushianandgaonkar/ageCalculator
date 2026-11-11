/* ne.js — Nepali age calculator: Bikram Sambat (BS) and AD. Calendar data: bs-data.js */
(function () {
  "use strict";
  var BS = DC.BS;
  var G = DC.Gregorian;
  var $ = function (id) { return document.getElementById(id); };
  var BS_M = ["Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Asoj", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];
  var BS_M_NE = ["बैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज", "कात्तिक", "मंसिर", "पुस", "माघ", "फागुन", "चैत"];
  var AD_M = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var WD_NE = ["आइतबार", "सोमबार", "मंगलबार", "बुधबार", "बिहीबार", "शुक्रबार", "शनिबार"];
  var MIN_N = BS.toDays(2000, 1, 1), MAX_N = BS.toDays(2090, 12, BS.dim(2090, 12));
  var nf = new Intl.NumberFormat("en-IN");
  var df = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
  var wf = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long" });
  var mode = "bs";
  var neDigits = DC.store.get("ac-ne-digits") === "1";
  var dob = new DC.DateField($("dob")), on = new DC.DateField($("on"));
  var result = $("result");

  function cal() { return mode === "bs" ? BS : G; }
  function plural(n, w) { return nf.format(n) + " " + w + (n === 1 ? "" : "s"); }
  function dig(s) { return neDigits ? DC.toDigits(s, "deva") : String(s); }
  function bsText(n) {
    var b = BS.fromDays(n);
    if (!b) return "–";
    var en = b.d + " " + BS_M[b.m - 1] + " " + b.y + " BS";
    var ne = DC.toDigits(b.y, "deva") + " " + BS_M_NE[b.m - 1] + " " + DC.toDigits(b.d, "deva");
    return (neDigits ? ne : en) + (neDigits ? "" : " (" + ne + ")");
  }
  function adText(n) { return df.format(DC.dateObj(n)); }

  function fillMonths(sel) {
    var cur = sel.value, html = '<option value="">Month</option>';
    for (var i = 0; i < 12; i++) {
      html += '<option value="' + (i + 1) + '">' + (mode === "bs" ? BS_M[i] + " (" + BS_M_NE[i] + ")" : AD_M[i]) + "</option>";
    }
    sel.innerHTML = html;
    sel.value = cur;
  }

  function validate(field) {
    if (field.isEmpty()) { field.error(""); return null; }
    var v = field.get();
    if (!v) { field.error(""); return null; }
    var n = cal().toDays(v.y, v.m, v.d);
    if (mode === "bs" && (v.y < 2000 || v.y > 2090)) { field.error("Enter a BS year between 2000 and 2090."); return null; }
    if (n === null) { field.error("That date doesn’t exist. " + (mode === "bs" ? "BS months have 29 to 32 days." : "Check the day and month.")); return null; }
    if (n < MIN_N || n > MAX_N) { field.error("Supported dates: 14 April 1943 to " + adText(MAX_N) + " (2000–2090 BS)."); return null; }
    field.error("");
    return n;
  }

  function update() {
    var bn = validate(dob), onN = validate(on);
    if (bn === null || onN === null) { result.setAttribute("data-state", "empty"); return; }
    if (bn > onN) { dob.error("Date of birth is after the “Age on” date."); result.setAttribute("data-state", "empty"); return; }
    var bB = BS.fromDays(bn), bO = BS.fromDays(onN), gB = G.fromDays(bn), gO = G.fromDays(onN);
    var ab = DC.age(BS, bB, bO), ag = DC.age(G, gB, gO);
    var t = DC.todayParts(), isToday = onN === G.toDays(t.y, t.m, t.d);

    $("r-caption").textContent = isToday ? "Your age today in Bikram Sambat" : "Age in BS on " + bsText(onN);
    $("r-years").textContent = dig(ab.y);
    $("r-years-unit").textContent = ab.y === 1 ? "year" : "years";
    $("r-sub").textContent = plural(ab.m, "month") + ", " + plural(ab.d, "day");
    var last = DC.addMonths(BS, bB, ab.y * 12), next = DC.addMonths(BS, bB, (ab.y + 1) * 12);
    var lastS = last ? last.d + " " + BS_M[last.m - 1] + " " + last.y : "", nextS = next ? next.d + " " + BS_M[next.m - 1] + " " + next.y : "";
    DC.renderRuler($("r-ruler"), ab, "<span><b>" + ab.y + "</b> on " + lastS + "</span><span><b>" + (ab.y + 1) + "</b> on " + nextS + "</span>");
    $("r-ruler").setAttribute("aria-label", ab.m + " of 12 months into year " + (ab.y + 1));
    $("r-ad-years").textContent = nf.format(ag.y);
    $("r-ad-years-unit").textContent = ag.y === 1 ? "year" : "years";
    $("r-ad-sub").textContent = plural(ag.m, "month") + ", " + plural(ag.d, "day");

    var nbB = DC.nextBirthday(BS, bB, bO), nbG = DC.nextBirthday(G, gB, gO), note = $("r-note");
    if (nbB && nbB.isToday && ab.y > 0) { note.hidden = false; note.className = "callout ok"; note.innerHTML = "<p>जन्मदिनको शुभकामना! Happy birthday — you are " + ab.y + " today by the Nepali calendar.</p>"; }
    else note.hidden = true;
    function nbText(nb, f) { return !nb ? "–" : nb.isToday ? "Today" : "In " + plural(nb.days, "day") + ": " + f(nb.dayNum); }
    var rows = [
      ["Date of birth (BS)", bsText(bn)],
      ["Date of birth (AD)", adText(bn)],
      ["Born on", wf.format(DC.dateObj(bn)) + " (" + WD_NE[DC.weekday(bn)] + ")"],
      ["Next birthday (BS)", nbText(nbB, bsText)],
      ["Next birthday (AD)", nbText(nbG, adText)],
      ["Age in days", plural(ab.days, "day")],
      ["Age in months (BS)", plural(ab.months, "month")],
      [isToday ? "Today in BS" : "“Age on” date in BS", bsText(onN)]
    ];
    $("r-stats").innerHTML = rows.map(function (r) { return "<div><dt>" + r[0] + "</dt><dd>" + DC.esc(r[1]) + "</dd></div>"; }).join("");
    result.setAttribute("data-state", "ready");
    DC.writeParams({ dob: DC.iso(gB), on: isToday ? "" : DC.iso(gO) });
  }

  function switchMode(m) {
    if (m === mode) return;
    var bn = validate(dob), onN = validate(on);
    mode = m;
    fillMonths(dob.parts.m); fillMonths(on.parts.m);
    if (bn !== null) dob.set(cal().fromDays(bn)); else dob.error("");
    if (onN !== null) on.set(cal().fromDays(onN));
    update();
  }

  function todayN() { var t = DC.todayParts(); return G.toDays(t.y, t.m, t.d); }

  // ---- init ----
  fillMonths(dob.parts.m); fillMonths(on.parts.m);
  $("ne-digits").checked = neDigits;
  var p = DC.readParams(), pOn = DC.parseIso(p.on), pDob = DC.parseIso(p.dob);
  on.set(BS.fromDays(pOn ? G.toDays(pOn.y, pOn.m, pOn.d) : todayN()));
  if (pOn) $("other-date").open = true;
  if (pDob) { var n = G.toDays(pDob.y, pDob.m, pDob.d); var b = BS.fromDays(n); if (b) dob.set(b); }

  dob.on(update);
  DC.autoReveal(dob, result, "Change date of birth");
  on.on(update);
  $("cal-bs").addEventListener("change", function () { switchMode("bs"); });
  $("cal-ad").addEventListener("change", function () { switchMode("ad"); });
  $("ne-digits").addEventListener("change", function () { neDigits = this.checked; DC.store.set("ac-ne-digits", neDigits ? "1" : "0"); update(); });
  $("reset-today").addEventListener("click", function () { on.set(cal().fromDays(todayN())); update(); });
  $("copy").addEventListener("click", function () { DC.copyLink(this, "Link copied"); });
  update();
})();
