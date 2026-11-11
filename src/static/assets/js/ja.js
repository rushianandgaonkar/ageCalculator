/* ja.js — 年齢計算 + 年齢早見表 (Japanese eras, 干支, 数え年). */
(function () {
  "use strict";
  var G = DC.Gregorian;
  var $ = function (id) { return document.getElementById(id); };
  var nf = new Intl.NumberFormat("ja-JP");
  var wf = new Intl.DateTimeFormat("ja-JP", { timeZone: "UTC", weekday: "long" });

  function dn(a) { return G.toDays(a[0], a[1], a[2]); }
  var ERAS = [
    { key: "reiwa", name: "令和", base: 2018, s: dn([2019, 5, 1]), e: null, range: "2019年5月1日〜" },
    { key: "heisei", name: "平成", base: 1988, s: dn([1989, 1, 8]), e: dn([2019, 4, 30]), range: "1989年1月8日〜2019年4月30日" },
    { key: "showa", name: "昭和", base: 1925, s: dn([1926, 12, 25]), e: dn([1989, 1, 7]), range: "1926年12月25日〜1989年1月7日" },
    { key: "taisho", name: "大正", base: 1911, s: dn([1912, 7, 30]), e: dn([1926, 12, 24]), range: "1912年7月30日〜1926年12月24日" },
    { key: "meiji", name: "明治", base: 1867, s: dn([1868, 1, 25]), e: dn([1912, 7, 29]), range: "" }
  ];
  var STEM = "甲乙丙丁戊己庚辛壬癸", STEM_R = ["きのえ", "きのと", "ひのえ", "ひのと", "つちのえ", "つちのと", "かのえ", "かのと", "みずのえ", "みずのと"];
  var BR = "子丑寅卯辰巳午未申酉戌亥", BR_R = ["ね", "うし", "とら", "う", "たつ", "み", "うま", "ひつじ", "さる", "とり", "いぬ", "い"];

  function mod(a, b) { return ((a % b) + b) % b; }
  function eraByKey(k) { for (var i = 0; i < ERAS.length; i++) if (ERAS[i].key === k) return ERAS[i]; return null; }
  function eraOf(n) { for (var i = 0; i < ERAS.length; i++) { var e = ERAS[i]; if (n >= e.s && (e.e === null || n <= e.e)) return e; } return null; }
  function eraYear(e, gy) { var n = gy - e.base; return e.name + (n === 1 ? "元" : n) + "年"; }
  function eraOfDay(n) { var e = eraOf(n); return e ? eraYear(e, G.fromDays(n).y) : ""; }
  function eto(y) { var s = mod(y - 4, 10), b = mod(y - 4, 12); return STEM[s] + BR[b] + "（" + STEM_R[s] + BR_R[b] + "）"; }
  function etoAnimal(y) { var b = mod(y - 4, 12); return BR[b] + "（" + BR_R[b] + "）"; }
  function jDate(n) { var g = G.fromDays(n); return g.y + "年" + g.m + "月" + g.d + "日"; }
  function jDateEra(n) { var g = G.fromDays(n); return g.y + "年（" + eraOfDay(n) + "）" + g.m + "月" + g.d + "日"; }
  function eraLabelForYear(y) { // change-over years show both, e.g. 平成31年／令和元年
    var out = [];
    for (var i = 0; i < ERAS.length; i++) {
      var e = ERAS[i], startY = G.fromDays(e.s).y;
      if (y >= startY) { out.unshift(eraYear(e, y)); if (y !== startY) break; }
    }
    return out.join("／");
  }

  /* ---------- Calculator ---------- */
  var dobField = new DC.DateField($("dob"));
  var on = new DC.DateField($("on"));
  var eraSel = $("era");
  var result = $("result");

  function readDob() {
    var p = dobField.parts;
    var y = DC.toLatinDigits(p.y.value).trim(), m = DC.toLatinDigits(p.m.value).trim(), d = DC.toLatinDigits(p.d.value).trim();
    if (!y && !m && !d) { dobField.error(""); return null; }
    if (!/^\d+$/.test(y) || !/^\d+$/.test(m) || !/^\d+$/.test(d)) { dobField.error(""); return null; }
    var era = eraSel.value, gy;
    if (era === "ad") {
      if (y.length < 4) { dobField.error(""); return null; }
      gy = +y;
      if (gy < 1868 || gy > 2200) { dobField.error("1868年〜2200年の範囲で入力してください。"); return null; }
    } else {
      var e = eraByKey(era);
      if (+y < 1) { dobField.error("年を入力してください。"); return null; }
      gy = e.base + (+y);
    }
    var n = G.toDays(gy, +m, +d);
    if (n === null) { dobField.error("その日付は存在しません。月と日を確認してください。"); return null; }
    if (era !== "ad") {
      var er = eraByKey(era);
      if (n < er.s || (er.e !== null && n > er.e)) { dobField.error("その日付は" + er.name + "の期間外です（" + er.name + "は" + er.range + "）。"); return null; }
    }
    dobField.error("");
    return n;
  }
  function readOn() {
    if (on.isEmpty()) { on.error(""); return null; }
    var v = on.get();
    if (!v) { on.error(""); return null; }
    var n = G.toDays(v.y, v.m, v.d);
    if (n === null) { on.error("その日付は存在しません。"); return null; }
    on.error("");
    return n;
  }

  function update() {
    var bn = readDob(), onN = readOn();
    markRow(bn === null ? null : G.fromDays(bn).y);
    if (bn === null || onN === null) { result.setAttribute("data-state", "empty"); return; }
    if (bn > onN) { dobField.error("生年月日が計算する日より後になっています。"); result.setAttribute("data-state", "empty"); return; }
    var b = G.fromDays(bn), o = G.fromDays(onN);
    var a = DC.age(G, b, o);
    var t = DC.todayParts(), isToday = onN === G.toDays(t.y, t.m, t.d);

    $("r-caption").textContent = isToday ? "今日時点の満年齢" : jDate(onN) + "時点の満年齢";
    $("r-years").textContent = nf.format(a.y);
    $("r-sub").textContent = a.m + "か月" + a.d + "日";
    var last = DC.addMonths(G, b, a.y * 12), next = DC.addMonths(G, b, (a.y + 1) * 12);
    DC.renderRuler($("r-ruler"), a,
      "<span><b>" + a.y + "歳</b> " + jDate(G.toDays(last.y, last.m, last.d)) + "</span><span><b>" + (a.y + 1) + "歳</b> " + jDate(G.toDays(next.y, next.m, next.d)) + "</span>");
    $("r-ruler").setAttribute("aria-label", (a.y + 1) + "歳の誕生日まで12か月中" + a.m + "か月経過");

    var nb = DC.nextBirthday(G, b, o), note = $("r-note");
    if (nb && nb.isToday && a.y > 0) { note.hidden = false; note.className = "callout ok"; note.innerHTML = "<p>お誕生日おめでとうございます。今日で" + a.y + "歳です。</p>"; }
    else note.hidden = true;

    var weeks = Math.floor(a.days / 7), wd = a.days % 7;
    var rows = [
      ["生年月日", jDateEra(bn)],
      ["生まれた曜日", wf.format(DC.dateObj(bn))],
      ["干支", eto(b.y)],
      ["数え年", (o.y - b.y + 1) + "歳"],
      ["次の誕生日", nb ? (nb.isToday ? "今日" : jDate(nb.dayNum) + "（あと" + nf.format(nb.days) + "日）") : "–"],
      ["月数で", nf.format(a.months) + "か月" + (a.d ? a.d + "日" : "")],
      ["週数で", nf.format(weeks) + "週" + (wd ? wd + "日" : "")],
      ["日数で", nf.format(a.days) + "日"]
    ];
    $("r-stats").innerHTML = rows.map(function (r) { return "<div><dt>" + r[0] + "</dt><dd>" + DC.esc(r[1]) + "</dd></div>"; }).join("");
    result.setAttribute("data-state", "ready");
    DC.writeParams({ dob: DC.iso(b), on: isToday ? "" : DC.iso(o) });
  }

  function onEraChange() {
    var prev = eraSel.getAttribute("data-prev") || "ad";
    var era = eraSel.value;
    eraSel.setAttribute("data-prev", era);
    dobField.parts.y.setAttribute("maxlength", era === "ad" ? "4" : "2");
    dobField.parts.y.setAttribute("placeholder", era === "ad" ? "1994" : "6");
    // convert a year already typed
    var y = DC.toLatinDigits(dobField.parts.y.value).trim();
    if (/^\d+$/.test(y)) {
      var gy = prev === "ad" ? +y : eraByKey(prev).base + (+y);
      if (era === "ad") dobField.parts.y.value = String(gy);
      else { var n = gy - eraByKey(era).base; dobField.parts.y.value = n >= 1 && n <= 99 ? String(n) : ""; }
    }
    update();
  }

  /* ---------- 早見表 ---------- */
  var tbody = $("hayami-body");
  function buildTable(year) {
    var html = "";
    for (var y = year; y >= 1926; y--) {
      var after = year - y, before = after - 1;
      html += '<tr data-y="' + y + '"><td>' + y + "年</td><td>" + eraLabelForYear(y) + "</td><td>" + etoAnimal(y) +
        "</td><td>" + after + "歳</td><td>" + (before < 0 ? "—" : before + "歳") + "</td></tr>";
    }
    tbody.innerHTML = html;
    tbody.setAttribute("data-year", year);
    var ch = $("choju-body");
    if (ch) {
      var C = [["還暦", "かんれき", 61, "60歳（数え61歳）"], ["古希", "こき", 70], ["喜寿", "きじゅ", 77], ["傘寿", "さんじゅ", 80],
        ["米寿", "べいじゅ", 88], ["卒寿", "そつじゅ", 90], ["白寿", "はくじゅ", 99], ["百寿", "ひゃくじゅ", 100]];
      ch.innerHTML = C.map(function (c) {
        var k = c[0] === "還暦" ? year - 60 : year - c[2] + 1, m = c[0] === "還暦" ? year - 60 : year - c[2];
        return "<tr><td><strong>" + c[0] + "</strong>（" + c[1] + "）</td><td>" + (c[3] || c[2] + "歳") +
          "</td><td>" + k + "年（" + eraLabelForYear(k) + "）</td><td>" + m + "年（" + eraLabelForYear(m) + "）</td></tr>";
      }).join("");
    }
    var spansY = document.querySelectorAll("[data-ja-year]"), spansR = document.querySelectorAll("[data-ja-reiwa]");
    for (var i = 0; i < spansY.length; i++) spansY[i].textContent = year;
    for (var j = 0; j < spansR.length; j++) spansR[j].textContent = year - 2018;
  }
  function markRow(y) {
    var old = tbody.querySelector("tr.is-you");
    if (old) old.classList.remove("is-you");
    if (y) { var r = tbody.querySelector('tr[data-y="' + y + '"]'); if (r) r.classList.add("is-you"); }
  }
  var thisYear = new Date().getFullYear();
  if (+tbody.getAttribute("data-year") !== thisYear) buildTable(thisYear);

  var find = $("find-year");
  find.addEventListener("input", function () {
    var v = DC.toLatinDigits(find.value).replace(/[^0-9]/g, "");
    find.value = v;
    if (v.length === 4) {
      var row = tbody.querySelector('tr[data-y="' + v + '"]');
      if (row) {
        markRow(+v);
        var wrap = row.closest(".table-wrap");
        wrap.scrollTop = row.offsetTop - wrap.clientHeight / 2;
      }
    }
  });

  /* ---------- init ---------- */
  var p = DC.readParams(), pOn = DC.parseIso(p.on), pDob = DC.parseIso(p.dob);
  on.set(pOn || DC.todayParts());
  if (pOn) $("other-date").open = true;
  if (pDob) { dobField.parts.y.value = pDob.y; dobField.parts.m.value = pDob.m; dobField.parts.d.value = pDob.d; }
  // month/day placeholders without leading zeros look more natural in Japanese
  on.parts.m.value = String(+on.parts.m.value || ""); on.parts.d.value = String(+on.parts.d.value || "");

  dobField.on(update);
  DC.autoReveal(dobField, result, "生年月日を変更");
  on.on(update);
  eraSel.addEventListener("change", onEraChange);
  $("reset-today").addEventListener("click", function () { var t = DC.todayParts(); on.set(t); on.parts.m.value = t.m; on.parts.d.value = t.d; update(); });
  $("copy").addEventListener("click", function () { DC.copyLink(this, "コピーしました"); });
  update();
})();
