/* ar.js — Arabic age calculator: Hijri (Umm al-Qura) and Gregorian. */
(function () {
  "use strict";
  var G = DC.Gregorian, H = DC.Hijri;
  var $ = function (id) { return document.getElementById(id); };
  var GM = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  var HM = ["محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"];
  var FORMS = { // [one, two, few (3–10), many (11–99), other]
    year: ["سنة واحدة", "سنتان", "سنوات", "سنة", "سنة"],
    month: ["شهر واحد", "شهران", "أشهر", "شهرًا", "شهر"],
    day: ["يوم واحد", "يومان", "أيام", "يومًا", "يوم"],
    week: ["أسبوع واحد", "أسبوعان", "أسابيع", "أسبوعًا", "أسبوع"],
    hour: ["ساعة واحدة", "ساعتان", "ساعات", "ساعة", "ساعة"],
    minute: ["دقيقة واحدة", "دقيقتان", "دقائق", "دقيقة", "دقيقة"]
  };
  var pr = new Intl.PluralRules("ar");
  var hijriOK = H.supported();
  var mode = "g";
  var digits = DC.store.get("ac-digits") === "arab" ? "arab" : "latn";
  var dob = new DC.DateField($("dob")), on = new DC.DateField($("on"));
  var result = $("result");
  var F = {};
  var share = null;

  function makeFormats() {
    F.num = new Intl.NumberFormat("ar-SA-u-nu-" + digits);
    F.g = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-" + digits, { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
    F.gs = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-" + digits, { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
    F.w = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-" + digits, { timeZone: "UTC", weekday: "long" });
    if (hijriOK) F.h = new Intl.DateTimeFormat("ar-SA-u-ca-" + H.calendarName() + "-nu-" + digits, { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
  }
  function num(n) { return F.num.format(n); }
  function count(n, unit) {
    var f = FORMS[unit], c = pr.select(n);
    if (c === "one") return f[0];
    if (c === "two") return f[1];
    return num(n) + " " + (c === "few" ? f[2] : c === "many" ? f[3] : f[4]);
  }
  function cal() { return mode === "h" ? H : G; }
  // Western zodiac sign (برج) from the Gregorian birth date: [name, symbol, start month, start day]
  var SIGNS = [["الجدي", "♑", 12, 22], ["الدلو", "♒", 1, 20], ["الحوت", "♓", 2, 19], ["الحمل", "♈", 3, 21],
    ["الثور", "♉", 4, 20], ["الجوزاء", "♊", 5, 21], ["السرطان", "♋", 6, 21], ["الأسد", "♌", 7, 23],
    ["العذراء", "♍", 8, 23], ["الميزان", "♎", 9, 23], ["العقرب", "♏", 10, 23], ["القوس", "♐", 11, 22]];
  function zodiac(g) {
    var md = g.m * 100 + g.d, best = SIGNS[0];
    for (var i = 1; i < SIGNS.length; i++) if (md >= SIGNS[i][2] * 100 + SIGNS[i][3]) best = SIGNS[i];
    if (md >= 1222) best = SIGNS[0];
    return "برج " + best[0] + " " + best[1];
  }
  function season(g) {
    var md = g.m * 100 + g.d;
    if (md >= 321 && md <= 620) return "الربيع";
    if (md >= 621 && md <= 922) return "الصيف";
    if (md >= 923 && md <= 1220) return "الخريف";
    return "الشتاء";
  }
  function fillMonths(sel) {
    var cur = sel.value, names = mode === "h" ? HM : GM;
    var html = '<option value="">الشهر</option>';
    for (var i = 0; i < 12; i++) html += '<option value="' + (i + 1) + '">' + names[i] + " (" + num(i + 1) + ")</option>";
    sel.innerHTML = html;
    sel.value = cur;
  }

  function validate(field) {
    if (field.isEmpty()) { field.error(""); return null; }
    var v = field.get();
    if (!v) { field.error(""); return null; }
    var lo = mode === "h" ? 1300 : 1800, hi = mode === "h" ? 1600 : 2200;
    if (v.y < lo || v.y > hi) { field.error("أدخل سنة بين " + num(lo) + " و" + num(hi) + "."); return null; }
    var n = cal().toDays(v.y, v.m, v.d);
    if (n === null) { field.error("هذا التاريخ غير موجود. تحقّق من اليوم والشهر."); return null; }
    field.error("");
    return n;
  }

  function setFromDays(field, n) { field.set(n == null ? null : cal().fromDays(n)); }

  function update() {
    share = null;
    var bn = validate(dob), onN = validate(on);
    if (bn === null || onN === null) { result.setAttribute("data-state", "empty"); return; }
    if (bn > onN) { dob.error("تاريخ الميلاد بعد تاريخ الحساب."); result.setAttribute("data-state", "empty"); return; }

    var gB = G.fromDays(bn), gO = G.fromDays(onN);
    var ga = DC.age(G, gB, gO);
    var todayN = G.toDays.apply(null, [DC.todayParts().y, DC.todayParts().m, DC.todayParts().d]);
    var isToday = onN === todayN;

    $("r-caption").textContent = isToday ? "عمرك اليوم بالتقويم الميلادي" : "العمر في " + F.g.format(DC.dateObj(onN)) + " بالتقويم الميلادي";
    $("r-years").textContent = num(ga.y);
    $("r-sub").textContent = count(ga.m, "month") + " و" + count(ga.d, "day");

    var last = DC.addMonths(G, gB, ga.y * 12), next = DC.addMonths(G, gB, (ga.y + 1) * 12);
    DC.renderRuler($("r-ruler"), ga,
      "<span><b>" + num(ga.y) + "</b> في " + F.gs.format(DC.dateObj(G.toDays(last.y, last.m, last.d))) + "</span>" +
      "<span><b>" + num(ga.y + 1) + "</b> في " + F.gs.format(DC.dateObj(G.toDays(next.y, next.m, next.d))) + "</span>");
    $("r-ruler").setAttribute("aria-label", "مضى " + count(ga.m, "month") + " من السنة الحالية من عمرك");

    var hijriBirthInRange = hijriOK && H.inRange(bn);
    var hijriInRange = hijriBirthInRange && H.inRange(onN);
    var nbG = DC.nextBirthday(G, gB, gO), nbH = null, ha = null, hO = null;
    $("r-hijri").hidden = !hijriInRange;
    if (hijriInRange) {
      var hB = H.fromDays(bn);
      hO = H.fromDays(onN);
      ha = DC.age(H, hB, hO);
      nbH = DC.nextBirthday(H, hB, hO);
      if (nbH && !H.inRange(nbH.dayNum)) nbH = null;
      $("r-hyears").textContent = num(ha.y);
      $("r-hsub").textContent = count(ha.m, "month") + " و" + count(ha.d, "day");
    }
    var hNote = $("r-hijri-note");
    if (hijriOK && !hijriInRange) {
      hNote.hidden = false;
      hNote.innerHTML = "<p><strong>التاريخ الهجري غير معروض</strong></p><p>التواريخ قبل " +
        DC.esc(F.g.format(DC.dateObj(H.minDays))) + " أو بعد " + DC.esc(F.g.format(DC.dateObj(H.maxDays))) +
        " تقع خارج النطاق الرسمي لتقويم أم القرى (" + DC.toDigits("1300", digits) + "–" + DC.toDigits("1600", digits) + " هـ).</p>";
    } else hNote.hidden = true;

    var note = $("r-note");
    if (nbG && nbG.isToday && ga.y > 0) { note.hidden = false; note.className = "callout ok"; note.innerHTML = "<p>عيد ميلاد سعيد! أتممت اليوم " + count(ga.y, "year") + " بالتقويم الميلادي.</p>"; }
    else if (hijriInRange && nbH && nbH.isToday && ha.y > 0) { note.hidden = false; note.className = "callout ok"; note.innerHTML = "<p>عيد ميلاد سعيد! أتممت اليوم " + count(ha.y, "year") + " بالتقويم الهجري.</p>"; }
    else note.hidden = true;

    function countdown(calObj, onDate, nb, fmt) {
      if (!nb) return "–";
      if (nb.isToday) return "اليوم";
      var rem = DC.age(calObj, onDate, nb.date);
      var months = rem ? rem.y * 12 + rem.m : 0;
      var days = rem ? rem.d : nb.days;
      var parts = [];
      if (months > 0) parts.push(count(months, "month"));
      if (days > 0 || !parts.length) parts.push(count(days, "day"));
      var text = "بعد " + parts.join(" و");
      if (months > 0) text += " (" + count(nb.days, "day") + ")";
      return fmt.format(DC.dateObj(nb.dayNum)) + "، " + text;
    }
    var weeks = Math.floor(ga.days / 7);
    var rows = [["تاريخ الميلاد (ميلادي)", F.g.format(DC.dateObj(bn))]];
    if (hijriBirthInRange) rows.push(["تاريخ الميلاد (هجري)", F.h.format(DC.dateObj(bn))]);
    rows.push(["يوم الميلاد", F.w.format(DC.dateObj(bn))]);
    rows.push(["عيد الميلاد القادم (ميلادي)", countdown(G, gO, nbG, F.g)]);
    if (hijriInRange) rows.push(["عيد الميلاد القادم (هجري)", countdown(H, hO, nbH, F.h)]);
    rows.push(
      ["العمر بالأشهر", count(ga.months, "month")],
      ["العمر بالأسابيع", count(weeks, "week")],
      ["العمر بالأيام", count(ga.days, "day")],
      ["العمر بالساعات", count(ga.days * 24, "hour")],
      ["العمر بالدقائق", count(ga.days * 1440, "minute")],
      ["البرج", zodiac(gB)],
      ["فصل الميلاد", season(gB)]
    );
    $("r-stats").innerHTML = rows.map(function (r) { return "<div><dt>" + r[0] + "</dt><dd>" + DC.esc(r[1]) + "</dd></div>"; }).join("");
    result.setAttribute("data-state", "ready");
    share = { dob: DC.iso(gB), on: isToday ? "" : DC.iso(gO) };
    var wa = $("whatsapp");
    if (wa) {
      var waText = "عمري: " + count(ga.y, "year") + " و" + count(ga.m, "month") + " و" + count(ga.d, "day") + " بالميلادي" +
        (hijriInRange ? " (" + count(ha.y, "year") + " و" + count(ha.m, "month") + " و" + count(ha.d, "day") + " بالهجري)" : "");
      wa.href = "https://wa.me/?text=" + encodeURIComponent(waText + "\n" + DC.shareUrl(share));
    }
  }

  function switchMode(newMode) {
    if (newMode === mode) return;
    if (newMode === "h" && !hijriOK) { $("hijri-unsupported").hidden = false; $("cal-g").checked = true; return; }
    var bn = validate(dob), onN = validate(on);
    mode = newMode;
    fillMonths(dob.parts.m); fillMonths(on.parts.m);
    if (bn !== null) setFromDays(dob, bn); else dob.error("");
    if (onN !== null) setFromDays(on, onN);
    update();
  }

  function setDigits(d) {
    digits = d;
    DC.store.set("ac-digits", d);
    makeFormats();
    fillMonths(dob.parts.m); fillMonths(on.parts.m);
    update();
  }

  // ---- init ----
  makeFormats();
  fillMonths(dob.parts.m); fillMonths(on.parts.m);
  if (hijriOK && H.isFallback()) {
    $("hijri-fallback").hidden = false;
    $("r-hfallback").hidden = false;
  }
  if (digits === "arab") $("dig-arab").checked = true;
  var p = DC.readParams();
  var pOn = DC.parseIso(p.on), pDob = DC.parseIso(p.dob);
  on.set(pOn || DC.todayParts());
  if (pOn) $("other-date").open = true;
  if (pDob) dob.set(pDob);

  dob.on(update);
  DC.autoReveal(dob, result, "تعديل تاريخ الميلاد");
  on.on(update);
  $("cal-g").addEventListener("change", function () { switchMode("g"); });
  $("cal-h").addEventListener("change", function () { switchMode("h"); });
  $("dig-latn").addEventListener("change", function () { setDigits("latn"); });
  $("dig-arab").addEventListener("change", function () { setDigits("arab"); });
  $("reset-today").addEventListener("click", function () {
    var t = DC.todayParts(); setFromDays(on, G.toDays(t.y, t.m, t.d)); update();
  });
  $("copy").addEventListener("click", function () { DC.copyLink(this, "تم نسخ الرابط", share); });
  update();
})();
