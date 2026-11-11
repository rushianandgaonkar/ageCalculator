/* diff.js — age difference between two people. One script for the English page (/age-difference/)
   and the Arabic page (/ar/age-difference/, adds a Gregorian/Hijri switch and Hijri results). */
(function () {
  "use strict";
  var G = DC.Gregorian, H = DC.Hijri;
  var AR = document.documentElement.lang === "ar";
  var $ = function (id) { return document.getElementById(id); };
  var A = new DC.DateField($("dob-a")), B = new DC.DateField($("dob-b"));
  var result = $("result");
  var mode = "g";
  var hijriOK = H.supported();

  /* ---------- language ---------- */
  var nf = new Intl.NumberFormat(AR ? "ar-SA-u-nu-latn" : "en-US");
  var df = AR ? new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" })
              : new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
  var hf = AR && hijriOK ? new Intl.DateTimeFormat("ar-SA-u-ca-" + H.calendarName() + "-nu-latn", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }) : null;
  var wf = new Intl.DateTimeFormat(AR ? "ar-SA" : "en-GB", { timeZone: "UTC", weekday: "long" });
  var FORMS = {
    year: ["سنة واحدة", "سنتان", "سنوات", "سنة", "سنة"], month: ["شهر واحد", "شهران", "أشهر", "شهرًا", "شهر"],
    day: ["يوم واحد", "يومان", "أيام", "يومًا", "يوم"], week: ["أسبوع واحد", "أسبوعان", "أسابيع", "أسبوعًا", "أسبوع"]
  };
  var pr = AR ? new Intl.PluralRules("ar") : null;
  function count(n, unit) {
    if (!AR) return nf.format(n) + " " + unit + (n === 1 ? "" : "s");
    var f = FORMS[unit], c = pr.select(n);
    if (c === "one") return f[0];
    if (c === "two") return f[1];
    return nf.format(n) + " " + (c === "few" ? f[2] : c === "many" ? f[3] : f[4]);
  }
  function ymd(a) { return AR ? [count(a.y, "year"), count(a.m, "month"), count(a.d, "day")].join(" و") : count(a.y, "year") + ", " + count(a.m, "month") + " and " + count(a.d, "day"); }
  var T = AR ? {
    p1: "الشخص الأول", p2: "الشخص الثاني", caption: "فرق العمر بالتقويم الميلادي", same: "وُلد الاثنان في اليوم نفسه.",
    older: function (o, y, d) { return "<p><strong>" + o + " أكبر من " + y + " بـ" + d + ".</strong></p>"; },
    rows: ["الفرق بالأشهر", "الفرق بالأسابيع", "الفرق بالأيام", "تاريخ ميلاد", "عمر", "اليوم"],
    bad: "هذا التاريخ غير موجود. تحقّق من اليوم والشهر.", range: function (lo, hi) { return "أدخل سنة بين " + lo + " و" + hi + "."; },
    future: "هذا التاريخ في المستقبل.", unit: "سنة"
  } : {
    p1: "Person 1", p2: "Person 2", caption: "Age difference", same: "Both were born on the same day.",
    older: function (o, y, d) { return "<p><strong>" + o + " is older than " + y + " by " + d + ".</strong></p>"; },
    rows: ["Difference in months", "Difference in weeks", "Difference in days", "Born", "Age today", "today"],
    bad: "That date doesn’t exist. Check the day and month.", range: function (lo, hi) { return "Enter a year between " + lo + " and " + hi + "."; },
    future: "This date is in the future.", unit: "years"
  };

  function cal() { return mode === "h" ? H : G; }
  function nameOf(id, fallback) { var v = ($(id).value || "").trim(); return v ? DC.esc(v.slice(0, 40)) : fallback; }
  function todayN() { var t = DC.todayParts(); return G.toDays(t.y, t.m, t.d); }

  function validate(f) {
    if (f.isEmpty()) { f.error(""); return null; }
    var v = f.get();
    if (!v) { f.error(""); return null; }
    var lo = mode === "h" ? 1300 : 1800, hi = mode === "h" ? 1600 : 2200;
    if (v.y < lo || v.y > hi) { f.error(T.range(lo, hi)); return null; }
    var n = cal().toDays(v.y, v.m, v.d);
    if (n === null) { f.error(T.bad); return null; }
    f.error("");
    return n;
  }

  function update() {
    var an = validate(A), bn = validate(B);
    if (an === null || bn === null) { result.setAttribute("data-state", "empty"); return; }
    var n1 = nameOf("name-a", T.p1), n2 = nameOf("name-b", T.p2);
    var olderN = Math.min(an, bn), youngerN = Math.max(an, bn);
    var d = DC.age(G, G.fromDays(olderN), G.fromDays(youngerN));
    $("r-caption").textContent = T.caption;
    $("r-years").textContent = nf.format(d.y);
    $("r-sub").textContent = AR ? count(d.m, "month") + " و" + count(d.d, "day") : count(d.m, "month") + ", " + count(d.d, "day");
    var who = $("r-who");
    who.className = "callout";
    who.innerHTML = an === bn ? "<p><strong>" + T.same + "</strong></p>"
      : (an < bn ? T.older(n1, n2, ymd(d)) : T.older(n2, n1, ymd(d)));
    if (AR && hijriOK) {
      var hd = DC.age(H, H.fromDays(olderN), H.fromDays(youngerN));
      $("r-hyears").textContent = nf.format(hd.y);
      $("r-hsub").textContent = count(hd.m, "month") + " و" + count(hd.d, "day");
    }
    var t = todayN();
    function born(n) { return wf.format(DC.dateObj(n)) + (AR ? "، " : ", ") + df.format(DC.dateObj(n)) + (AR && hf ? " (" + hf.format(DC.dateObj(n)) + ")" : ""); }
    function ageNow(n) { if (n > t) return T.future; var a = DC.age(G, G.fromDays(n), G.fromDays(t)); return ymd(a); }
    var rows = [
      [T.rows[0], count(d.months, "month") + (d.d ? (AR ? " و" : ", ") + count(d.d, "day") : "")],
      [T.rows[1], count(Math.floor(d.days / 7), "week") + (d.days % 7 ? (AR ? " و" : ", ") + count(d.days % 7, "day") : "")],
      [T.rows[2], count(d.days, "day")],
      [AR ? T.rows[3] + " " + n1 : n1 + ": " + T.rows[3].toLowerCase(), born(an)],
      [AR ? T.rows[3] + " " + n2 : n2 + ": " + T.rows[3].toLowerCase(), born(bn)],
      [AR ? T.rows[4] + " " + n1 + " " + T.rows[5] : n1 + ": " + T.rows[4].toLowerCase(), ageNow(an)],
      [AR ? T.rows[4] + " " + n2 + " " + T.rows[5] : n2 + ": " + T.rows[4].toLowerCase(), ageNow(bn)]
    ];
    $("r-stats").innerHTML = rows.map(function (r) { return "<div><dt>" + r[0] + "</dt><dd>" + DC.esc(r[1]) + "</dd></div>"; }).join("");
    result.setAttribute("data-state", "ready");
    DC.writeParams({ a: DC.iso(G.fromDays(an)), b: DC.iso(G.fromDays(bn)) });
  }

  /* ---------- Arabic: calendar switch with month names ---------- */
  var GM = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  var HM = ["محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"];
  function fillMonths(f) {
    var sel = f.parts.m;
    if (sel.tagName !== "SELECT") return;
    var cur = sel.value, names = mode === "h" ? HM : GM, html = '<option value="">الشهر</option>';
    for (var i = 0; i < 12; i++) html += '<option value="' + (i + 1) + '">' + names[i] + " (" + (i + 1) + ")</option>";
    sel.innerHTML = html; sel.value = cur;
  }
  function switchMode(m) {
    if (m === mode) return;
    if (m === "h" && !hijriOK) { $("cal-g").checked = true; return; }
    var an = validate(A), bn = validate(B);
    mode = m;
    fillMonths(A); fillMonths(B);
    if (an !== null) A.set(cal().fromDays(an)); else A.error("");
    if (bn !== null) B.set(cal().fromDays(bn)); else B.error("");
    update();
  }

  // ---- init ----
  fillMonths(A); fillMonths(B);
  var p = DC.readParams(), pa = DC.parseIso(p.a), pb = DC.parseIso(p.b);
  if (pa) A.set(pa);
  if (pb) B.set(pb);
  A.on(update); B.on(update);
  ["name-a", "name-b"].forEach(function (id) { $(id).addEventListener("input", update); });
  // when person 1's date is complete, move to person 2
  var lastA = A.order[A.order.length - 1];
  lastA.addEventListener(lastA.tagName === "SELECT" ? "change" : "input", function () {
    if (DC.partComplete(lastA) && B.isEmpty() && document.activeElement === lastA) B.order[0].focus();
  });
  DC.autoReveal(B, result, AR ? "تعديل التواريخ" : "Change dates");
  if (AR) {
    $("cal-g").addEventListener("change", function () { switchMode("g"); });
    $("cal-h").addEventListener("change", function () { switchMode("h"); });
  }
  $("copy").addEventListener("click", function () { DC.copyLink(this, AR ? "تم نسخ الرابط" : "Link copied"); });
  update();
})();
