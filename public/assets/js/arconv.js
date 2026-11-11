/* arconv.js — Hijri ↔ Gregorian converter (Umm al-Qura) + Hijri year month-length table. */
(function () {
  "use strict";
  var G = DC.Gregorian, H = DC.Hijri;
  var $ = function (id) { return document.getElementById(id); };
  var GM = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  var HM = ["محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"];
  var FORMS = {
    day: ["يوم واحد", "يومان", "أيام", "يومًا", "يوم"]
  };
  var pr = new Intl.PluralRules("ar");
  var hijriOK = H.supported();
  var mode = "h2g";
  var digits = DC.store.get("ac-digits") === "arab" ? "arab" : "latn";
  var field = new DC.DateField($("dob"));
  var result = $("result");
  var F = {};
  var copyText = "";
  var share = null;
  var activeHym = null; // { y, m } of currently converted date
  var tableYear = 1448;

  function makeFormats() {
    F.num = new Intl.NumberFormat("ar-SA-u-nu-" + digits);
    F.g = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-" + digits, { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
    F.w = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-" + digits, { timeZone: "UTC", weekday: "long" });
    if (hijriOK) F.h = new Intl.DateTimeFormat("ar-SA-u-ca-" + H.calendarName() + "-nu-" + digits, { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
  }
  function num(n) { return F.num.format(n); }
  function dig(s) { return DC.toDigits(s, digits); }
  function countDays(n) {
    var f = FORMS.day, c = pr.select(n);
    if (c === "one") return f[0];
    if (c === "two") return f[1];
    return num(n) + " " + (c === "few" ? f[2] : c === "many" ? f[3] : f[4]);
  }
  function cal() { return mode === "h2g" ? H : G; }
  function todayN() { var t = DC.todayParts(); return G.toDays(t.y, t.m, t.d); }
  function hijriWords(h) { return dig(h.d) + " " + HM[h.m - 1] + " " + dig(h.y) + " هـ"; }
  function hijriIso(h) { return h.y + "-" + DC.pad(h.m) + "-" + DC.pad(h.d); }

  function fillMonths() {
    var sel = field.parts.m, cur = sel.value, names = mode === "h2g" ? HM : GM;
    var html = '<option value="">الشهر</option>';
    for (var i = 0; i < 12; i++) html += '<option value="' + (i + 1) + '">' + names[i] + " (" + num(i + 1) + ")</option>";
    sel.innerHTML = html;
    sel.value = cur;
  }

  function showToday() {
    var n = todayN();
    if (!hijriOK || !H.inRange(n)) {
      $("today-ar").innerHTML = "<span>تاريخ اليوم</span><strong>" + DC.esc(F.w.format(DC.dateObj(n)) + "، " + F.g.format(DC.dateObj(n))) + "</strong>";
      return;
    }
    var h = H.fromDays(n);
    $("today-ar").innerHTML = "<span>تاريخ اليوم</span><strong>" + DC.esc(F.w.format(DC.dateObj(n)) + "، " + hijriWords(h)) + "</strong>" +
      "<span>" + DC.esc(F.g.format(DC.dateObj(n))) + " م</span>";
  }

  function renderYearTable(hy) {
    if (!hijriOK) return;
    hy = Math.max(1300, Math.min(1600, hy));
    tableYear = hy;
    $("tbl-year").textContent = dig(hy);
    if (document.activeElement !== $("table-year")) $("table-year").value = String(hy);

    var total = 0, html = "";
    for (var m = 1; m <= 12; m++) {
      var len = H.dim(hy, m);
      total += len;
      var sN = H.toDays(hy, m, 1), eN = sN + len - 1;
      var cls = activeHym && activeHym.y === hy && activeHym.m === m ? ' class="is-you"' : "";
      html += "<tr" + cls + "><td>" + num(m) + ". " + HM[m - 1] + "</td><td>" + countDays(len) + "</td><td>" +
        DC.esc(F.g.format(DC.dateObj(sN))) + "</td><td>" + DC.esc(F.g.format(DC.dateObj(eN))) + "</td></tr>";
    }
    $("months-body").innerHTML = html;
    $("year-summary").textContent = (total === 355 ? "سنة هجرية كبيسة" : "سنة هجرية بسيطة") + " (" + countDays(total) + ") وفق تقويم أم القرى.";
    $("prev-year").disabled = hy <= 1300;
    $("next-year").disabled = hy >= 1600;
  }

  function validate() {
    if (!hijriOK) { field.error("متصفحك لا يدعم التقويم الهجري."); return null; }
    if (field.isEmpty()) { field.error(""); return null; }
    var v = field.get();
    if (!v) { field.error(""); return null; }
    if (mode === "h2g" && (v.y < 1300 || v.y > 1600)) {
      field.error("أدخل سنة هجرية بين " + dig("1300") + " و" + dig("1600") + ".");
      return null;
    }
    var n = cal().toDays(v.y, v.m, v.d);
    if (n === null) { field.error("هذا التاريخ غير موجود. تحقّق من اليوم والشهر."); return null; }
    if (!H.inRange(n)) {
      field.error("التواريخ المدعومة في تقويم أم القرى من " + F.g.format(DC.dateObj(H.minDays)) +
        " إلى " + F.g.format(DC.dateObj(H.maxDays)) + " (" + dig("1300") + "–" + dig("1600") + " هـ).");
      return null;
    }
    field.error("");
    return n;
  }

  function update() {
    share = null;
    var n = validate();
    if (n === null) {
      activeHym = null;
      result.setAttribute("data-state", "empty");
      renderYearTable(tableYear);
      return;
    }
    var h = H.fromDays(n), g = G.fromDays(n), diff = n - todayN();
    var rel = diff === 0 ? "اليوم" : (diff > 0 ? "بعد " + countDays(diff) : "منذ " + countDays(-diff));
    var wd = F.w.format(DC.dateObj(n));
    var gText = F.g.format(DC.dateObj(n));
    var hText = hijriWords(h);

    if (mode === "h2g") {
      $("r-caption").textContent = hText + " بالتقويم الميلادي";
      $("r-main").textContent = gText;
      copyText = gText;
    } else {
      $("r-caption").textContent = gText + " بالتقويم الهجري";
      $("r-main").textContent = hText;
      copyText = hText;
    }
    $("r-sub").textContent = wd;
    $("copy-date").textContent = "نسخ: " + copyText;

    var rows = [
      ["التاريخ الهجري", hText],
      ["التاريخ الهجري (أرقام)", dig(hijriIso(h))],
      ["التاريخ الميلادي", gText],
      ["التاريخ الميلادي (أرقام)", dig(DC.iso(g))],
      ["اليوم", wd],
      ["الفرق عن اليوم", rel],
      ["أيام هذا الشهر الهجري", countDays(H.dim(h.y, h.m))]
    ];
    $("r-stats").innerHTML = rows.map(function (r) { return "<div><dt>" + r[0] + "</dt><dd>" + DC.esc(r[1]) + "</dd></div>"; }).join("");
    $("to-age").href = "/ar/?dob=" + DC.iso(g);
    result.setAttribute("data-state", "ready");

    activeHym = { y: h.y, m: h.m };
    renderYearTable(h.y);

    share = { date: DC.iso(g), dir: mode === "g2h" ? "g2h" : "" };
    $("whatsapp").href = "https://wa.me/?text=" + encodeURIComponent(hText + " = " + gText + " (" + wd + ")\n" + DC.shareUrl(share));
  }

  function switchMode(newMode) {
    if (newMode === mode) return;
    var n = validate();
    mode = newMode;
    $("date-legend").textContent = mode === "h2g" ? "التاريخ الهجري" : "التاريخ الميلادي";
    fillMonths();
    if (n !== null) field.set(cal().fromDays(n)); else field.error("");
    update();
  }

  function setDigits(d) {
    digits = d;
    DC.store.set("ac-digits", d);
    makeFormats();
    fillMonths();
    showToday();
    update();
  }

  // ---- init ----
  makeFormats();
  fillMonths();
  if (!hijriOK) $("hijri-unsupported").hidden = false;
  else if (H.isFallback()) $("hijri-fallback").hidden = false;
  if (digits === "arab") $("dig-arab").checked = true;

  var tN = todayN();
  if (hijriOK && H.inRange(tN)) tableYear = H.fromDays(tN).y;
  showToday();

  var p = DC.readParams(), pd = DC.parseIso(p.date);
  if (p.dir === "g2h") { $("dir-g2h").checked = true; mode = "g2h"; $("date-legend").textContent = "التاريخ الميلادي"; fillMonths(); }
  if (pd && hijriOK) {
    var pn = G.toDays(pd.y, pd.m, pd.d);
    if (H.inRange(pn)) field.set(cal().fromDays(pn));
  }

  field.on(update);
  DC.autoReveal(field, result, "تعديل التاريخ");
  $("dir-h2g").addEventListener("change", function () { switchMode("h2g"); });
  $("dir-g2h").addEventListener("change", function () { switchMode("g2h"); });
  $("dig-latn").addEventListener("change", function () { setDigits("latn"); });
  $("dig-arab").addEventListener("change", function () { setDigits("arab"); });
  $("use-today").addEventListener("click", function () {
    var n = todayN();
    if (hijriOK && H.inRange(n)) { field.set(cal().fromDays(n)); update(); }
  });
  $("copy-date").addEventListener("click", function () {
    var btn = this;
    function done() {
      var note = btn.parentNode.querySelector(".copied");
      if (note) { note.textContent = "تم نسخ التاريخ"; setTimeout(function () { note.textContent = ""; }, 2500); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(copyText).then(done, function () { prompt("", copyText); });
    else prompt("", copyText);
  });
  $("copy").addEventListener("click", function () { DC.copyLink(this, "تم نسخ الرابط", share); });

  $("prev-year").addEventListener("click", function () { renderYearTable(tableYear - 1); });
  $("next-year").addEventListener("click", function () { renderYearTable(tableYear + 1); });
  $("table-year").addEventListener("input", function () {
    var clean = DC.toLatinDigits(this.value).replace(/[^0-9]/g, "");
    if (clean !== this.value) this.value = clean;
    if (clean.length === 4) {
      var y = parseInt(clean, 10);
      if (y >= 1300 && y <= 1600) renderYearTable(y);
    }
  });

  update();
})();
