/* home.js — English age calculator with exam age-limit check. */
(function () {
  "use strict";
  var G = DC.Gregorian;
  var $ = function (id) { return document.getElementById(id); };
  var dob = new DC.DateField($("dob"));
  var on = new DC.DateField($("on"));
  var result = $("result");
  var nf = new Intl.NumberFormat();
  var df = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
  var dfShort = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
  var wf = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long" });
  var pr = new Intl.PluralRules("en-US", { type: "ordinal" });
  var SUF = { one: "st", two: "nd", few: "rd", other: "th" };

  function ord(n) { return n + SUF[pr.select(n)]; }
  function plural(n, w) { return nf.format(n) + " " + w + (n === 1 ? "" : "s"); }
  function fmt(dayNum) { return df.format(DC.dateObj(dayNum)); }
  function fmtShort(dayNum) { return dfShort.format(DC.dateObj(dayNum)); }

  function validate(field, label) {
    if (field.isEmpty()) { field.error(""); return null; }
    var v = field.get();
    if (!v) { field.error(""); return null; } // still typing
    if (v.y < 1800 || v.y > 2200) { field.error("Enter a year between 1800 and 2200."); return null; }
    if (G.toDays(v.y, v.m, v.d) === null) { field.error("That " + label + " doesn’t exist. Check the day and month."); return null; }
    field.error("");
    return v;
  }

  function limitInt(id) {
    var v = DC.toLatinDigits($(id).value).replace(/[^0-9]/g, "");
    $(id).value = v;
    return v === "" ? null : parseInt(v, 10);
  }

  function update() {
    var b = validate(dob, "date");
    var o = validate(on, "date");
    if (!b || !o) { result.setAttribute("data-state", "empty"); return; }
    var bn = G.toDays(b.y, b.m, b.d), onN = G.toDays(o.y, o.m, o.d);
    if (bn > onN) {
      dob.error("Date of birth is after the “Age as on” date.");
      result.setAttribute("data-state", "empty");
      return;
    }
    var a = DC.age(G, b, o);
    var isToday = DC.iso(o) === DC.iso(DC.todayParts());

    $("r-caption").textContent = isToday ? "Your age today" : "Age as on " + fmt(onN);
    $("r-years").textContent = nf.format(a.y);
    $("r-years-unit").textContent = a.y === 1 ? "year" : "years";
    $("r-sub").textContent = plural(a.m, "month") + ", " + plural(a.d, "day");

    // Ruler: progress through the current year of age
    var last = DC.addMonths(G, b, a.y * 12), next = DC.addMonths(G, b, (a.y + 1) * 12);
    var lastN = G.toDays(last.y, last.m, last.d), nextN = G.toDays(next.y, next.m, next.d);
    DC.renderRuler($("r-ruler"), a,
      "<span><b>" + a.y + "</b> on " + fmtShort(lastN) + "</span><span><b>" + (a.y + 1) + "</b> on " + fmtShort(nextN) + "</span>");
    $("r-ruler").setAttribute("aria-label", a.m + " of 12 months into year " + (a.y + 1) + " of life");

    // Birthday note
    var nb = DC.nextBirthday(G, b, o);
    var note = $("r-note");
    if (nb && nb.isToday && a.y > 0) {
      note.hidden = false; note.className = "callout ok";
      note.innerHTML = "<p>Happy " + ord(a.y) + " birthday!</p>";
    } else note.hidden = true;

    // Age limit
    var minA = limitInt("min-age"), maxA = limitInt("max-age"), lim = $("r-limit");
    if (minA === null && maxA === null) lim.hidden = true;
    else {
      var okMin = minA === null || a.y >= minA, okMax = maxA === null || a.y < maxA; // "21–32" in Indian notices = must not have reached 32
      var range = minA !== null && maxA !== null ? minA + "–" + maxA + " years"
        : (minA !== null ? "at least " + minA + " years" : "up to " + maxA + " years");
      var head = okMin && okMax ? "Within the age limit (" + range + ")"
        : (!okMin ? "Below the minimum age (" + range + ")" : "Above the maximum age (" + range + ")");
      // eligible birth dates: born after cutoff − max years (UPSC 2026: 2 Aug 1994), and on/before cutoff − min years
      var from = null, to = null;
      if (maxA !== null) { var f = DC.addMonths(G, o, -12 * maxA); from = G.toDays(f.y, f.m, f.d) + 1; }
      if (minA !== null) { var t = DC.addMonths(G, o, -12 * minA); to = G.toDays(t.y, t.m, t.d); }
      var span = from !== null && to !== null ? "Qualifying dates of birth: " + fmt(from) + " to " + fmt(to) + "."
        : (from !== null ? "Qualifying dates of birth: on or after " + fmt(from) + "." : "Qualifying dates of birth: on or before " + fmt(to) + ".");
      lim.hidden = false;
      lim.className = "callout " + (okMin && okMax ? "ok" : "bad");
      lim.innerHTML = "<p><strong>" + DC.esc(head) + "</strong></p><p>You are " + plural(a.y, "year") + " and " +
        plural(a.m, "month") + " old on " + fmt(onN) + ". " + span + "</p>";
    }

    var weeks = Math.floor(a.days / 7), wd = a.days % 7;
    var rows = [
      ["Born on", wf.format(DC.dateObj(bn)) + ", " + fmt(bn)],
      ["Next birthday", nb ? (nb.isToday ? "Today" : fmt(nb.dayNum) + " (" + plural(nb.days, "day") + ")") : "–"],
      ["Turning", nb ? ord(nb.isToday ? a.y : nb.turning) : "–"],
      ["Age in months", plural(a.months, "month") + (a.d ? ", " + plural(a.d, "day") : "")],
      ["Age in weeks", plural(weeks, "week") + (wd ? ", " + plural(wd, "day") : "")],
      ["Age in days", plural(a.days, "day")],
      ["Age in hours", nf.format(a.days * 24)],
      ["Age in minutes", nf.format(a.days * 1440)]
    ];
    $("r-stats").innerHTML = rows.map(function (r) {
      return "<div><dt>" + r[0] + "</dt><dd>" + DC.esc(r[1]) + "</dd></div>";
    }).join("");

    result.setAttribute("data-state", "ready");
    DC.writeParams({ dob: DC.iso(b), on: isToday ? "" : DC.iso(o), min: minA, max: maxA });
  }

  // Initial state: today, or values from a shared link
  var p = DC.readParams();
  on.set(DC.parseIso(p.on) || DC.todayParts());
  var pd = DC.parseIso(p.dob);
  if (pd) dob.set(pd);
  if (p.min || p.max) {
    $("min-age").value = (p.min || "").replace(/\D/g, "");
    $("max-age").value = (p.max || "").replace(/\D/g, "");
    $("limits").open = true;
  }

  dob.on(update);
  DC.autoReveal(dob, result, "Change date of birth");
  on.on(update);
  $("min-age").addEventListener("input", update);
  $("max-age").addEventListener("input", update);
  $("reset-today").addEventListener("click", function () { on.set(DC.todayParts()); update(); });
  $("copy").addEventListener("click", function () { DC.copyLink(this, "Link copied"); });
  update();
})();
