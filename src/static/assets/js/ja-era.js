/* ja-era.js: 西暦和暦変換と早見表: リアルタイム変換・満年齢・数え年・干支・厄年 */
(function () {
  "use strict";
  var G = DC.Gregorian;
  var $ = function (id) { return document.getElementById(id); };

  var eraSel = $("era-sel");
  var yearInput = $("era-y");
  var monthInput = $("era-m");
  var dayInput = $("era-d");
  var fieldRoot = $("era-field");
  var errorEl = fieldRoot ? fieldRoot.querySelector(".field-error") : null;
  var result = $("result");
  var share = null;

  var ERAS = {
    reiwa:  { name: "令和", kana: "れいわ",   base: 2018, startY: 2019, startM: 5,  startD: 1,  max: 100 },
    heisei: { name: "平成", kana: "へいせい", base: 1988, startY: 1989, startM: 1,  startD: 8,  max: 31 },
    showa:  { name: "昭和", kana: "しょうわ", base: 1925, startY: 1926, startM: 12, startD: 25, max: 64 },
    taisho: { name: "大正", kana: "たいしょう", base: 1911, startY: 1912, startM: 7,  startD: 30, max: 15 },
    meiji:  { name: "明治", kana: "めいじ",   base: 1867, startY: 1868, startM: 1,  startD: 25, max: 45 }
  };
  var ERA_LIST = [
    ["令和", 2018, 2019, 5, 1],
    ["平成", 1988, 1989, 1, 8],
    ["昭和", 1925, 1926, 12, 25],
    ["大正", 1911, 1912, 7, 30],
    ["明治", 1867, 1868, 1, 25]
  ];

  var STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  var STEM_KANA = ["きのえ", "きのと", "ひのえ", "ひのと", "つちのえ", "つちのと", "かのえ", "かのと", "みずのえ", "みずのと"];
  var BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  var BRANCH_KANA = ["ね", "うし", "とら", "う", "たつ", "み", "うま", "ひつじ", "さる", "とり", "いぬ", "い"];

  function getEto(y) {
    var sIdx = ((y - 4) % 10 + 10) % 10;
    var bIdx = ((y - 4) % 12 + 12) % 12;
    var kanji = STEMS[sIdx] + BRANCHES[bIdx];
    var kana = STEM_KANA[sIdx] + BRANCH_KANA[bIdx];
    return kanji + "（" + kana + "）";
  }

  function getEraLabel(gy) {
    var labels = [];
    for (var i = 0; i < ERA_LIST.length; i++) {
      var item = ERA_LIST[i];
      var name = item[0], base = item[1], startY = item[2];
      if (gy >= startY) {
        var n = gy - base;
        labels.append ? labels.append : labels.push(name + (n === 1 ? "元" : n) + "年");
        if (gy === startY) continue;
        break;
      }
    }
    return labels.reverse().join("／");
  }

  function eraOfDate(y, m, d) {
    var n = G.toDays(y, m, d);
    if (n === null) return getEraLabel(y);
    for (var i = 0; i < ERA_LIST.length; i++) {
      var item = ERA_LIST[i];
      var sN = G.toDays(item[2], item[3], item[4]);
      if (n >= sN) {
        var k = y - item[1];
        return item[0] + (k === 1 ? "元" : k) + "年";
      }
    }
    return "";
  }

  function getYakudoshi(kazoe) {
    var m = "", f = "", isDai = false;
    if (kazoe === 24) m = "前厄";
    else if (kazoe === 25) m = "本厄";
    else if (kazoe === 26) m = "後厄";
    else if (kazoe === 41) m = "前厄";
    else if (kazoe === 42) { m = "大厄（本厄）"; isDai = true; }
    else if (kazoe === 43) m = "後厄";
    else if (kazoe === 60) m = "前厄";
    else if (kazoe === 61) m = "本厄（還暦）";
    else if (kazoe === 62) m = "後厄";

    if (kazoe === 18) f = "前厄";
    else if (kazoe === 19) f = "本厄";
    else if (kazoe === 20) f = "後厄";
    else if (kazoe === 32) f = "前厄";
    else if (kazoe === 33) { f = "大厄（本厄）"; isDai = true; }
    else if (kazoe === 34) f = "後厄";
    else if (kazoe === 36) f = "前厄";
    else if (kazoe === 37) f = "本厄";
    else if (kazoe === 38) f = "後厄";
    else if (kazoe === 60) f = "前厄";
    else if (kazoe === 61) f = "本厄（還暦）";
    else if (kazoe === 62) f = "後厄";

    return { m: m, f: f, isDai: isDai };
  }

  function statRow(dt, dd) {
    return "<div><dt>" + DC.esc(dt) + "</dt><dd>" + dd + "</dd></div>";
  }

  function setError(msg) {
    if (fieldRoot) fieldRoot.classList.toggle("has-error", !!msg);
    if (errorEl) {
      errorEl.textContent = msg || "";
      errorEl.hidden = !msg;
    }
  }

  function update() {
    share = null;
    var eraKey = eraSel ? eraSel.value : "ad";
    var yVal = DC.toLatinDigits(yearInput.value).trim();
    if (!yVal || !/^\d+$/.test(yVal)) {
      setError("");
      result.setAttribute("data-state", "empty");
      return;
    }
    var yNum = parseInt(yVal, 10);
    if (yNum <= 0) {
      setError("1以上の年を入力してください。");
      result.setAttribute("data-state", "empty");
      return;
    }

    var gy;
    if (eraKey === "ad") {
      if (yVal.length < 4) {
        setError("");
        result.setAttribute("data-state", "empty");
        return;
      }
      gy = yNum;
      if (gy < 1868 || gy > 2200) {
        setError("1868年（明治元年）〜2200年の範囲で入力してください。");
        result.setAttribute("data-state", "empty");
        return;
      }
    } else {
      var eraInfo = ERAS[eraKey];
      if (!eraInfo) return;
      if (yNum > eraInfo.max) {
        setError(eraInfo.name + "は" + eraInfo.max + "年までです。");
        result.setAttribute("data-state", "empty");
        return;
      }
      gy = eraInfo.base + yNum;
    }

    var mVal = DC.toLatinDigits(monthInput.value).trim();
    var dVal = DC.toLatinDigits(dayInput.value).trim();
    var hasExactDate = false;
    var mNum = 1, dNum = 1;

    if (mVal && dVal && /^\d+$/.test(mVal) && /^\d+$/.test(dVal)) {
      mNum = parseInt(mVal, 10);
      dNum = parseInt(dVal, 10);
      if (G.toDays(gy, mNum, dNum) === null) {
        setError("その日付は存在しません。月と日を確認してください。");
        result.setAttribute("data-state", "empty");
        return;
      }
      hasExactDate = true;
    }
    setError("");

    var today = DC.todayParts();
    var cy = today.y;
    var kazoe = cy - gy + 1;
    var afterAge = cy - gy;
    var beforeAge = afterAge - 1;

    var exactAgeStr = "";
    if (hasExactDate) {
      var exactAge = DC.age(G, { y: gy, m: mNum, d: dNum }, today);
      if (exactAge) {
        exactAgeStr = exactAge.y + "歳（" + exactAge.m + "ヶ月 " + exactAge.d + "日）";
      } else {
        exactAgeStr = "まだ生まれていません";
      }
    } else {
      exactAgeStr = (afterAge >= 0 ? afterAge + "歳（誕生日後）" : "0歳") + " / " + (beforeAge >= 0 ? beforeAge + "歳（誕生日前）" : "-");
    }

    var eraLabel = getEraLabel(gy);
    var eto = getEto(gy);
    var yaku = getYakudoshi(kazoe);

    // Update Result panel
    if (eraKey === "ad") {
      $("r-caption").textContent = "西暦 " + gy + "年 の和暦変換・年齢";
      $("r-main").textContent = eraLabel + "（" + gy + "年）";
    } else {
      var selName = ERAS[eraKey] ? ERAS[eraKey].name : "";
      $("r-caption").textContent = selName + (yNum === 1 ? "元年" : yNum + "年") + " の西暦変換・年齢";
      $("r-main").textContent = "西暦 " + gy + "年（" + eraLabel + "）";
    }

    $("r-sub").textContent = "干支: " + eto + " ｜ 満年齢: " + (afterAge >= 0 ? afterAge : 0) + "歳 ｜ 数え年: " + (kazoe >= 1 ? kazoe : 1) + "歳";

    // Yakudoshi alert
    var yakuCallout = $("r-yaku");
    if (yakuCallout) {
      if (yaku.m || yaku.f) {
        var alerts = [];
        if (yaku.m) alerts.push("男性: " + yaku.m + "（数え" + kazoe + "歳）");
        if (yaku.f) alerts.push("女性: " + yaku.f + "（数え" + kazoe + "歳）");
        var daiText = yaku.isDai ? "【大厄】" : "";
        yakuCallout.hidden = false;
        yakuCallout.innerHTML = "<p><strong>今年（" + cy + "年）の厄年該当年です！" + daiText + "</strong>" + alerts.join(" / ") + "</p>";
      } else {
        yakuCallout.hidden = true;
        yakuCallout.innerHTML = "";
      }
    }

    // Stats
    var statsHtml = "";
    statsHtml += statRow("西暦表記", gy + "年");
    statsHtml += statRow("和暦表記", eraLabel);
    statsHtml += statRow("干支（十干十二支）", eto);
    statsHtml += statRow("満年齢", exactAgeStr);
    statsHtml += statRow("数え年（伝統的年齢）", (kazoe >= 1 ? kazoe + "歳" : "-"));

    var yakuMaleStr = yaku.m ? '<span class="tag ' + (yaku.m.indexOf("大厄") !== -1 ? "danger" : "warning") + '">' + yaku.m + "</span>" : "該当なし";
    var yakuFemaleStr = yaku.f ? '<span class="tag ' + (yaku.f.indexOf("大厄") !== -1 ? "danger" : "warning") + '">' + yaku.f + "</span>" : "該当なし";
    statsHtml += statRow("今年（" + cy + "年）の厄年", "男性: " + yakuMaleStr + " ｜ 女性: " + yakuFemaleStr);

    // Lifetime Yakudoshi milestones for this birth year
    var milestones = [
      ["女性 19歳本厄", gy + 18],
      ["男性 25歳本厄", gy + 24],
      ["女性 33歳大厄", gy + 32],
      ["女性 37歳本厄", gy + 36],
      ["男性 42歳大厄", gy + 41],
      ["男女 61歳還暦厄", gy + 60]
    ];
    var mileStrs = milestones.map(function (m) {
      var isCur = m[1] === cy;
      var style = isCur ? ' style="color:var(--error);font-weight:700;"' : "";
      return "<span" + style + ">" + m[0] + ": " + m[1] + "年（" + getEraLabel(m[1]) + "）</span>";
    });
    statsHtml += statRow("一生の厄年該当年", '<div style="font-size:13px;line-height:1.6;display:flex;flex-direction:column;gap:3px;">' + mileStrs.join("") + "</div>");

    $("r-stats").innerHTML = statsHtml;
    result.setAttribute("data-state", "ready");

    // Table highlight
    var oldActive = document.querySelector("#era-table tbody tr.is-you");
    if (oldActive) oldActive.classList.remove("is-you");
    var targetRow = document.querySelector('#era-table tbody tr[data-y="' + gy + '"]');
    if (targetRow) {
      targetRow.classList.add("is-you");
    }

    share = {
      era: eraKey,
      y: yVal,
      m: mVal || "",
      d: dVal || ""
    };
  }

  // Era select change
  if (eraSel) {
    eraSel.addEventListener("change", function () {
      var val = eraSel.value;
      if (val === "ad") {
        yearInput.setAttribute("maxlength", "4");
        yearInput.setAttribute("placeholder", "2026");
      } else {
        var eraInfo = ERAS[val];
        yearInput.setAttribute("maxlength", "2");
        yearInput.setAttribute("placeholder", eraInfo ? String(eraInfo.max >= 8 ? 8 : 1) : "1");
      }
      update();
    });
  }

  if (yearInput) yearInput.addEventListener("input", update);
  if (monthInput) monthInput.addEventListener("input", update);
  if (dayInput) dayInput.addEventListener("input", update);

  // Preset chips
  var presetChips = document.querySelectorAll("[data-preset-era]");
  for (var i = 0; i < presetChips.length; i++) {
    presetChips[i].addEventListener("click", function () {
      var era = this.getAttribute("data-preset-era");
      var y = this.getAttribute("data-preset-y");
      if (eraSel) eraSel.value = era;
      if (yearInput) {
        yearInput.setAttribute("maxlength", era === "ad" ? "4" : "2");
        yearInput.value = y;
      }
      update();
    });
  }

  var btnToday = $("btn-era-today");
  if (btnToday) {
    btnToday.addEventListener("click", function () {
      var today = DC.todayParts();
      if (eraSel) eraSel.value = "reiwa";
      if (yearInput) {
        yearInput.setAttribute("maxlength", "2");
        yearInput.value = String(today.y - 2018);
      }
      if (monthInput) monthInput.value = String(today.m);
      if (dayInput) dayInput.value = String(today.d);
      update();
    });
  }

  // Table filtering and search
  var findInput = $("find-era");
  var tableBody = $("era-table-body");
  var allRows = tableBody ? tableBody.querySelectorAll("tr") : [];

  function filterTable() {
    var q = (findInput ? findInput.value : "").trim().toLowerCase();
    var activeFilter = document.querySelector(".exam-pills .filter-pill.is-active");
    var filterEra = activeFilter ? activeFilter.id.replace("filter-", "") : "all";

    for (var j = 0; j < allRows.length; j++) {
      var row = allRows[j];
      var y = row.getAttribute("data-y") || "";
      var eraStr = row.getAttribute("data-era") || "";
      var text = row.textContent.toLowerCase();

      var matchesEra = true;
      if (filterEra === "reiwa") matchesEra = eraStr.indexOf("令和") !== -1;
      else if (filterEra === "heisei") matchesEra = eraStr.indexOf("平成") !== -1;
      else if (filterEra === "showa") matchesEra = eraStr.indexOf("昭和") !== -1;
      else if (filterEra === "taisho") matchesEra = eraStr.indexOf("大正") !== -1;

      var matchesQuery = true;
      if (q) matchesQuery = text.indexOf(q) !== -1 || y.indexOf(q) !== -1;

      row.hidden = !(matchesEra && matchesQuery);
    }
  }

  if (findInput) findInput.addEventListener("input", filterTable);

  var filterPills = document.querySelectorAll(".exam-pills .filter-pill");
  for (var k = 0; k < filterPills.length; k++) {
    filterPills[k].addEventListener("click", function () {
      for (var m = 0; m < filterPills.length; m++) filterPills[m].classList.remove("is-active");
      this.classList.add("is-active");
      filterTable();
    });
  }

  // Row click sets converter
  if (tableBody) {
    tableBody.addEventListener("click", function (e) {
      var tr = e.target.closest("tr");
      if (!tr || !tr.getAttribute("data-y")) return;
      var y = tr.getAttribute("data-y");
      if (eraSel) eraSel.value = "ad";
      if (yearInput) {
        yearInput.setAttribute("maxlength", "4");
        yearInput.value = y;
      }
      if (monthInput) monthInput.value = "";
      if (dayInput) dayInput.value = "";
      update();
      if (result) result.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // Copy link
  var copyBtn = $("copy");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      DC.copyLink(copyBtn, "リンクをコピーしました", function () { return share; });
    });
  }

  // Initialize from URL params or default to today's year
  var params = DC.readParams();
  if (params.era && ERAS[params.era]) {
    eraSel.value = params.era;
    yearInput.setAttribute("maxlength", "2");
    if (params.y) yearInput.value = params.y;
  } else if (params.y) {
    eraSel.value = "ad";
    yearInput.setAttribute("maxlength", "4");
    yearInput.value = params.y;
  } else {
    eraSel.value = "reiwa";
    yearInput.setAttribute("maxlength", "2");
    yearInput.value = String(DC.todayParts().y - 2018);
  }

  if (params.m) monthInput.value = params.m;
  if (params.d) dayInput.value = params.d;

  update();
})();
