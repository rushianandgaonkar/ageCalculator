/* birth-year.js — client logic for birth year reverse lookup and days alive calculator.
   Supports:
   1. "What year was I born?" (reverse age calculation, generation, zodiac, milestone years)
   2. "How many days have I been alive?" (exact days, hours, minutes, day of week, milestones) */
(function (global) {
  "use strict";

  var G = typeof DC !== "undefined" ? DC.Gregorian : null;
  if (!G && typeof require !== "undefined") {
    // Node environment fallback
    try {
      var dcMod = require("./datecore.js");
      G = dcMod.Gregorian;
      global.DC = dcMod;
    } catch (e) { /* test runner loader handles it */ }
  }

  var nf = new Intl.NumberFormat("en-US");

  function statRow(dt, dd) {
    return "<div><dt>" + DC.esc(dt) + "</dt><dd>" + DC.esc(dd) + "</dd></div>";
  }

  /* Mode 1: Reverse Birth Year Calculator */
  function calculateBirthYear(age, birthdayPassed, currentYear) {
    if (age === null || age === undefined || isNaN(age) || age < 0) return null;
    var cy = currentYear || (new Date()).getFullYear();

    if (birthdayPassed === true) {
      var y = cy - age;
      return { exact: true, year: y, minYear: y, maxYear: y };
    } else if (birthdayPassed === false) {
      var y2 = cy - age - 1;
      return { exact: true, year: y2, minYear: y2, maxYear: y2 };
    } else {
      var min = cy - age - 1;
      var max = cy - age;
      return { exact: false, minYear: min, maxYear: max, text: min + " or " + max };
    }
  }

  /* Generation classification based on standard demographic definitions */
  function getGeneration(year) {
    if (!year || isNaN(year)) return "Unknown";
    if (year >= 2025) return "Generation Beta (2025 onwards)";
    if (year >= 2013) return "Generation Alpha (2013 to 2024)";
    if (year >= 1997) return "Generation Z (1997 to 2012)";
    if (year >= 1981) return "Millennial (1981 to 1996)";
    if (year >= 1965) return "Generation X (1965 to 1980)";
    if (year >= 1946) return "Baby Boomer (1946 to 1964)";
    if (year >= 1928) return "Silent Generation (1928 to 1945)";
    return "Greatest Generation (before 1928)";
  }

  /* Chinese Zodiac animal based on Gregorian year */
  var CHINESE_ZODIAC = [
    "Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake",
    "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"
  ];

  function getChineseZodiac(year) {
    if (!year || isNaN(year)) return "";
    var idx = (year - 4) % 12;
    if (idx < 0) idx += 12;
    return CHINESE_ZODIAC[idx];
  }

  /* Day of the week names */
  var WEEKDAYS = [
    "Sunday", "Monday", "Tuesday", "Wednesday",
    "Thursday", "Friday", "Saturday"
  ];

  /* Notable days alive milestones */
  var MILESTONE_TARGETS = [
    500, 1000, 2000, 3000, 5000, 7500, 10000,
    12500, 15000, 20000, 25000, 30000, 35000, 40000
  ];

  /* Mode 2: Days Alive Calculation */
  function calculateDaysAlive(dob, onDate) {
    if (!dob || !G) return null;
    var dobN = G.toDays(dob.y, dob.m, dob.d);
    if (dobN === null) return null;

    var on = onDate || DC.todayParts();
    var onN = G.toDays(on.y, on.m, on.d);
    if (onN === null || onN < dobN) return null;

    var daysLived = onN - dobN;
    var hoursLived = daysLived * 24;
    var minutesLived = hoursLived * 60;
    var secondsLived = minutesLived * 60;

    var exactAge = DC.age(G, dob, on);
    var weekdayIdx = DC.weekday(dobN);
    var bornWeekday = WEEKDAYS[weekdayIdx];

    var weeksLived = Math.floor(daysLived / 7);
    var remainingDays = daysLived % 7;

    var heartbeatsEst = daysLived * 103680; // ~72 beats per minute average
    var breathsEst = daysLived * 20000;      // ~14 breaths per minute average

    var milestones = [];
    var nextMilestone = null;

    for (var i = 0; i < MILESTONE_TARGETS.length; i++) {
      var target = MILESTONE_TARGETS[i];
      var mDayNum = dobN + target;
      var mDate = G.fromDays(mDayNum);
      var isPassed = target <= daysLived;
      var daysRemaining = target - daysLived;

      var mObj = {
        days: target,
        date: mDate,
        dayNum: mDayNum,
        passed: isPassed,
        daysRemaining: daysRemaining
      };

      milestones.push(mObj);

      if (!isPassed && !nextMilestone) {
        nextMilestone = mObj;
      }
    }

    return {
      dob: dob,
      onDate: on,
      daysLived: daysLived,
      hoursLived: hoursLived,
      minutesLived: minutesLived,
      secondsLived: secondsLived,
      weeksLived: weeksLived,
      remainingDays: remainingDays,
      exactAge: exactAge,
      bornWeekday: bornWeekday,
      heartbeatsEst: heartbeatsEst,
      breathsEst: breathsEst,
      milestones: milestones,
      nextMilestone: nextMilestone
    };
  }

  // Interactive UI controller for browser
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    var $ = function (id) { return document.getElementById(id); };

    var modeYearRadio = $("mode-year");
    var modeDaysRadio = $("mode-days");
    var panelYear = $("panel-year");
    var panelDays = $("panel-days");

    var inputAge = $("input-age");
    var errorAge = $("error-age");
    var bdayStatusRadios = document.getElementsByName("bday-status");
    var selectBirthMonth = $("select-birth-month");
    var presetChips = document.querySelectorAll("[data-age]");

    var dobFieldEl = $("dob-field");
    var dobField = dobFieldEl ? new DC.DateField(dobFieldEl) : null;

    var resultEl = $("result");
    var rCaption = $("r-caption");
    var rMain = $("r-main");
    var rMainUnit = $("r-main-unit");
    var rSub = $("r-sub");
    var rCallout = $("r-callout");
    var rStats = $("r-stats");
    var rMilestonesBlock = $("r-milestones-block");
    var milestonesTbody = $("milestones-tbody");
    var copyBtn = $("copy");

    function formatDate(d) {
      if (!d) return "";
      var months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      return d.d + " " + months[d.m - 1] + " " + d.y;
    }

    function getSelectedBdayStatus() {
      for (var i = 0; i < bdayStatusRadios.length; i++) {
        if (bdayStatusRadios[i].checked) return bdayStatusRadios[i].value;
      }
      return "unknown";
    }

    function setSelectedBdayStatus(val) {
      for (var i = 0; i < bdayStatusRadios.length; i++) {
        bdayStatusRadios[i].checked = (bdayStatusRadios[i].value === val);
      }
    }

    function renderMode1() {
      if (!inputAge) return;
      var raw = inputAge.value.trim();
      errorAge.hidden = true;
      errorAge.textContent = "";

      if (!raw) {
        resultEl.setAttribute("data-state", "empty");
        return;
      }

      var age = parseInt(raw, 10);
      if (isNaN(age) || age < 0 || age > 130) {
        errorAge.textContent = "Please enter a realistic age between 0 and 130.";
        errorAge.hidden = false;
        resultEl.setAttribute("data-state", "empty");
        return;
      }

      var status = getSelectedBdayStatus();
      var monthVal = selectBirthMonth ? selectBirthMonth.value : "";
      var today = DC.todayParts();

      var birthdayPassed = null;
      if (monthVal) {
        var mNum = parseInt(monthVal, 10);
        if (mNum < today.m) {
          birthdayPassed = true;
        } else if (mNum > today.m) {
          birthdayPassed = false;
        } else {
          // Current month: check radio button status if set
          if (status === "passed") birthdayPassed = true;
          else if (status === "upcoming") birthdayPassed = false;
        }
      } else {
        if (status === "passed") birthdayPassed = true;
        else if (status === "upcoming") birthdayPassed = false;
      }

      var res = calculateBirthYear(age, birthdayPassed, today.y);
      if (!res) {
        resultEl.setAttribute("data-state", "empty");
        return;
      }

      resultEl.setAttribute("data-state", "ready");
      rCaption.textContent = "Estimated birth year";

      if (res.exact) {
        rMain.textContent = String(res.year);
        rMainUnit.textContent = "";
        rSub.textContent = "Born in " + res.year + " (" + getGeneration(res.year) + ")";
      } else {
        rMain.textContent = res.text;
        rMainUnit.textContent = "";
        rSub.textContent = "Born in " + res.maxYear + " if birthday passed in " + today.y + ", or " + res.minYear + " if upcoming.";
      }

      rCallout.hidden = true;
      rMilestonesBlock.hidden = true;

      // Stats
      var statsHtml = "";
      if (res.exact) {
        statsHtml += statRow("Generation", getGeneration(res.year));
        statsHtml += statRow("Chinese zodiac animal", getChineseZodiac(res.year));
        statsHtml += statRow("Age in completed months", nf.format(age * 12) + " months");
        statsHtml += statRow("Approximate days lived", nf.format(Math.round(age * 365.25)) + " days");
        if (age >= 18) statsHtml += statRow("Year turned 18", String(res.year + 18));
        if (age >= 21) statsHtml += statRow("Year turned 21", String(res.year + 21));
        statsHtml += statRow("Year turning 50", String(res.year + 50));
        statsHtml += statRow("Year turning 65", String(res.year + 65));
        statsHtml += statRow("Year turning 100", String(res.year + 100));
      } else {
        statsHtml += statRow("Potential generations", getGeneration(res.minYear) === getGeneration(res.maxYear) ? getGeneration(res.maxYear) : getGeneration(res.minYear) + " or " + getGeneration(res.maxYear));
        statsHtml += statRow("Chinese zodiac animal", getChineseZodiac(res.minYear) + " (" + res.minYear + ") or " + getChineseZodiac(res.maxYear) + " (" + res.maxYear + ")");
        statsHtml += statRow("Age in completed months", nf.format(age * 12) + " months");
        statsHtml += statRow("Approximate days lived", nf.format(Math.round(age * 365.25)) + " days");
        if (age >= 18) statsHtml += statRow("Year turned 18", (res.minYear + 18) + " or " + (res.maxYear + 18));
        if (age >= 21) statsHtml += statRow("Year turned 21", (res.minYear + 21) + " or " + (res.maxYear + 21));
        statsHtml += statRow("Year turning 50", (res.minYear + 50) + " or " + (res.maxYear + 50));
      }

      rStats.innerHTML = statsHtml;
    }

    function renderMode2() {
      if (!dobField) return;
      var dob = dobField.get();
      dobField.error("");

      if (!dob) {
        resultEl.setAttribute("data-state", "empty");
        return;
      }

      var today = DC.todayParts();
      var dobN = G.toDays(dob.y, dob.m, dob.d);
      var todayN = G.toDays(today.y, today.m, today.d);

      if (dobN === null) {
        dobField.error("Please enter a valid calendar date of birth.");
        resultEl.setAttribute("data-state", "empty");
        return;
      }

      if (dobN > todayN) {
        dobField.error("Date of birth cannot be in the future.");
        resultEl.setAttribute("data-state", "empty");
        return;
      }

      var res = calculateDaysAlive(dob, today);
      if (!res) {
        resultEl.setAttribute("data-state", "empty");
        return;
      }

      resultEl.setAttribute("data-state", "ready");
      rCaption.textContent = "Exact days alive";
      rMain.textContent = nf.format(res.daysLived);
      rMainUnit.textContent = "days alive";

      var ageStr = "";
      if (res.exactAge) {
        var aParts = [];
        if (res.exactAge.y > 0) aParts.push(res.exactAge.y === 1 ? "1 year" : res.exactAge.y + " years");
        if (res.exactAge.m > 0) aParts.push(res.exactAge.m === 1 ? "1 month" : res.exactAge.m + " months");
        if (res.exactAge.d > 0 || aParts.length === 0) aParts.push(res.exactAge.d === 1 ? "1 day" : res.exactAge.d + " days");
        ageStr = aParts.join(", ");
      }
      rSub.textContent = ageStr ? "Equivalent to " + ageStr : "Born today";

      // Callout for next milestone
      if (res.nextMilestone) {
        rCallout.className = "callout ok";
        rCallout.innerHTML = "<p><strong>Next life milestone:</strong> " +
          nf.format(res.nextMilestone.days) + " days alive on <strong>" +
          formatDate(res.nextMilestone.date) + "</strong> (in " +
          nf.format(res.nextMilestone.daysRemaining) + " days).</p>";
        rCallout.hidden = false;
      } else {
        rCallout.hidden = true;
      }

      // Stats breakdown
      var statsHtml = "";
      statsHtml += statRow("Exact hours lived", nf.format(res.hoursLived) + " hours");
      statsHtml += statRow("Exact minutes lived", nf.format(res.minutesLived) + " minutes");
      statsHtml += statRow("Day of the week born", res.bornWeekday);
      statsHtml += statRow("Completed weeks", nf.format(res.weeksLived) + " weeks, " + res.remainingDays + " days");
      statsHtml += statRow("Estimated heartbeats", "~" + nf.format(res.heartbeatsEst) + " beats");
      statsHtml += statRow("Estimated breaths taken", "~" + nf.format(res.breathsEst) + " breaths");
      statsHtml += statRow("Generation", getGeneration(dob.y));
      statsHtml += statRow("Chinese zodiac animal", getChineseZodiac(dob.y));

      rStats.innerHTML = statsHtml;

      // Render milestones table
      rMilestonesBlock.hidden = false;
      var rowsHtml = "";
      for (var m = 0; m < res.milestones.length; m++) {
        var ms = res.milestones[m];
        var tagClass = ms.passed ? "tag passed" : "tag upcoming";
        var statusLabel = ms.passed ? "Passed" : "In " + nf.format(ms.daysRemaining) + " days";

        rowsHtml += "<tr>" +
          "<td><strong>" + nf.format(ms.days) + " days</strong></td>" +
          "<td>" + formatDate(ms.date) + "</td>" +
          "<td><span class=\"" + tagClass + "\">" + statusLabel + "</span></td>" +
          "</tr>";
      }
      milestonesTbody.innerHTML = rowsHtml;
    }

    function updateView() {
      var isYearMode = modeYearRadio ? modeYearRadio.checked : true;
      if (panelYear) panelYear.hidden = !isYearMode;
      if (panelDays) panelDays.hidden = isYearMode;

      if (isYearMode) {
        renderMode1();
      } else {
        renderMode2();
      }
    }

    if (modeYearRadio && modeDaysRadio) {
      modeYearRadio.addEventListener("change", updateView);
      modeDaysRadio.addEventListener("change", updateView);
    }

    if (inputAge) {
      inputAge.addEventListener("input", function () {
        inputAge.value = inputAge.value.replace(/[^0-9]/g, "");
        renderMode1();
      });
    }

    for (var b = 0; b < bdayStatusRadios.length; b++) {
      bdayStatusRadios[b].addEventListener("change", renderMode1);
    }

    if (selectBirthMonth) {
      selectBirthMonth.addEventListener("change", renderMode1);
    }

    for (var c = 0; c < presetChips.length; c++) {
      presetChips[c].addEventListener("click", function () {
        var a = this.getAttribute("data-age");
        if (inputAge && a) {
          inputAge.value = a;
          renderMode1();
        }
      });
    }

    if (dobField) {
      dobField.on(function () {
        renderMode2();
      });
      DC.autoReveal(dobField, resultEl, "Change birth date");
    }

    function buildShareParams() {
      var isYearMode = modeYearRadio ? modeYearRadio.checked : true;
      if (isYearMode) {
        var a = inputAge ? inputAge.value.trim() : "";
        var s = getSelectedBdayStatus();
        var m = selectBirthMonth ? selectBirthMonth.value : "";
        var params = { mode: "year" };
        if (a) params.age = a;
        if (s !== "unknown") params.status = s;
        if (m) params.month = m;
        return params;
      } else {
        var dob = dobField ? dobField.get() : null;
        var pDays = { mode: "days" };
        if (dob) pDays.dob = dob.y + "-" + (dob.m < 10 ? "0" : "") + dob.m + "-" + (dob.d < 10 ? "0" : "") + dob.d;
        return pDays;
      }
    }

    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        DC.copyLink(copyBtn, "Link copied to clipboard", buildShareParams);
      });
    }

    // Initialize from URL params
    var params = DC.readParams();
    if (params.mode === "days" || params.dob) {
      if (modeDaysRadio) modeDaysRadio.checked = true;
      if (params.dob && dobField) {
        var parsed = DC.parseIso(params.dob);
        if (parsed) dobField.set(parsed);
      }
    } else {
      if (modeYearRadio) modeYearRadio.checked = true;
      if (params.age && inputAge) inputAge.value = params.age;
      if (params.status) setSelectedBdayStatus(params.status);
      if (params.month && selectBirthMonth) selectBirthMonth.value = params.month;
    }

    updateView();
  }

  // Export for testing and global scope
  global.calculateBirthYear = calculateBirthYear;
  global.getGeneration = getGeneration;
  global.getChineseZodiac = getChineseZodiac;
  global.calculateDaysAlive = calculateDaysAlive;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      calculateBirthYear: calculateBirthYear,
      getGeneration: getGeneration,
      getChineseZodiac: getChineseZodiac,
      calculateDaysAlive: calculateDaysAlive
    };
  }
})(typeof window !== "undefined" ? window : globalThis);
