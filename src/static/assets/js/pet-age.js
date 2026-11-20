/* pet-age.js — client logic for cat and dog age calculators.
   Supports DateField (date of birth) and manual years/months entry.
   Veterinary life stage interpolation based on AAHA and AVMA standards. */
(function () {
  "use strict";

  var G = DC.Gregorian;
  var $ = function (id) { return document.getElementById(id); };

  var isDog = !!$("dog-size");
  var dobWrap = $("dob-wrap");
  var manualWrap = $("manual-wrap");
  var modeDobRadio = $("mode-dob");
  var modeManualRadio = $("mode-manual");
  var dogSizeSelect = $("dog-size");
  var manualYearsInput = $("manual-years");
  var manualMonthsInput = $("manual-months");
  var result = $("result");
  var rHumanAge = $("r-human-age");
  var rHumanUnit = $("r-human-unit");
  var rSub = $("r-sub");
  var rStats = $("r-stats");
  var copyBtn = $("copy");

  var dobField = $("dob") ? new DC.DateField($("dob")) : null;
  var share = null;

  /* Helper to format numbers with commas if needed */
  var nf = new Intl.NumberFormat("en-US");

  function statRow(dt, dd) {
    return "<div><dt>" + DC.esc(dt) + "</dt><dd>" + DC.esc(dd) + "</dd></div>";
  }

  /* Cat Age Formula (AAHA / AAFP standard):
     Month-by-month accurate interpolation:
     - 0 to 12 months: 0 to 15 human years (1.25 human years per month)
     - 12 to 24 months: 15 to 24 human years (0.75 human years per month)
     - 24+ months: 24 + 4 human years for every 12 months (1/3 human year per month) */
  function calculateCatAge(totalMonths) {
    var humanYears = 0;
    if (totalMonths <= 12) {
      humanYears = totalMonths * (15 / 12);
    } else if (totalMonths <= 24) {
      humanYears = 15 + (totalMonths - 12) * (9 / 12);
    } else {
      humanYears = 24 + (totalMonths - 24) * (4 / 12);
    }

    var stage, dietary, physical, lifespan;

    if (totalMonths < 12) {
      stage = "Kitten (under 1 year)";
      dietary = "High-protein kitten formula rich in DHA, calcium, and essential amino acids for growth.";
      physical = "Rapid skeletal growth, baby teeth replaced by permanent adult teeth, sexual maturity.";
      lifespan = "Indoor cats live an average of 12 to 15 years (equivalent to 64 to 76 human years).";
    } else if (totalMonths < 36) {
      stage = "Junior (1 to 2 years)";
      dietary = "Transition to complete adult maintenance diet; measure portions to prevent early weight gain.";
      physical = "Cat reaches full skeletal length and adult muscular frame; playful and socially active.";
      lifespan = "Indoor cats live an average of 12 to 15 years (equivalent to 64 to 76 human years).";
    } else if (totalMonths < 84) {
      stage = "Prime (3 to 6 years)";
      dietary = "Balanced adult maintenance nutrition with moisture-rich wet food for urinary health.";
      physical = "Peak physical agility, muscle tone, coat luster, and stable metabolic rate.";
      lifespan = "Indoor cats live an average of 12 to 15 years (equivalent to 64 to 76 human years).";
    } else if (totalMonths < 132) {
      stage = "Mature (7 to 10 years)";
      dietary = "Calorie-controlled formula supplemented with glucosamine, chondroitin, and moderate phosphorus.";
      physical = "Metabolism begins gradual decline; increased vulnerability to dental tartar and joint stiffness.";
      lifespan = "Indoor cats live an average of 12 to 15 years (equivalent to 64 to 76 human years).";
    } else if (totalMonths < 180) {
      stage = "Senior (11 to 14 years)";
      dietary = "Highly digestible protein with omega-3 fatty acids for cognitive and joint support; renal-friendly nutrients.";
      physical = "Reduced activity levels, changes in sleep cycles, sensory adjustments in vision and hearing.";
      lifespan = "Indoor cats live an average of 12 to 15 years (equivalent to 64 to 76 human years).";
    } else {
      stage = "Geriatric (15 years and older)";
      dietary = "Appetizing, calorie-dense senior nutrition with kidney and cardiovascular support.";
      physical = "Reduced organ reserve, muscle mass loss (sarcopenia), joint stiffness; requires warm resting spots.";
      lifespan = "Indoor cats live an average of 12 to 15 years (equivalent to 64 to 76 human years). Super-seniors frequently reach 18 to 20 years.";
    }

    return {
      humanYears: humanYears,
      stage: stage,
      dietary: dietary,
      physical: physical,
      lifespan: lifespan
    };
  }

  /* Dog Age Formula (AVMA / AAHA size-stratified standard):
     Small (<20 lbs): 1 yr = 15, 2 yr = 24, +4/yr thereafter
     Medium (21-50 lbs): 1 yr = 15, 2 yr = 24, +5/yr thereafter
     Large (51-90 lbs): 1 yr = 15, 2 yr = 24, +6/yr thereafter
     Giant (>90 lbs): 1 yr = 12, 2 yr = 22, +8/yr thereafter */
  function calculateDogAge(totalMonths, size) {
    var humanYears = 0;
    var seniorCutoff = "";
    var weightTier = "";

    if (size === "small") {
      weightTier = "Small (under 20 lbs / 9 kg)";
      seniorCutoff = "Age 11 years (approx. 60 human years)";
      if (totalMonths <= 12) {
        humanYears = totalMonths * (15 / 12);
      } else if (totalMonths <= 24) {
        humanYears = 15 + (totalMonths - 12) * (9 / 12);
      } else {
        humanYears = 24 + (totalMonths - 24) * (4 / 12);
      }
    } else if (size === "medium") {
      weightTier = "Medium (21 to 50 lbs / 9.5 to 23 kg)";
      seniorCutoff = "Age 9 years (approx. 59 human years)";
      if (totalMonths <= 12) {
        humanYears = totalMonths * (15 / 12);
      } else if (totalMonths <= 24) {
        humanYears = 15 + (totalMonths - 12) * (9 / 12);
      } else {
        humanYears = 24 + (totalMonths - 24) * (5 / 12);
      }
    } else if (size === "large") {
      weightTier = "Large (51 to 90 lbs / 23.5 to 41 kg)";
      seniorCutoff = "Age 7 years (approx. 54 human years)";
      if (totalMonths <= 12) {
        humanYears = totalMonths * (15 / 12);
      } else if (totalMonths <= 24) {
        humanYears = 15 + (totalMonths - 12) * (9 / 12);
      } else {
        humanYears = 24 + (totalMonths - 24) * (6 / 12);
      }
    } else {
      /* giant */
      weightTier = "Giant (over 90 lbs / 41 kg)";
      seniorCutoff = "Age 5 to 6 years (approx. 46 to 54 human years)";
      if (totalMonths <= 12) {
        humanYears = totalMonths * (12 / 12);
      } else if (totalMonths <= 24) {
        humanYears = 12 + (totalMonths - 12) * (10 / 12);
      } else {
        humanYears = 22 + (totalMonths - 24) * (8 / 12);
      }
    }

    var stage = "";
    var checkup = "";

    if (size === "small") {
      if (totalMonths < 12) {
        stage = "Puppy (under 1 year)";
        checkup = "Vaccination series every 3 to 4 weeks until 16 weeks, deworming, heartworm prevention, and microchipping.";
      } else if (totalMonths < 48) {
        stage = "Young Adult (1 to 3 years)";
        checkup = "Annual wellness examination, core vaccination boosters, heartworm screening, and dental assessment.";
      } else if (totalMonths < 132) {
        stage = "Mature Adult (4 to 10 years)";
        checkup = "Annual comprehensive examination, baseline blood chemistry panel, urinalysis, and dental cleaning.";
      } else {
        stage = "Senior (11 years and older)";
        checkup = "Every 6 months: geriatric blood chemistry, urinalysis, blood pressure check, and joint mobility screening.";
      }
    } else if (size === "medium") {
      if (totalMonths < 12) {
        stage = "Puppy (under 1 year)";
        checkup = "Vaccination series every 3 to 4 weeks until 16 weeks, deworming, heartworm prevention, and microchipping.";
      } else if (totalMonths < 48) {
        stage = "Young Adult (1 to 3 years)";
        checkup = "Annual wellness examination, core vaccination boosters, heartworm screening, and dental assessment.";
      } else if (totalMonths < 108) {
        stage = "Mature Adult (4 to 8 years)";
        checkup = "Annual comprehensive examination, baseline blood chemistry panel, urinalysis, and dental cleaning.";
      } else {
        stage = "Senior (9 years and older)";
        checkup = "Every 6 months: geriatric blood chemistry, urinalysis, blood pressure check, and joint mobility screening.";
      }
    } else if (size === "large") {
      if (totalMonths < 15) {
        stage = "Puppy (under 15 months)";
        checkup = "Vaccination series every 3 to 4 weeks until 16 weeks, joint-conscious exercise guidance, and parasite prevention.";
      } else if (totalMonths < 36) {
        stage = "Young Adult (15 months to 3 years)";
        checkup = "Annual wellness examination, core vaccination boosters, heartworm screening, and joint assessment.";
      } else if (totalMonths < 84) {
        stage = "Mature Adult (3 to 6 years)";
        checkup = "Annual comprehensive examination, baseline blood chemistry panel, urinalysis, and arthritis monitoring.";
      } else {
        stage = "Senior (7 years and older)";
        checkup = "Every 6 months: geriatric blood panel, urinalysis, cardiac screening, and arthritis management.";
      }
    } else {
      /* giant */
      if (totalMonths < 18) {
        stage = "Puppy (under 18 months)";
        checkup = "Careful growth monitoring, controlled-calcium large-breed nutrition, core vaccines, and orthopedic evaluation.";
      } else if (totalMonths < 36) {
        stage = "Young Adult (18 months to 3 years)";
        checkup = "Annual wellness examination, cardiac screening, bloat prevention counseling, and joint assessment.";
      } else if (totalMonths < 60) {
        stage = "Mature Adult (3 to 4 years)";
        checkup = "Annual comprehensive physical exam, full blood chemistry panel, urinalysis, and mobility monitoring.";
      } else {
        stage = "Senior (5 years and older)";
        checkup = "Every 6 months: senior blood panel, cardiac evaluation, comprehensive arthritis assessment, and kidney screening.";
      }
    }

    return {
      humanYears: humanYears,
      weightTier: weightTier,
      stage: stage,
      seniorCutoff: seniorCutoff,
      checkup: checkup
    };
  }

  function formatPetChronologicalAge(years, months) {
    var parts = [];
    if (years === 1) parts.push("1 year");
    else if (years > 1) parts.push(years + " years");

    if (months === 1) parts.push("1 month");
    else if (months > 1) parts.push(months + " months");

    if (parts.length === 0) return "Less than 1 month old";
    return parts.join(", ") + " old";
  }

  function getMode() {
    return modeManualRadio && modeManualRadio.checked ? "manual" : "dob";
  }

  function update() {
    share = null;
    var mode = getMode();
    var years = 0;
    var months = 0;
    var totalMonths = 0;
    var hasValidData = false;
    var today = DC.todayParts();

    if (mode === "dob") {
      if (!dobField || dobField.isEmpty()) {
        if (dobField) dobField.error("");
        result.setAttribute("data-state", "empty");
        return;
      }

      var b = dobField.get();
      if (!b) {
        result.setAttribute("data-state", "empty");
        return;
      }

      if (b.y < 1980 || b.y > today.y + 1) {
        dobField.error("Enter a valid birth year.");
        result.setAttribute("data-state", "empty");
        return;
      }

      if (G.toDays(b.y, b.m, b.d) === null) {
        dobField.error("That date does not exist. Check the day and month.");
        result.setAttribute("data-state", "empty");
        return;
      }

      var bn = G.toDays(b.y, b.m, b.d);
      var tn = G.toDays(today.y, today.m, today.d);

      if (bn > tn) {
        dobField.error("Birth date cannot be in the future.");
        result.setAttribute("data-state", "empty");
        return;
      }

      dobField.error("");
      var exactAge = DC.age(G, b, today);
      if (!exactAge) {
        result.setAttribute("data-state", "empty");
        return;
      }

      years = exactAge.y;
      months = exactAge.m;
      totalMonths = exactAge.y * 12 + exactAge.m + (exactAge.d / 30.4375);
      hasValidData = true;

      share = {
        mode: "dob",
        d: b.d,
        m: b.m,
        y: b.y
      };
    } else {
      /* Manual mode */
      var yVal = (manualYearsInput ? manualYearsInput.value : "").trim();
      var mVal = (manualMonthsInput ? manualMonthsInput.value : "").trim();

      var cleanY = DC.toLatinDigits(yVal).replace(/[^0-9]/g, "");
      var cleanM = DC.toLatinDigits(mVal).replace(/[^0-9]/g, "");

      if (cleanY !== yVal && manualYearsInput) manualYearsInput.value = cleanY;
      if (cleanM !== mVal && manualMonthsInput) manualMonthsInput.value = cleanM;

      var parsedY = cleanY === "" ? 0 : parseInt(cleanY, 10);
      var parsedM = cleanM === "" ? 0 : parseInt(cleanM, 10);

      if (cleanY === "" && cleanM === "") {
        result.setAttribute("data-state", "empty");
        return;
      }

      if (parsedY > 35) {
        parsedY = 35;
        if (manualYearsInput) manualYearsInput.value = "35";
      }
      if (parsedM > 11) {
        parsedM = 11;
        if (manualMonthsInput) manualMonthsInput.value = "11";
      }

      years = parsedY;
      months = parsedM;
      totalMonths = years * 12 + months;
      hasValidData = true;

      share = {
        mode: "manual",
        years: years,
        months: months
      };
    }

    var size = dogSizeSelect ? dogSizeSelect.value : "medium";
    if (isDog && share) {
      share.size = size;
    }

    if (!hasValidData) {
      result.setAttribute("data-state", "empty");
      return;
    }

    var petData;
    if (isDog) {
      petData = calculateDogAge(totalMonths, size);
    } else {
      petData = calculateCatAge(totalMonths);
    }

    var roundedHuman = Math.round(petData.humanYears * 10) / 10;
    var displayHumanNumber = (roundedHuman % 1 === 0) ? String(Math.round(roundedHuman)) : roundedHuman.toFixed(1);

    if (rHumanAge) rHumanAge.textContent = displayHumanNumber;
    if (rHumanUnit) {
      rHumanUnit.textContent = (displayHumanNumber === "1") ? "human year" : "human years";
    }

    var ageText = formatPetChronologicalAge(years, months);
    if (rSub) {
      rSub.textContent = ageText + ", " + petData.stage;
    }

    if (rStats) {
      var rowsHtml = "";
      if (isDog) {
        rowsHtml += statRow("Weight tier", petData.weightTier);
        rowsHtml += statRow("Life stage", petData.stage);
        rowsHtml += statRow("Senior cutoff for this size", petData.seniorCutoff);
        rowsHtml += statRow("Health checkup schedule", petData.checkup);
      } else {
        rowsHtml += statRow("Life stage", petData.stage);
        rowsHtml += statRow("Dietary milestones", petData.dietary);
        rowsHtml += statRow("Physical development phase", petData.physical);
        rowsHtml += statRow("Average feline lifespan comparison", petData.lifespan);
      }
      rStats.innerHTML = rowsHtml;
    }

    result.setAttribute("data-state", "ready");
  }

  function setMode(mode) {
    if (mode === "manual") {
      if (modeManualRadio) modeManualRadio.checked = true;
      if (dobWrap) dobWrap.hidden = true;
      if (manualWrap) manualWrap.hidden = false;
    } else {
      if (modeDobRadio) modeDobRadio.checked = true;
      if (dobWrap) dobWrap.hidden = false;
      if (manualWrap) manualWrap.hidden = true;
    }
  }

  /* Listeners */
  if (modeDobRadio) {
    modeDobRadio.addEventListener("change", function () {
      setMode("dob");
      update();
    });
  }
  if (modeManualRadio) {
    modeManualRadio.addEventListener("change", function () {
      setMode("manual");
      update();
    });
  }

  if (dobField) {
    dobField.on(function () {
      update();
    });
    DC.autoReveal(dobField, result, "Change date");
  }

  if (manualYearsInput) manualYearsInput.addEventListener("input", update);
  if (manualMonthsInput) manualMonthsInput.addEventListener("input", update);
  if (dogSizeSelect) dogSizeSelect.addEventListener("change", update);

  /* Quick presets */
  document.querySelectorAll("[data-preset-years]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var y = btn.getAttribute("data-preset-years") || "0";
      var m = btn.getAttribute("data-preset-months") || "0";
      setMode("manual");
      if (manualYearsInput) manualYearsInput.value = y;
      if (manualMonthsInput) manualMonthsInput.value = m;
      update();
    });
  });

  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      DC.copyLink(copyBtn, "Copied!", function () { return share; });
    });
  }

  /* Parse incoming URL search parameters */
  var params = DC.readParams();
  if (params.size && dogSizeSelect) {
    dogSizeSelect.value = params.size;
  }

  if (params.mode === "manual" || params.years != null || params.months != null) {
    setMode("manual");
    if (manualYearsInput && params.years != null) manualYearsInput.value = params.years;
    if (manualMonthsInput && params.months != null) manualMonthsInput.value = params.months;
    update();
  } else if (params.y && params.m && params.d && dobField) {
    setMode("dob");
    dobField.set({ y: parseInt(params.y, 10), m: parseInt(params.m, 10), d: parseInt(params.d, 10) });
    update();
  } else {
    /* Default: keep empty or set initial sample for immediate clarity */
    setMode("dob");
    result.setAttribute("data-state", "empty");
  }
})();
