/* gakunen.js — 学年早見表: school grade for the current 年度 (April–March) and 入学・卒業 years.
   Japanese school years group children born 2 April (year Y) to 1 April (Y+1); they enter
   elementary school in April of Y+7. 4月1日生まれ belongs to the earlier year (年齢計算ニ関スル法律). */
(function () {
  "use strict";
  var G = DC.Gregorian;
  var $ = function (id) { return document.getElementById(id); };
  var ERAS = [["令和", 2018, [2019, 5, 1]], ["平成", 1988, [1989, 1, 8]], ["昭和", 1925, [1926, 12, 25]], ["大正", 1911, [1912, 7, 30]]];
  var ERA_KEYS = { reiwa: 0, heisei: 1, showa: 2, taisho: 3 };
  function eraOfDate(y, m, d) {
    var n = G.toDays(y, m, d);
    for (var i = 0; i < ERAS.length; i++) { var s = ERAS[i][2]; if (n >= G.toDays(s[0], s[1], s[2])) { var k = y - ERAS[i][1]; return ERAS[i][0] + (k === 1 ? "元" : k) + "年"; } }
    return "";
  }
  function ym(y, m) { return y + "年" + m + "月（" + eraOfDate(y, m, m === 3 ? 31 : 1) + "）"; }
  function fiscalYear() { var t = DC.todayParts(); return t.m >= 4 ? t.y : t.y - 1; }
  function entryYear(y, m, d) { return (m > 4 || (m === 4 && d >= 2)) ? y + 7 : y + 6; }
  var GRADES = [[-2, "年少"], [-1, "年中"], [0, "年長"], [1, "小学1年生"], [2, "小学2年生"], [3, "小学3年生"], [4, "小学4年生"], [5, "小学5年生"], [6, "小学6年生"],
    [7, "中学1年生"], [8, "中学2年生"], [9, "中学3年生"], [10, "高校1年生"], [11, "高校2年生"], [12, "高校3年生"],
    [13, "大学1年生"], [14, "大学2年生"], [15, "大学3年生"], [16, "大学4年生"]];
  function gradeName(g) {
    if (g < -2) return "未就園（3歳児クラス入園前）";
    if (g > 16) return "大学卒業後（4年制・現役の場合）";
    for (var i = 0; i < GRADES.length; i++) if (GRADES[i][0] === g) return GRADES[i][1] + (g >= 13 ? "（現役の場合）" : "");
    return "";
  }

  /* ---------- Table (static from the build; rebuilt here if the school year has moved on) ---------- */
  var tbody = $("gakunen-body");
  function buildTable(F) {
    tbody.innerHTML = GRADES.map(function (gr) {
      var E = F - gr[0] + 1, y1 = E - 7, y2 = E - 6;
      return '<tr data-e="' + E + '"><td>' + gr[1] + "</td><td>" + y1 + "年4月2日〜" + y2 + "年4月1日</td><td>" +
        eraOfDate(y1, 4, 2) + "4月2日〜" + eraOfDate(y2, 4, 1) + "4月1日</td></tr>";
    }).join("");
    tbody.setAttribute("data-fy", F);
    var s = document.querySelectorAll("[data-ja-fy]"), r = document.querySelectorAll("[data-ja-fy-reiwa]");
    for (var i = 0; i < s.length; i++) s[i].textContent = F;
    for (var j = 0; j < r.length; j++) r[j].textContent = F - 2018;
  }
  var FY = fiscalYear();
  if (+tbody.getAttribute("data-fy") !== FY) buildTable(FY);

  /* ---------- Calculator ---------- */
  var field = new DC.DateField($("dob"));
  var eraSel = $("era");
  var result = $("result");

  function readDob() {
    var p = field.parts;
    var y = DC.toLatinDigits(p.y.value).trim(), m = DC.toLatinDigits(p.m.value).trim(), d = DC.toLatinDigits(p.d.value).trim();
    if (!/^\d+$/.test(y) || !/^\d+$/.test(m) || !/^\d+$/.test(d)) { field.error(""); return null; }
    var gy;
    if (eraSel.value === "ad") { if (y.length < 4) { field.error(""); return null; } gy = +y; }
    else gy = ERAS[ERA_KEYS[eraSel.value]][1] + (+y);
    if (gy < 1900 || gy > 2200) { field.error("1900年〜2200年の範囲で入力してください。"); return null; }
    if (G.toDays(gy, +m, +d) === null) { field.error("その日付は存在しません。月と日を確認してください。"); return null; }
    field.error("");
    return { y: gy, m: +m, d: +d };
  }

  function update() {
    var old = tbody.querySelector("tr.is-you"); if (old) old.classList.remove("is-you");
    var b = readDob();
    if (!b) { result.setAttribute("data-state", "empty"); return; }
    var E = entryYear(b.y, b.m, b.d), g = FY - E + 1;
    var row = tbody.querySelector('tr[data-e="' + E + '"]'); if (row) row.classList.add("is-you");
    var haya = b.m < 4 || (b.m === 4 && b.d === 1);
    $("r-caption").textContent = FY + "年度（令和" + (FY - 2018) + "年度）の学年";
    $("r-grade").textContent = gradeName(g);
    $("r-sub").textContent = b.y + "年" + b.m + "月" + b.d + "日生まれ" + (haya ? "（早生まれ）" : "");
    var rows = [
      ["小学校入学", ym(E, 4)], ["小学校卒業", ym(E + 6, 3)],
      ["中学校入学", ym(E + 6, 4)], ["中学校卒業", ym(E + 9, 3)],
      ["高校入学", ym(E + 9, 4)], ["高校卒業", ym(E + 12, 3)],
      ["大学入学（現役）", ym(E + 12, 4)], ["大学卒業（4年制）", ym(E + 16, 3)],
      ["二十歳のつどい（成人式）", ym(E + 14, 1)]
    ];
    $("r-stats").innerHTML = rows.map(function (r) { return "<div><dt>" + r[0] + "</dt><dd>" + DC.esc(r[1]) + "</dd></div>"; }).join("");
    result.setAttribute("data-state", "ready");
    DC.writeParams({ dob: DC.iso(b) });
  }

  eraSel.addEventListener("change", function () {
    field.parts.y.setAttribute("maxlength", eraSel.value === "ad" ? "4" : "2");
    field.parts.y.value = "";
    field.parts.y.setAttribute("placeholder", eraSel.value === "ad" ? "2015" : "27");
    update();
  });
  var p = DC.readParams(), pd = DC.parseIso(p.dob);
  if (pd) { field.parts.y.value = pd.y; field.parts.m.value = pd.m; field.parts.d.value = pd.d; }
  field.on(update);
  DC.autoReveal(field, result, "生年月日を変更");
  $("copy").addEventListener("click", function () { DC.copyLink(this, "コピーしました"); });
  update();
})();
