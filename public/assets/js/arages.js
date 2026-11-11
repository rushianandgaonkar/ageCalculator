/* arages.js — Arabic 100-year age lookup tables (Hijri & Gregorian) + quick year lookup. */
(function () {
  "use strict";
  var G = DC.Gregorian, H = DC.Hijri;
  var $ = function (id) { return document.getElementById(id); };
  var FORMS = {
    year: ["سنة واحدة", "سنتان", "سنوات", "سنة", "سنة"]
  };
  var pr = new Intl.PluralRules("ar");
  var hijriOK = H.supported();
  var mode = "h";
  var digits = DC.store.get("ac-digits") === "arab" ? "arab" : "latn";
  var F = {};
  var share = null;

  var nowG = DC.todayParts();
  var curGY = nowG.y;
  var todayN = G.toDays(nowG.y, nowG.m, nowG.d);
  var curHY = hijriOK && H.inRange(todayN) ? H.fromDays(todayN).y : +$("hijri-body").getAttribute("data-hyear");

  function makeFormats() {
    F.num = new Intl.NumberFormat("ar-SA-u-nu-" + digits);
  }
  function dig(s) { return DC.toDigits(s, digits); }
  function ageLabel(n) {
    if (n < 0) return "—";
    if (n === 0) return "أقل من سنة";
    var f = FORMS.year, c = pr.select(n);
    if (c === "one") return f[0];
    if (c === "two") return f[1];
    return dig(n) + " " + (c === "few" ? f[2] : c === "many" ? f[3] : f[4]);
  }
  function yearRangeText(a, b, suffix) {
    return a === b ? dig(a) + " " + suffix : dig(a) + "–" + dig(b) + " " + suffix;
  }

  function hijriSpanForGreg(gy) {
    if (!hijriOK) return "–";
    var n1 = G.toDays(gy, 1, 1), n2 = G.toDays(gy, 12, 31);
    if (!H.inRange(n1) || !H.inRange(n2)) return "خارج نطاق أم القرى";
    return yearRangeText(H.fromDays(n1).y, H.fromDays(n2).y, "هـ");
  }
  function gregSpanForHijri(hy) {
    if (!hijriOK || hy < 1300 || hy > 1600) return "–";
    var s = G.fromDays(H.toDays(hy, 1, 1));
    var e = G.fromDays(H.toDays(hy, 12, H.dim(hy, 12)));
    return yearRangeText(s.y, e.y, "م");
  }

  function buildTables() {
    var hBody = $("hijri-body"), gBody = $("greg-body");
    var hRows = "", gRows = "";
    for (var hy = curHY; hy >= curHY - 100; hy--) {
      if (hy < 1300) break;
      var afterH = curHY - hy, beforeH = afterH - 1;
      hRows += '<tr data-hy="' + hy + '"><td>' + dig(hy) + " هـ</td><td>" + gregSpanForHijri(hy) +
        "</td><td>" + ageLabel(afterH) + "</td><td>" + (beforeH < 0 ? "—" : ageLabel(beforeH)) + "</td></tr>";
    }
    hBody.innerHTML = hRows;
    hBody.setAttribute("data-hyear", curHY);

    for (var gy = curGY; gy >= curGY - 100; gy--) {
      var afterG = curGY - gy, beforeG = afterG - 1;
      gRows += '<tr data-gy="' + gy + '"><td>' + dig(gy) + " م</td><td>" + hijriSpanForGreg(gy) +
        "</td><td>" + ageLabel(afterG) + "</td><td>" + (beforeG < 0 ? "—" : ageLabel(beforeG)) + "</td></tr>";
    }
    gBody.innerHTML = gRows;
    gBody.setAttribute("data-year", curGY);

    var sH = document.querySelectorAll("[data-ar-hyear]");
    for (var i = 0; i < sH.length; i++) sH[i].textContent = dig(curHY);
    var sG = document.querySelectorAll("[data-ar-gyear]");
    for (var j = 0; j < sG.length; j++) sG[j].textContent = dig(curGY);
  }

  function clearMark() {
    var old = document.querySelectorAll("tr.is-you");
    for (var i = 0; i < old.length; i++) old[i].classList.remove("is-you");
  }
  function markRow(attr, y) {
    clearMark();
    var row = document.querySelector('tr[' + attr + '="' + y + '"]');
    if (row) {
      row.classList.add("is-you");
      var wrap = row.closest(".table-wrap");
      if (wrap) wrap.scrollTop = Math.max(0, row.offsetTop - wrap.clientHeight / 2);
    }
  }

  function setErr(msg) {
    var el = $("year-err");
    $("year-field").classList.toggle("has-error", !!msg);
    el.textContent = msg || "";
    el.hidden = !msg;
  }

  function update() {
    share = null;
    var raw = DC.toLatinDigits($("birth-year").value).replace(/[^0-9]/g, "");
    if (raw !== $("birth-year").value) $("birth-year").value = raw;
    if (!raw) { setErr(""); clearMark(); $("result").setAttribute("data-state", "empty"); return; }
    if (raw.length < 4) { setErr(""); clearMark(); $("result").setAttribute("data-state", "empty"); return; }

    var y = parseInt(raw, 10);
    var cur = mode === "h" ? curHY : curGY;
    var lo = mode === "h" ? 1300 : 1800;
    if (y < lo || y > cur) {
      setErr("أدخل سنة بين " + dig(lo) + " و" + dig(cur) + ".");
      clearMark();
      $("result").setAttribute("data-state", "empty");
      return;
    }
    setErr("");

    var after = cur - y, before = after - 1;
    var calSuffix = mode === "h" ? "هـ" : "م";
    $("r-caption").textContent = "مواليد " + dig(y) + " " + calSuffix + " في عام " + dig(cur) + " " + calSuffix;
    $("r-years").textContent = dig(after);
    $("r-sub").textContent = after === 0 ? "مولود هذا العام"
      : ("إذا مرّ عيد ميلادك هذا العام (أو " + ageLabel(before) + " قبله)");

    var otherSpan = mode === "h" ? gregSpanForHijri(y) : hijriSpanForGreg(y);
    var rows = [
      ["بعد عيد الميلاد", ageLabel(after)],
      ["قبل عيد الميلاد", before < 0 ? "—" : ageLabel(before)],
      ["الموافق في التقويم الآخر", otherSpan]
    ];
    if (mode === "h" && hijriOK && y >= 1300 && y <= 1600) {
      var gs = G.fromDays(H.toDays(y, 1, 1)).y;
      var ge = G.fromDays(H.toDays(y, 12, H.dim(y, 12))).y;
      var gMin = Math.max(0, curGY - ge), gMax = Math.max(0, curGY - gs);
      rows.push(["العمر التقريبي بالميلادي", gMin === gMax ? ageLabel(gMin) : dig(gMin) + "–" + dig(gMax) + " سنة"]);
    } else if (mode === "g" && hijriOK && H.inRange(G.toDays(y, 1, 1)) && H.inRange(G.toDays(y, 12, 31))) {
      var hs = H.fromDays(G.toDays(y, 1, 1)).y;
      var he = H.fromDays(G.toDays(y, 12, 31)).y;
      var hMin = Math.max(0, curHY - he), hMax = Math.max(0, curHY - hs);
      rows.push(["العمر التقريبي بالهجري", hMin === hMax ? ageLabel(hMin) : dig(hMin) + "–" + dig(hMax) + " سنة"]);
    }

    $("r-stats").innerHTML = rows.map(function (r) { return "<div><dt>" + r[0] + "</dt><dd>" + DC.esc(r[1]) + "</dd></div>"; }).join("");
    $("result").setAttribute("data-state", "ready");
    markRow(mode === "h" ? "data-hy" : "data-gy", y);

    share = { y: String(y), cal: mode === "g" ? "g" : "" };
    var waText = "مواليد " + dig(y) + " " + calSuffix + ": العمر " + ageLabel(after) + " (أو " + ageLabel(before) + " قبل عيد الميلاد) في " + dig(cur) + " " + calSuffix;
    $("whatsapp").href = "https://wa.me/?text=" + encodeURIComponent(waText + "\n" + DC.shareUrl(share));
  }

  function switchMode(m) {
    if (m === mode) return;
    mode = m;
    $("year-legend").textContent = mode === "h" ? "سنة الميلاد (هجري)" : "سنة الميلاد (ميلادي)";
    $("birth-year").setAttribute("placeholder", mode === "h" ? "1420" : "1995");
    update();
  }

  function setDigits(d) {
    digits = d;
    DC.store.set("ac-digits", d);
    makeFormats();
    buildTables();
    update();
  }

  // ---- init ----
  makeFormats();
  if (hijriOK && H.isFallback()) $("hijri-fallback").hidden = false;
  if (digits === "arab") $("dig-arab").checked = true;
  if (+$("greg-body").getAttribute("data-year") !== curGY || +$("hijri-body").getAttribute("data-hyear") !== curHY || digits === "arab") {
    buildTables();
  }

  var p = DC.readParams();
  if (p.cal === "g") { $("cal-g").checked = true; mode = "g"; $("year-legend").textContent = "سنة الميلاد (ميلادي)"; $("birth-year").setAttribute("placeholder", "1995"); }
  if (p.y && /^\d{4}$/.test(p.y)) $("birth-year").value = p.y;

  $("birth-year").addEventListener("input", update);
  $("cal-h").addEventListener("change", function () { switchMode("h"); });
  $("cal-g").addEventListener("change", function () { switchMode("g"); });
  $("dig-latn").addEventListener("change", function () { setDigits("latn"); });
  $("dig-arab").addEventListener("change", function () { setDigits("arab"); });
  $("copy").addEventListener("click", function () { DC.copyLink(this, "تم نسخ الرابط", share); });

  update();
})();
