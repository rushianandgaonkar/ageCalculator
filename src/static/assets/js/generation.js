/* generation.js — interactive generation and age range calculator */
(function (global) {
  "use strict";

  var GENERATIONS = [
    {
      id: "beta",
      name: "Generation Beta",
      shortName: "Gen Beta",
      aliases: null,
      startYear: 2025,
      endYear: 2039,
      minAge2026: 0,
      maxAge2026: 1,
      tech: "Artificial general intelligence, commercial robotics, autonomous transit and spatial devices",
      events: "Post pandemic era, commercial human robotics, dawn of generative synthetic media",
      workStyle: "Next era digital natives, collaborating directly with automated and artificial intelligence systems"
    },
    {
      id: "alpha",
      name: "Generation Alpha",
      shortName: "Gen Alpha",
      aliases: null,
      startYear: 2013,
      endYear: 2024,
      minAge2026: 2,
      maxAge2026: 13,
      tech: "Artificial intelligence, tablet computers, voice assistants, smart devices from birth",
      events: "COVID pandemic childhood, remote schooling, emergence of generative artificial intelligence",
      workStyle: "Visual learners, highly interactive digital communication, fluent in screen media"
    },
    {
      id: "z",
      name: "Generation Z",
      shortName: "Gen Z",
      aliases: "Zoomers",
      startYear: 1997,
      endYear: 2012,
      minAge2026: 14,
      maxAge2026: 29,
      tech: "Smartphones, social video, streaming media, ubiquitous mobile broadband",
      events: "COVID pandemic school and career disruption, global climate awareness, 2020 social movements",
      workStyle: "Short form video, direct messaging, valuing authenticity, autonomy and workplace flexibility"
    },
    {
      id: "millennial",
      name: "Millennial",
      shortName: "Millennial",
      aliases: "Generation Y",
      startYear: 1981,
      endYear: 1996,
      minAge2026: 30,
      maxAge2026: 45,
      tech: "Personal computers, broadband internet, early smartphones, social networks",
      events: "September 11 attacks, 2008 Great Recession, transition from analog to digital life",
      workStyle: "Messaging platforms, collaborative team software, prioritizing purpose and work life balance"
    },
    {
      id: "x",
      name: "Generation X",
      shortName: "Gen X",
      aliases: null,
      startYear: 1965,
      endYear: 1980,
      minAge2026: 46,
      maxAge2026: 61,
      tech: "Personal computers, cable television, video game consoles, CDs and VHS",
      events: "Fall of the Berlin Wall, Dot com expansion, Gulf War, corporate restructuring",
      workStyle: "Email and phone calls, self reliant, adaptable, practical problem solving"
    },
    {
      id: "boomer",
      name: "Baby Boomer",
      shortName: "Baby Boomer",
      aliases: "Boomers",
      startYear: 1946,
      endYear: 1964,
      minAge2026: 62,
      maxAge2026: 80,
      tech: "Color television, transistor radios, landline phones, household automation",
      events: "Vietnam War, Moon landing, Civil Rights movement, Cold War",
      workStyle: "In person meetings, direct phone contact, organizational dedication and structured teamwork"
    },
    {
      id: "silent",
      name: "Silent Generation",
      shortName: "Silent",
      aliases: null,
      startYear: 1928,
      endYear: 1945,
      minAge2026: 81,
      maxAge2026: 98,
      tech: "Rotary telephones, radio broadcasting, mechanical typewriters, print media",
      events: "World War II, Korean War, postwar economic expansion, space race beginning",
      workStyle: "Written correspondence, face to face discussions, civic loyalty and steady commitment"
    },
    {
      id: "greatest",
      name: "Greatest Generation",
      shortName: "Greatest",
      aliases: null,
      startYear: 1901,
      endYear: 1927,
      minAge2026: 99,
      maxAge2026: 125,
      tech: "Early radio, telephone lines, commercial electrification, automobiles",
      events: "Great Depression, World War I, World War II",
      workStyle: "Strong work ethic, shared sacrifice, deep community resilience"
    }
  ];

  var CUSPS = [
    {
      name: "Zalpha",
      startYear: 2010,
      endYear: 2015,
      label: "Zalpha (2010 to 2015 cusp)",
      description: "Cusp between Generation Z and Generation Alpha. Experienced early childhood during rapid smartphone adoption and primary education during pandemic remote schooling."
    },
    {
      name: "Zillennial",
      startYear: 1993,
      endYear: 1998,
      label: "Zillennial (1993 to 1998 cusp)",
      description: "Cusp between Millennials and Generation Z. Grew up with dial up internet and flip phones, but came of age right alongside the modern smartphone era."
    },
    {
      name: "Xennial",
      startYear: 1977,
      endYear: 1983,
      label: "Xennial (1977 to 1983 cusp)",
      description: "Cusp between Generation X and Millennials. Experienced an analog childhood with outdoor play, followed by a digital young adulthood."
    },
    {
      name: "Generation Jones",
      startYear: 1954,
      endYear: 1965,
      label: "Generation Jones (1954 to 1965 cusp)",
      description: "Cusp between later Baby Boomers and early Generation X. Came of age after the optimistic sixties boom, navigating seventies economic shifts with grounded realism."
    }
  ];

  var PRESET_YEARS = {
    alpha: 2018,
    z: 2005,
    millennial: 1990,
    x: 1972,
    boomer: 1955,
    silent: 1938
  };

  var MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  function getGeneration(year) {
    for (var i = 0; i < GENERATIONS.length; i++) {
      if (year >= GENERATIONS[i].startYear && year <= GENERATIONS[i].endYear) {
        return GENERATIONS[i];
      }
    }
    if (year > 2039) return GENERATIONS[0];
    if (year < 1901) {
      return {
        id: "earlier",
        name: "Prior Generations",
        shortName: "Historical",
        aliases: null,
        startYear: 1800,
        endYear: 1900,
        minAge2026: 126,
        maxAge2026: 226,
        tech: "Steam power, telegraph, early industrial machinery",
        events: "Industrial Revolution, 19th century historical events",
        workStyle: "Agrarian and craft labor, traditional apprenticeships"
      };
    }
    return null;
  }

  function getCusp(year) {
    for (var i = 0; i < CUSPS.length; i++) {
      if (year >= CUSPS[i].startYear && year <= CUSPS[i].endYear) {
        return CUSPS[i];
      }
    }
    return null;
  }

  function formatBirthday(d) {
    return d.d + " " + MONTHS[d.m - 1] + " " + d.y;
  }

  function init() {
    if (!document || typeof document.getElementById !== "function") return;
    var form = document.getElementById("calc");
    if (!form) return;

    var modeYearRadio = document.getElementById("mode-year");
    var modeDobRadio = document.getElementById("mode-dob");
    var yearWrap = document.getElementById("year-wrap");
    var dobWrap = document.getElementById("dob-wrap");
    var inputYear = document.getElementById("input-year");
    var yearError = document.getElementById("year-error");
    var dobField = new DC.DateField(document.getElementById("dob"));
    var resultEl = document.getElementById("result");
    var rName = document.getElementById("r-name");
    var rSub = document.getElementById("r-sub");
    var rStats = document.getElementById("r-stats");
    var copyBtn = document.getElementById("copy");
    var presetChips = document.querySelectorAll(".preset-chip[data-gen]");

    var currentCalculatedYear = null;

    function getActiveMode() {
      return modeDobRadio && modeDobRadio.checked ? "dob" : "year";
    }

    function setActiveChip(genId) {
      presetChips.forEach(function (chip) {
        if (chip.getAttribute("data-gen") === genId) {
          chip.classList.add("is-active");
          chip.setAttribute("aria-pressed", "true");
        } else {
          chip.classList.remove("is-active");
          chip.setAttribute("aria-pressed", "false");
        }
      });
    }

    function setYearError(msg) {
      if (yearError) {
        yearError.textContent = msg || "";
        yearError.hidden = !msg;
      }
      if (inputYear) {
        inputYear.classList.toggle("has-error", !!msg);
      }
    }

    function renderGeneration(gen, cusp, exactAge, nextBday, birthYear) {
      currentCalculatedYear = birthYear;

      var displayName = gen.name;
      if (gen.aliases) {
        displayName += " (" + gen.aliases + ")";
      }
      rName.textContent = displayName;

      var subLine = "Born " + gen.startYear + " to " + gen.endYear + " · Ages " + gen.minAge2026 + " to " + gen.maxAge2026 + " in 2026";
      rSub.textContent = subLine;

      var statsHtml = "";

      // 1. Micro-generation / cusp
      statsHtml += "<div><dt>Micro generation</dt><dd>";
      if (cusp) {
        statsHtml += DC.esc(cusp.label);
      } else {
        statsHtml += "Core " + DC.esc(gen.shortName) + " (not on a cusp)";
      }
      statsHtml += "</dd></div>";

      // 2. Defining technology
      statsHtml += "<div><dt>Defining technology</dt><dd>" + DC.esc(gen.tech) + "</dd></div>";

      // 3. Defining events
      statsHtml += "<div><dt>Key historical events</dt><dd>" + DC.esc(gen.events) + "</dd></div>";

      // 4. Work and communication style
      statsHtml += "<div><dt>Work and communication</dt><dd>" + DC.esc(gen.workStyle) + "</dd></div>";

      // 5. Age information
      if (exactAge) {
        statsHtml += "<div><dt>Exact age today</dt><dd>" + exactAge.y + " years, " + exactAge.m + " months, " + exactAge.d + " days</dd></div>";
        if (nextBday) {
          if (nextBday.isToday) {
            statsHtml += "<div><dt>Birthday today</dt><dd>Happy birthday today!</dd></div>";
          } else {
            statsHtml += "<div><dt>Next birthday</dt><dd>Turning " + (exactAge.y + 1) + " on " + formatBirthday(nextBday.birthday) + " (in " + nextBday.days + " days)</dd></div>";
          }
        }
      } else if (birthYear) {
        var approximateAge = 2026 - birthYear;
        statsHtml += "<div><dt>Age in 2026</dt><dd>Turning " + approximateAge + " in 2026</dd></div>";
      }

      rStats.innerHTML = statsHtml;
      resultEl.setAttribute("data-state", "ready");
      setActiveChip(gen.id);
    }

    function calculate() {
      var mode = getActiveMode();

      if (mode === "year") {
        setYearError("");
        var raw = (inputYear.value || "").trim();
        if (!raw) {
          resultEl.setAttribute("data-state", "empty");
          setActiveChip(null);
          return;
        }

        var year = parseInt(raw, 10);
        if (isNaN(year) || year < 1900 || year > 2030) {
          setYearError("Please enter a four digit birth year between 1901 and 2026.");
          resultEl.setAttribute("data-state", "empty");
          setActiveChip(null);
          return;
        }

        var gen = getGeneration(year);
        if (!gen) {
          resultEl.setAttribute("data-state", "empty");
          setActiveChip(null);
          return;
        }

        var cusp = getCusp(year);
        renderGeneration(gen, cusp, null, null, year);
        DC.writeParams({ year: year });

      } else {
        dobField.error("");
        var dob = dobField.get();
        if (!dob) {
          resultEl.setAttribute("data-state", "empty");
          setActiveChip(null);
          return;
        }

        var today = DC.todayParts();
        var valid = DC.Gregorian.toDays(dob.y, dob.m, dob.d);
        if (valid === null) {
          dobField.error("Please enter a valid calendar date.");
          resultEl.setAttribute("data-state", "empty");
          setActiveChip(null);
          return;
        }

        var ageRes = DC.age(DC.Gregorian, dob, today);
        if (!ageRes) {
          dobField.error("Date of birth must be in the past.");
          resultEl.setAttribute("data-state", "empty");
          setActiveChip(null);
          return;
        }

        var genDob = getGeneration(dob.y);
        if (!genDob) {
          resultEl.setAttribute("data-state", "empty");
          setActiveChip(null);
          return;
        }

        var cuspDob = getCusp(dob.y);
        var nextBday = DC.nextBirthday(DC.Gregorian, dob, today);
        renderGeneration(genDob, cuspDob, ageRes, nextBday, dob.y);
        DC.writeParams({ y: dob.y, m: dob.m, d: dob.d });
      }
    }

    // Switch mode
    function switchMode(newMode) {
      if (newMode === "dob") {
        yearWrap.hidden = true;
        dobWrap.hidden = false;
        modeDobRadio.checked = true;
        modeYearRadio.checked = false;
        dobField.order[0].focus();
      } else {
        dobWrap.hidden = true;
        yearWrap.hidden = false;
        modeYearRadio.checked = true;
        modeDobRadio.checked = false;
        inputYear.focus();
      }
      calculate();
    }

    if (modeYearRadio) {
      modeYearRadio.addEventListener("change", function () {
        if (modeYearRadio.checked) switchMode("year");
      });
    }
    if (modeDobRadio) {
      modeDobRadio.addEventListener("change", function () {
        if (modeDobRadio.checked) switchMode("dob");
      });
    }

    // Input year events
    if (inputYear) {
      inputYear.addEventListener("input", function () {
        var clean = DC.toLatinDigits(inputYear.value).replace(/[^0-9]/g, "");
        if (clean !== inputYear.value) inputYear.value = clean;
        if (clean.length === 4) {
          calculate();
          if (window.innerWidth < 720 && resultEl.getAttribute("data-state") === "ready") {
            setTimeout(function () {
              if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
              resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 120);
          }
        } else if (clean.length === 0) {
          setYearError("");
          resultEl.setAttribute("data-state", "empty");
          setActiveChip(null);
        }
      });

      inputYear.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          calculate();
          if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
          if (window.innerWidth < 720 && resultEl.getAttribute("data-state") === "ready") {
            resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      });
    }

    // DOB events
    dobField.on(function () {
      calculate();
    });

    DC.autoReveal(dobField, resultEl, "Change date of birth");

    // Preset shortcuts
    presetChips.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var genKey = btn.getAttribute("data-gen");
        var yr = PRESET_YEARS[genKey];
        if (!yr) return;

        if (getActiveMode() !== "year") {
          yearWrap.hidden = false;
          dobWrap.hidden = true;
          modeYearRadio.checked = true;
          modeDobRadio.checked = false;
        }

        inputYear.value = String(yr);
        setYearError("");
        calculate();

        if (window.innerWidth < 720 && resultEl.getAttribute("data-state") === "ready") {
          setTimeout(function () {
            resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 80);
        }
      });
    });

    // Copy link
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        DC.copyLink(copyBtn, "Link copied!", function () {
          if (getActiveMode() === "dob") {
            var d = dobField.get();
            if (d) return { y: d.y, m: d.m, d: d.d };
          }
          if (currentCalculatedYear) {
            return { year: currentCalculatedYear };
          }
          return {};
        });
      });
    }

    // Read initial URL params
    var params = DC.readParams();
    if (params.year && /^\d{4}$/.test(params.year)) {
      switchMode("year");
      inputYear.value = params.year;
      calculate();
    } else if (params.gen && PRESET_YEARS[params.gen]) {
      switchMode("year");
      inputYear.value = String(PRESET_YEARS[params.gen]);
      calculate();
    } else if (params.y && params.m && params.d) {
      switchMode("dob");
      dobField.set({ y: parseInt(params.y, 10), m: parseInt(params.m, 10), d: parseInt(params.d, 10) });
      calculate();
    } else if (params.y && /^\d{4}$/.test(params.y)) {
      switchMode("year");
      inputYear.value = params.y;
      calculate();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Export for testing
  global.GenerationLogic = {
    GENERATIONS: GENERATIONS,
    CUSPS: CUSPS,
    PRESET_YEARS: PRESET_YEARS,
    getGeneration: getGeneration,
    getCusp: getCusp
  };
})(typeof window !== "undefined" ? window : globalThis);
