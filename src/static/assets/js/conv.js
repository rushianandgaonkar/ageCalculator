/* conv.js — Nepali date converter: BS ↔ AD, plus today's Nepali date. Data: bs-data.js */
(function () {
  "use strict";
  var BS = DC.BS, G = DC.Gregorian;
  var $ = function (id) { return document.getElementById(id); };
  var AD_M = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var MIN_N = BS.toDays(2000, 1, 1), MAX_N = BS.toDays(2090, 12, BS.dim(2090, 12));
  var df = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
  var wf = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long" });
  var nf = new Intl.NumberFormat("en-IN");
  var mode = "bs"; // the calendar of the date being entered
  var field = new DC.DateField($("dob"));
  var result = $("result");
  var copyText = "";

  function cal() { return mode === "bs" ? BS : G; }
  function deva(s) { return DC.toDigits(s, "deva"); }
  function bsEn(b) { return b.d + " " + DC.BS_MONTHS[b.m - 1] + " " + b.y; }
  function bsNe(b) { return deva(b.y) + " " + DC.BS_MONTHS_NE[b.m - 1] + " " + deva(b.d); }
  function adText(n) { return df.format(DC.dateObj(n)); }
  function weekday(n) { return wf.format(DC.dateObj(n)) + " (" + DC.WEEKDAYS_NE[DC.weekday(n)] + ")"; }

  function fillMonths() {
    var sel = field.parts.m, cur = sel.value, html = '<option value="">Month</option>';
    for (var i = 0; i < 12; i++) html += '<option value="' + (i + 1) + '">' + (mode === "bs" ? DC.BS_MONTHS[i] + " (" + DC.BS_MONTHS_NE[i] + ")" : AD_M[i]) + "</option>";
    sel.innerHTML = html;
    sel.value = cur;
  }

  function showToday() {
    var n = DC.nepalTodayDays(), b = BS.fromDays(n);
    if (!b) return;
    $("today-ne").innerHTML = "<span>Today in Nepal</span><strong>" + DC.WEEKDAYS_NE[DC.weekday(n)] + ", " + bsNe(b) + "</strong>" +
      "<span>" + wf.format(DC.dateObj(n)) + ", " + bsEn(b) + " BS (" + adText(n) + ")</span>";
  }

  function validate() {
    if (field.isEmpty()) { field.error(""); return null; }
    var v = field.get();
    if (!v) { field.error(""); return null; }
    if (mode === "bs" && (v.y < 2000 || v.y > 2090)) { field.error("Enter a BS year between 2000 and 2090."); return null; }
    var n = cal().toDays(v.y, v.m, v.d);
    if (n === null) { field.error(mode === "bs" ? "That date doesn’t exist. " + DC.BS_MONTHS[v.m - 1] + " " + v.y + " has " + BS.dim(v.y, v.m) + " days." : "That date doesn’t exist. Check the day and month."); return null; }
    if (n < MIN_N || n > MAX_N) { field.error("Supported dates: 14 April 1943 to " + adText(MAX_N) + " (2000–2090 BS)."); return null; }
    field.error("");
    return n;
  }

  function update() {
    var n = validate();
    if (n === null) { result.setAttribute("data-state", "empty"); return; }
    var b = BS.fromDays(n), today = DC.nepalTodayDays(), diff = n - today;
    var rel = diff === 0 ? "Today" : (diff > 0 ? "In " + nf.format(diff) + " day" + (diff === 1 ? "" : "s") : nf.format(-diff) + " day" + (diff === -1 ? "" : "s") + " ago");
    if (mode === "bs") {
      $("r-caption").textContent = bsEn(b) + " BS in the English calendar";
      $("r-main").textContent = adText(n);
      $("r-sub").textContent = wf.format(DC.dateObj(n));
      copyText = adText(n);
    } else {
      $("r-caption").textContent = adText(n) + " in the Nepali calendar";
      $("r-main").textContent = bsEn(b) + " BS";
      $("r-sub").textContent = bsNe(b);
      copyText = bsEn(b) + " BS";
    }
    $("copy-date").textContent = "Copy " + copyText;
    var g = G.fromDays(n);
    var rows = [
      ["BS date", bsEn(b) + " (" + bsNe(b) + ")"],
      ["BS date (numbers)", b.y + "-" + DC.pad(b.m) + "-" + DC.pad(b.d) + " (" + deva(b.y + "-" + DC.pad(b.m) + "-" + DC.pad(b.d)) + ")"],
      ["AD date", adText(n)],
      ["AD date (numbers)", DC.iso(g)],
      ["Weekday", weekday(n)],
      ["From today", rel],
      ["Days in this BS month", BS.dim(b.y, b.m) + " days"]
    ];
    $("r-stats").innerHTML = rows.map(function (r) { return "<div><dt>" + r[0] + "</dt><dd>" + DC.esc(r[1]) + "</dd></div>"; }).join("");
    $("to-age").href = "/nepali-age-calculator/?dob=" + DC.iso(g);
    result.setAttribute("data-state", "ready");
    DC.writeParams({ date: DC.iso(g), from: mode === "ad" ? "ad" : "" });
  }

  function switchMode(m) {
    if (m === mode) return;
    var n = validate();
    mode = m;
    $("date-legend").textContent = m === "bs" ? "Nepali date (BS)" : "English date (AD)";
    fillMonths();
    if (n !== null) field.set(cal().fromDays(n)); else field.error("");
    update();
  }

  // ---- init ----
  fillMonths();
  showToday();
  var p = DC.readParams(), pd = DC.parseIso(p.date);
  if (p.from === "ad") { $("dir-ad").checked = true; mode = "ad"; $("date-legend").textContent = "English date (AD)"; fillMonths(); }
  if (pd) field.set(cal().fromDays(G.toDays(pd.y, pd.m, pd.d)));
  field.on(update);
  DC.autoReveal(field, result, "Change date");
  $("dir-bs").addEventListener("change", function () { switchMode("bs"); });
  $("dir-ad").addEventListener("change", function () { switchMode("ad"); });
  $("use-today").addEventListener("click", function () { field.set(cal().fromDays(DC.nepalTodayDays())); update(); });
  $("copy-date").addEventListener("click", function () {
    var btn = this;
    if (navigator.clipboard) navigator.clipboard.writeText(copyText).then(function () {
      var note = btn.parentNode.querySelector(".copied"); note.textContent = "Copied"; setTimeout(function () { note.textContent = ""; }, 2500);
    });
  });
  update();
})();
