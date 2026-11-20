/* experience.js — client logic for work experience calculation across employments.
   Handles single and multi-stint date math, aggregating years, months, and days
   cleanly without borrowing errors, and tracks career breaks and overlaps. */
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

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function dateToIso(d) {
    return d.y + "-" + pad(d.m) + "-" + pad(d.d);
  }

  function statRow(dt, dd) {
    return "<div><dt>" + DC.esc(dt) + "</dt><dd>" + DC.esc(dd) + "</dd></div>";
  }

  /* Single stint experience calculation.
     In HR practices, the relieving date is inclusive (the employee worked that day). */
  function calculateStint(start, end, isInclusive) {
    if (!start || !end || !G) return null;
    var startN = G.toDays(start.y, start.m, start.d);
    var endN = G.toDays(end.y, end.m, end.d);
    if (startN === null || endN === null || startN > endN) return null;

    var inc = isInclusive !== false;
    var duration, calendarDays;

    if (inc) {
      var nextDay = DC.addDays(G, end, 1);
      if (!nextDay) return null;
      duration = DC.age(G, start, nextDay);
      calendarDays = DC.diffDays(G, start, end, true);
    } else {
      duration = DC.age(G, start, end);
      calendarDays = DC.diffDays(G, start, end, false);
    }

    if (!duration) return null;

    return {
      start: start,
      end: end,
      y: duration.y,
      m: duration.m,
      d: duration.d,
      days: calendarDays
    };
  }

  /* Aggregate multiple employments cleanly without borrowing discrepancies.
     Days roll into months at 30 days per month (standard HR convention).
     Months roll into years at 12 months per year. */
  function aggregateExperience(stints) {
    if (!stints || !stints.length) return null;

    var rawY = 0;
    var rawM = 0;
    var rawD = 0;
    var totalDays = 0;
    var bizDays = 0;

    for (var i = 0; i < stints.length; i++) {
      var s = stints[i];
      rawY += s.y;
      rawM += s.m;
      rawD += s.d;
      totalDays += s.days;
      if (s.start && s.end) {
        bizDays += DC.businessDays(G, s.start, s.end, true) || 0;
      }
    }

    var extraMonths = Math.floor(rawD / 30);
    var finalDays = rawD % 30;

    var totalMonths = rawM + extraMonths;
    var extraYears = Math.floor(totalMonths / 12);
    var finalMonths = totalMonths % 12;

    var finalYears = rawY + extraYears;

    var workingHours = bizDays > 0 ? bizDays * 8 : Math.round(totalDays * (5 / 7) * 8);

    return {
      y: finalYears,
      m: finalMonths,
      d: finalDays,
      totalDays: totalDays,
      totalMonthsDecimal: (totalDays / 30.4375).toFixed(1),
      totalYearsDecimal: (totalDays / 365.25).toFixed(2),
      workingHours: workingHours,
      businessDays: bizDays
    };
  }

  /* Calculate career gaps and detect overlapping employments */
  function calculateGapsAndOverlaps(stints) {
    if (!stints || stints.length < 2) {
      return { gaps: [], overlaps: [], totalGapDays: 0, totalGapDuration: null };
    }

    // Sort valid stints chronologically by start date
    var sorted = stints.slice().sort(function (a, b) {
      var aN = G.toDays(a.start.y, a.start.m, a.start.d);
      var bN = G.toDays(b.start.y, b.start.m, b.start.d);
      return aN - bN;
    });

    var gaps = [];
    var overlaps = [];
    var totalGapDays = 0;
    var rawGapY = 0, rawGapM = 0, rawGapD = 0;

    for (var i = 0; i < sorted.length - 1; i++) {
      var curr = sorted[i];
      var next = sorted[i + 1];

      var endN = G.toDays(curr.end.y, curr.end.m, curr.end.d);
      var nextStartN = G.toDays(next.start.y, next.start.m, next.start.d);

      if (nextStartN > endN + 1) {
        // Gap exists between curr.end and next.start
        var gapDays = nextStartN - endN - 1;
        var gapStart = G.fromDays(endN + 1);
        var gapEnd = G.fromDays(nextStartN);
        var gapAge = DC.age(G, gapStart, gapEnd);

        gaps.push({
          fromIndex: i + 1,
          toIndex: i + 2,
          days: gapDays,
          duration: gapAge,
          startDate: gapStart,
          endDate: G.fromDays(nextStartN - 1)
        });

        totalGapDays += gapDays;
        if (gapAge) {
          rawGapY += gapAge.y;
          rawGapM += gapAge.m;
          rawGapD += gapAge.d;
        }
      } else if (nextStartN <= endN) {
        // Overlap detected
        var overlapDays = endN - nextStartN + 1;
        overlaps.push({
          jobA: i + 1,
          jobB: i + 2,
          days: overlapDays,
          start: next.start,
          end: curr.end
        });
      }
    }

    var totalGapDuration = null;
    if (totalGapDays > 0) {
      var exM = Math.floor(rawGapD / 30);
      var finD = rawGapD % 30;
      var totM = rawGapM + exM;
      var exY = Math.floor(totM / 12);
      var finM = totM % 12;
      var finY = rawGapY + exY;
      totalGapDuration = { y: finY, m: finM, d: finD };
    }

    return {
      gaps: gaps,
      overlaps: overlaps,
      totalGapDays: totalGapDays,
      totalGapDuration: totalGapDuration
    };
  }

  // Browser interactive controller
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    var $ = function (id) { return document.getElementById(id); };

    var jobsContainer = $("jobs-container");
    var btnAddJob = $("btn-add-job");
    var btnReset = $("btn-reset");
    var resultEl = $("result");
    var rCaption = $("r-caption");
    var rYears = $("r-years");
    var rYearsUnit = $("r-years-unit");
    var rSub = $("r-sub");
    var rCallout = $("r-callout");
    var rStats = $("r-stats");
    var copyBtn = $("copy");

    if (jobsContainer && resultEl) {
      var jobRows = [];
      var nextJobId = 1;

      function formatYmd(y, m, d) {
        var parts = [];
        if (y > 0) parts.push(y === 1 ? "1 year" : y + " years");
        if (m > 0) parts.push(m === 1 ? "1 month" : m + " months");
        if (d > 0 || parts.length === 0) parts.push(d === 1 ? "1 day" : d + " days");
        return parts.join(", ");
      }

      function updateRemoveButtons() {
        var removes = jobsContainer.querySelectorAll(".btn-remove-job");
        var show = jobRows.length > 1;
        for (var i = 0; i < removes.length; i++) {
          removes[i].style.display = show ? "inline-block" : "none";
        }
      }

      function createJobRow(presetStart, presetEnd, isCurrent) {
        var id = nextJobId++;
        var card = document.createElement("div");
        card.className = "job-card";
        card.setAttribute("data-job", String(id));
        card.id = "job-card-" + id;

        card.innerHTML =
          '<div class="job-card-header">' +
            '<h2 class="job-card-title">Employment ' + (jobRows.length + 1) + '</h2>' +
            '<button type="button" class="btn-link btn-remove-job" data-job="' + id + '" style="display:none;" aria-label="Remove Employment ' + (jobRows.length + 1) + '">Remove</button>' +
          '</div>' +
          '<fieldset class="datefield" id="start-date-' + id + '">' +
            '<legend>Joining date</legend>' +
            '<div class="dateparts">' +
              '<label class="p-d"><span>Day</span><input type="text" inputmode="numeric" maxlength="2" placeholder="DD" data-part="d" autocomplete="off" aria-label="Employment joining day"></label>' +
              '<label class="p-m"><span>Month</span><input type="text" inputmode="numeric" maxlength="2" placeholder="MM" data-part="m" autocomplete="off" aria-label="Employment joining month"></label>' +
              '<label class="p-y"><span>Year</span><input type="text" inputmode="numeric" maxlength="4" placeholder="YYYY" data-part="y" autocomplete="off" aria-label="Employment joining year"></label>' +
            '</div>' +
            '<p class="field-error" hidden></p>' +
          '</fieldset>' +
          '<div class="end-date-wrapper" id="end-wrapper-' + id + '" style="margin-block-start: 12px;">' +
            '<fieldset class="datefield" id="end-date-' + id + '">' +
              '<legend>Relieving date</legend>' +
              '<div class="dateparts">' +
                '<label class="p-d"><span>Day</span><input type="text" inputmode="numeric" maxlength="2" placeholder="DD" data-part="d" autocomplete="off" aria-label="Employment relieving day"></label>' +
                '<label class="p-m"><span>Month</span><input type="text" inputmode="numeric" maxlength="2" placeholder="MM" data-part="m" autocomplete="off" aria-label="Employment relieving month"></label>' +
                '<label class="p-y"><span>Year</span><input type="text" inputmode="numeric" maxlength="4" placeholder="YYYY" data-part="y" autocomplete="off" aria-label="Employment relieving year"></label>' +
              '</div>' +
              '<p class="field-error" hidden></p>' +
            '</fieldset>' +
            '<label class="check current-job-label">' +
              '<input type="checkbox" class="check-current" data-job="' + id + '">' +
              '<span>Currently working here (calculate up to today)</span>' +
            '</label>' +
          '</div>' +
          '<p class="job-summary" id="job-summary-' + id + '" hidden></p>';

        jobsContainer.appendChild(card);

        var startField = new DC.DateField(card.querySelector("#start-date-" + id));
        var endField = new DC.DateField(card.querySelector("#end-date-" + id));
        var currentCheckbox = card.querySelector(".check-current");
        var removeBtn = card.querySelector(".btn-remove-job");
        var summaryEl = card.querySelector("#job-summary-" + id);

        var rowObj = {
          id: id,
          card: card,
          startField: startField,
          endField: endField,
          currentCheckbox: currentCheckbox,
          summaryEl: summaryEl
        };

        jobRows.push(rowObj);

        if (presetStart) startField.set(presetStart);
        if (presetEnd) endField.set(presetEnd);
        if (isCurrent) {
          currentCheckbox.checked = true;
          endField.set(DC.todayParts());
          var endInputs = endField.order;
          for (var k = 0; k < endInputs.length; k++) endInputs[k].disabled = true;
        }

        startField.on(function () { calculateAll(); });
        endField.on(function () { calculateAll(); });

        currentCheckbox.addEventListener("change", function () {
          var isCur = currentCheckbox.checked;
          var endInputs = endField.order;
          for (var j = 0; j < endInputs.length; j++) {
            endInputs[j].disabled = isCur;
          }
          if (isCur) {
            endField.set(DC.todayParts());
            endField.error("");
          }
          calculateAll();
        });

        removeBtn.addEventListener("click", function () {
          removeJobRow(id);
        });

        DC.autoReveal(startField, resultEl, "Change joining date");
        DC.autoReveal(endField, resultEl, "Change relieving date");

        updateTitles();
        updateRemoveButtons();
        return rowObj;
      }

      function updateTitles() {
        for (var i = 0; i < jobRows.length; i++) {
          var titleEl = jobRows[i].card.querySelector(".job-card-title");
          if (titleEl) titleEl.textContent = "Employment " + (i + 1);
        }
      }

      function removeJobRow(id) {
        if (jobRows.length <= 1) return;
        var idx = -1;
        for (var i = 0; i < jobRows.length; i++) {
          if (jobRows[i].id === id) { idx = i; break; }
        }
        if (idx !== -1) {
          jobsContainer.removeChild(jobRows[idx].card);
          jobRows.splice(idx, 1);
          updateTitles();
          updateRemoveButtons();
          calculateAll();
        }
      }

      function calculateAll() {
        var validStints = [];
        var allFieldsFilled = true;
        var hasAnyError = false;

        for (var i = 0; i < jobRows.length; i++) {
          var row = jobRows[i];
          var start = row.startField.get();
          var isCurrent = row.currentCheckbox.checked;
          var end = isCurrent ? DC.todayParts() : row.endField.get();

          row.startField.error("");
          row.endField.error("");

          if (!start || !end) {
            allFieldsFilled = false;
            row.summaryEl.hidden = true;
            continue;
          }

          var startN = G.toDays(start.y, start.m, start.d);
          var endN = G.toDays(end.y, end.m, end.d);

          if (startN === null) {
            row.startField.error("Please enter a valid calendar date.");
            hasAnyError = true;
            continue;
          }
          if (endN === null) {
            row.endField.error("Please enter a valid calendar date.");
            hasAnyError = true;
            continue;
          }

          if (startN > endN) {
            row.endField.error("Relieving date must be on or after joining date.");
            hasAnyError = true;
            continue;
          }

          var stintRes = calculateStint(start, end, true);
          if (stintRes) {
            stintRes.isCurrent = isCurrent;
            stintRes.index = i + 1;
            validStints.push(stintRes);

            row.summaryEl.hidden = false;
            row.summaryEl.textContent = "Duration: " + formatYmd(stintRes.y, stintRes.m, stintRes.d) + " (" + nf.format(stintRes.days) + " calendar days)";
          }
        }

        if (hasAnyError || validStints.length === 0) {
          resultEl.setAttribute("data-state", "empty");
          return;
        }

        var totalRes = aggregateExperience(validStints);
        var gapsRes = calculateGapsAndOverlaps(validStints);

        if (!totalRes) {
          resultEl.setAttribute("data-state", "empty");
          return;
        }

        resultEl.setAttribute("data-state", "ready");

        // Primary display
        if (totalRes.y > 0) {
          rYears.textContent = String(totalRes.y);
          rYearsUnit.textContent = totalRes.y === 1 ? "year" : "years";
          rSub.textContent = (totalRes.m > 0 ? (totalRes.m === 1 ? "1 month" : totalRes.m + " months") : "0 months") +
            ", " + (totalRes.d > 0 ? (totalRes.d === 1 ? "1 day" : totalRes.d + " days") : "0 days");
        } else if (totalRes.m > 0) {
          rYears.textContent = String(totalRes.m);
          rYearsUnit.textContent = totalRes.m === 1 ? "month" : "months";
          rSub.textContent = totalRes.d > 0 ? (totalRes.d === 1 ? "1 day" : totalRes.d + " days") : "0 days";
        } else {
          rYears.textContent = String(totalRes.d);
          rYearsUnit.textContent = totalRes.d === 1 ? "day" : "days";
          rSub.textContent = "Completed active service";
        }

        rCaption.textContent = validStints.length > 1 ?
          "Total cumulative experience across " + validStints.length + " employments" :
          "Total work experience";

        // Callout notices (career gaps or overlaps)
        rCallout.hidden = true;
        rCallout.innerHTML = "";
        if (gapsRes.overlaps.length > 0) {
          rCallout.className = "callout bad";
          rCallout.innerHTML = "<p><strong>Concurrent employment note:</strong> Overlapping service detected across jobs. Official verification counts duplicate calendar days once.</p>";
          rCallout.hidden = false;
        } else if (gapsRes.gaps.length > 0) {
          rCallout.className = "callout ok";
          rCallout.innerHTML = "<p><strong>Career breaks tracked:</strong> Total gap of " + nf.format(gapsRes.totalGapDays) +
            " days (" + formatYmd(gapsRes.totalGapDuration.y, gapsRes.totalGapDuration.m, gapsRes.totalGapDuration.d) + ") between employments.</p>";
          rCallout.hidden = false;
        }

        // Stats breakdown
        var statsHtml = "";
        statsHtml += statRow("Total calendar days", nf.format(totalRes.totalDays) + " days");
        statsHtml += statRow("Decimal experience", totalRes.totalYearsDecimal + " years");
        statsHtml += statRow("Total service in months", totalRes.totalMonthsDecimal + " months");
        statsHtml += statRow("Working days (approximate)", nf.format(totalRes.businessDays) + " days");
        statsHtml += statRow("Estimated working hours", nf.format(totalRes.workingHours) + " hours");

        if (validStints.length > 1) {
          statsHtml += statRow("Total employments entered", String(validStints.length));
          if (gapsRes.totalGapDays > 0 && gapsRes.totalGapDuration) {
            statsHtml += statRow("Total career gaps", formatYmd(gapsRes.totalGapDuration.y, gapsRes.totalGapDuration.m, gapsRes.totalGapDuration.d) + " (" + nf.format(gapsRes.totalGapDays) + " days)");
          }
          for (var sIdx = 0; sIdx < validStints.length; sIdx++) {
            var vs = validStints[sIdx];
            statsHtml += statRow("Employment " + vs.index, formatYmd(vs.y, vs.m, vs.d) + " (" + nf.format(vs.days) + " days)");
          }
        }

        rStats.innerHTML = statsHtml;
      }

      function buildShareParams() {
        var parts = [];
        for (var i = 0; i < jobRows.length; i++) {
          var row = jobRows[i];
          var s = row.startField.get();
          var isCur = row.currentCheckbox.checked;
          var e = isCur ? "now" : (row.endField.get() ? dateToIso(row.endField.get()) : "");
          if (s) {
            parts.push(dateToIso(s) + ":" + (isCur ? "now" : e));
          }
        }
        return { j: parts.join(";") };
      }

      if (copyBtn) {
        copyBtn.addEventListener("click", function () {
          DC.copyLink(copyBtn, "Link copied to clipboard", buildShareParams);
        });
      }

      if (btnAddJob) {
        btnAddJob.addEventListener("click", function () {
          createJobRow(null, null, false);
          updateRemoveButtons();
        });
      }

      if (btnReset) {
        btnReset.addEventListener("click", function () {
          while (jobRows.length > 1) {
            removeJobRow(jobRows[jobRows.length - 1].id);
          }
          if (jobRows.length === 1) {
            jobRows[0].startField.set(null);
            jobRows[0].endField.set(null);
            jobRows[0].currentCheckbox.checked = false;
            var endInputs = jobRows[0].endField.order;
            for (var k = 0; k < endInputs.length; k++) endInputs[k].disabled = false;
            jobRows[0].summaryEl.hidden = true;
          }
          resultEl.setAttribute("data-state", "empty");
          DC.writeParams({});
        });
      }

      // Initialize from URL params or default single empty row
      var params = DC.readParams();
      var initialized = false;

      if (params.j) {
        var rawStints = params.j.split(";");
        for (var p = 0; p < rawStints.length; p++) {
          var pair = rawStints[p].split(":");
          if (pair.length === 2) {
            var sDate = DC.parseIso(pair[0]);
            var isNow = pair[1] === "now";
            var eDate = isNow ? null : DC.parseIso(pair[1]);
            if (sDate) {
              createJobRow(sDate, eDate, isNow);
              initialized = true;
            }
          }
        }
      }

      if (!initialized) {
        createJobRow(null, null, false);
      } else {
        calculateAll();
      }
    }
  }

  // Export functions for unit testing and global scope
  global.calculateStint = calculateStint;
  global.aggregateExperience = aggregateExperience;
  global.calculateGapsAndOverlaps = calculateGapsAndOverlaps;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      calculateStint: calculateStint,
      aggregateExperience: aggregateExperience,
      calculateGapsAndOverlaps: calculateGapsAndOverlaps
    };
  }
})(typeof window !== "undefined" ? window : globalThis);
