/* datecore.js — shared date maths and form helpers for every calculator page.
   No dependencies. All dates are handled as whole days (UTC) so time zones and
   daylight saving can never shift a result by a day.

   A "calendar" object has: dim(y, m) -> days in month (or null),
   toDays(y, m, d) -> day number (or null if the date does not exist),
   fromDays(n) -> {y, m, d}. Gregorian and Hijri live here; Bikram Sambat
   is created with DC.makeCalendarFromTable() in ne.js. */
(function (global) {
  "use strict";

  var DAY = 86400000;

  function utcDays(y, m, d) {
    var t = new Date(0);
    t.setUTCFullYear(y, m - 1, d);
    t.setUTCHours(0, 0, 0, 0);
    return Math.round(t.getTime() / DAY);
  }
  function fromUtcDays(n) {
    var t = new Date(n * DAY);
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
  }
  function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
  var MDAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  /* ---------- Gregorian ---------- */
  var Gregorian = {
    id: "gregorian",
    dim: function (y, m) { return m === 2 && isLeap(y) ? 29 : MDAYS[m - 1]; },
    toDays: function (y, m, d) {
      if (!(y >= 1 && m >= 1 && m <= 12 && d >= 1 && d <= Gregorian.dim(y, m))) return null;
      return utcDays(y, m, d);
    },
    fromDays: fromUtcDays
  };

  /* ---------- Hijri (Umm al-Qura) via the browser's Intl calendar data ---------- */
  var Hijri = (function () {
    var fmt = null, calName = null, cache = {};
    function formatter() {
      if (fmt) return fmt;
      var tries = ["islamic-umalqura", "islamic-civil", "islamic"];
      for (var i = 0; i < tries.length; i++) {
        try {
          var f = new Intl.DateTimeFormat("en-US-u-ca-" + tries[i] + "-nu-latn",
            { timeZone: "UTC", year: "numeric", month: "numeric", day: "numeric" });
          var c = f.resolvedOptions().calendar;
          if (c && c.indexOf("islamic") === 0) { fmt = f; calName = c; return fmt; }
        } catch (e) { /* try next */ }
      }
      return null;
    }
    function fromDays(n) {
      if (cache[n]) return cache[n];
      var f = formatter(); if (!f) return null;
      var p = {};
      f.formatToParts(new Date(n * DAY)).forEach(function (x) {
        if (x.type === "year" || x.type === "month" || x.type === "day") p[x.type] = parseInt(x.value, 10);
      });
      var r = { y: p.year, m: p.month, d: p.day };
      cache[n] = r;
      return r;
    }
    var EPOCH = utcDays(622, 7, 19); // 1 Muharram 1 AH (proleptic Gregorian)
    function same(h, y, m, d) { return h && h.y === y && h.m === m && h.d === d; }
    function toDays(y, m, d) {
      if (!(y >= 1 && m >= 1 && m <= 12 && d >= 1 && d <= 30) || !formatter()) return null;
      var n = EPOCH + Math.floor((y - 1) * 354.36667 + (m - 1) * 29.5306) + d - 1;
      for (var i = 0; i < 8; i++) {
        var h = fromDays(n);
        var delta = (y - h.y) * 354.37 + (m - h.m) * 29.53 + (d - h.d);
        if (Math.abs(delta) < 1) break;
        n += Math.round(delta);
      }
      for (var k = 0; k <= 4; k++) {
        if (same(fromDays(n + k), y, m, d)) return n + k;
        if (k && same(fromDays(n - k), y, m, d)) return n - k;
      }
      return null;
    }
    var MIN_DAYS = utcDays(1882, 11, 12); // 1 Muharram 1300 AH (start of Umm al-Qura data)
    var MAX_DAYS = utcDays(2174, 11, 25); // 30 Dhu al-Hijjah 1600 AH (end of Umm al-Qura data)
    function dim(y, m) { return toDays(y, m, 30) === null ? 29 : 30; }
    return {
      id: "hijri", dim: dim, toDays: toDays, fromDays: fromDays,
      minDays: MIN_DAYS, maxDays: MAX_DAYS,
      inRange: function (n) { return n !== null && n >= MIN_DAYS && n <= MAX_DAYS; },
      calendarName: function () { formatter(); return calName; },
      isFallback: function () { formatter(); return !!calName && calName !== "islamic-umalqura"; },
      supported: function () { return !!formatter(); }
    };
  })();

  /* Build a calendar from a month-length table: one digit per month, digit = days - 29. */
  function makeCalendarFromTable(id, table, startYear, epochGregorian) {
    var years = table.length / 12, yStart = [0], EPOCH = utcDays(epochGregorian[0], epochGregorian[1], epochGregorian[2]);
    for (var i = 0; i < years; i++) {
      var s = 0;
      for (var j = 0; j < 12; j++) s += 29 + (+table[i * 12 + j]);
      yStart.push(yStart[i] + s);
    }
    function dim(y, m) {
      var i = y - startYear;
      if (i < 0 || i >= years || m < 1 || m > 12) return null;
      return 29 + (+table[i * 12 + m - 1]);
    }
    function toDays(y, m, d) {
      var len = dim(y, m);
      if (!len || d < 1 || d > len) return null;
      var i = y - startYear, n = EPOCH + yStart[i];
      for (var j = 0; j < m - 1; j++) n += 29 + (+table[i * 12 + j]);
      return n + d - 1;
    }
    function fromDays(n) {
      var off = n - EPOCH;
      if (off < 0 || off >= yStart[years]) return null;
      var i = 0;
      while (yStart[i + 1] <= off) i++;
      off -= yStart[i];
      var m = 0;
      for (;;) { var len = 29 + (+table[i * 12 + m]); if (off < len) break; off -= len; m++; }
      return { y: startYear + i, m: m + 1, d: off + 1 };
    }
    return { id: id, dim: dim, toDays: toDays, fromDays: fromDays, minYear: startYear, maxYear: startYear + years - 1 };
  }

  /* ---------- Age maths (works for any calendar) ---------- */
  function addMonths(cal, a, k) {
    var mm = a.m - 1 + k;
    var y = a.y + Math.floor(mm / 12);
    var m = ((mm % 12) + 12) % 12 + 1;
    var dm = cal.dim(y, m);
    if (!dm) return null;
    return { y: y, m: m, d: Math.min(a.d, dm) };
  }
  function dayOf(cal, x) { return cal.toDays(x.y, x.m, x.d); }

  /* Exact age between a (birth) and b (on), a <= b.
     Months are counted by stepping whole calendar months from the birth date; if the
     birth day does not exist in a month (31st, 30 Feb, 29 Feb) the last day of that
     month is used. The remaining days are counted exactly. */
  function age(cal, a, b) {
    var an = dayOf(cal, a), bn = dayOf(cal, b);
    if (an === null || bn === null || an > bn) return null;
    var k = (b.y - a.y) * 12 + (b.m - a.m);
    var anchor = addMonths(cal, a, k);
    if (!anchor || dayOf(cal, anchor) > bn) { k--; anchor = addMonths(cal, a, k); }
    var anchorN = dayOf(cal, anchor);
    var nextAnchor = addMonths(cal, a, k + 1);
    var nextN = nextAnchor ? dayOf(cal, nextAnchor) : null;
    return {
      y: Math.floor(k / 12), m: k % 12, d: bn - anchorN,
      months: k, days: bn - an,
      monthFraction: nextN ? (bn - anchorN) / (nextN - anchorN) : 0
    };
  }

  /* The "test manual" method: subtract y/m/d, borrowing 30 days and 12 months. */
  function age30(a, b) {
    var y = b.y - a.y, m = b.m - a.m, d = b.d - a.d;
    if (d < 0) { d += 30; m -= 1; }
    if (m < 0) { m += 12; y -= 1; }
    return y < 0 ? null : { y: y, m: m, d: d };
  }

  function nextBirthday(cal, birth, on) {
    var onN = dayOf(cal, on);
    for (var y = on.y; y <= on.y + 1; y++) {
      var dm = cal.dim(y, birth.m);
      if (!dm) return null;
      var c = { y: y, m: birth.m, d: Math.min(birth.d, dm) };
      var cn = dayOf(cal, c);
      if (cn >= onN) return { date: c, dayNum: cn, days: cn - onN, turning: y - birth.y, isToday: cn === onN };
    }
    return null;
  }

  function todayParts() {
    var t = new Date();
    return { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() };
  }
  function weekday(dayNum) { return new Date(dayNum * DAY).getUTCDay(); }
  function dateObj(dayNum) { return new Date(dayNum * DAY); }
  function iso(g) { return g.y + "-" + pad(g.m) + "-" + pad(g.d); }
  function parseIso(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
    if (!m) return null;
    var g = { y: +m[1], m: +m[2], d: +m[3] };
    return Gregorian.toDays(g.y, g.m, g.d) === null ? null : g;
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  /* ---------- Digits ---------- */
  var DIGIT_RANGES = [0x0660, 0x06F0, 0x0966, 0xFF10]; // Arabic-Indic, Persian, Devanagari, full-width
  function toLatinDigits(s) {
    return String(s).replace(/[٠-٩۰-۹०-९０-９]/g, function (ch) {
      var c = ch.charCodeAt(0);
      for (var i = 0; i < DIGIT_RANGES.length; i++) {
        if (c >= DIGIT_RANGES[i] && c <= DIGIT_RANGES[i] + 9) return String(c - DIGIT_RANGES[i]);
      }
      return ch;
    });
  }
  function toDigits(s, system) {
    var base = { arab: 0x0660, deva: 0x0966 }[system];
    if (!base) return String(s);
    return String(s).replace(/[0-9]/g, function (d) { return String.fromCharCode(base + (+d)); });
  }

  /* ---------- Form: three-part date field ---------- */
  /* A part is "complete" when no further digit could make sense, so the cursor can move on
     without a Done key (iOS number pads have none): day 4–9 or two digits, month 2–9 or two digits,
     year at its maxlength. */
  function partComplete(el) {
    if (el.tagName === "SELECT") return !!el.value;
    var v = el.value, part = el.getAttribute("data-part"), max = +el.getAttribute("maxlength") || 2;
    if (!v) return false;
    if (v.length >= max) return true;
    if (part === "d") return +v >= 4;
    if (part === "m") return +v >= 2;
    return false;
  }
  function DateField(root) {
    this.root = root;
    this.parts = {};
    this.order = Array.prototype.slice.call(root.querySelectorAll("[data-part]"));
    this.err = root.querySelector(".field-error");
    this.errorId = null;
    if (this.err) {
      this.errorId = this.err.id || (root.id ? root.id + "-date-error" : "date-error-" + (++DateField.errorCounter));
      this.err.id = this.errorId;
      this.err.setAttribute("aria-live", "polite");
    }
    var self = this;
    this.order.forEach(function (el, i) {
      self.parts[el.getAttribute("data-part")] = el;
      if (el.tagName === "SELECT") return;
      el.addEventListener("input", function () {
        var clean = toLatinDigits(el.value).replace(/[^0-9]/g, "");
        if (clean !== el.value) el.value = clean;
        if (partComplete(el) && self.order[i + 1] && document.activeElement === el) self.order[i + 1].focus();
      });
      el.addEventListener("keydown", function (e) {
        if (e.key === "Backspace" && el.value === "" && self.order[i - 1]) { self.order[i - 1].focus(); }
      });
    });
  }
  DateField.prototype.get = function () {
    var p = this.parts, out = {};
    var keys = ["y", "m", "d"];
    for (var i = 0; i < keys.length; i++) {
      var v = toLatinDigits(p[keys[i]].value).trim();
      if (!/^\d+$/.test(v)) return null;
      out[keys[i]] = parseInt(v, 10);
    }
    if (String(out.y).length < 4) return null;
    return out;
  };
  DateField.prototype.isEmpty = function () {
    var p = this.parts;
    return !p.y.value && !p.d.value && (p.m.tagName === "SELECT" || !p.m.value);
  };
  DateField.prototype.set = function (v) {
    this.parts.y.value = v ? v.y : "";
    this.parts.m.value = v ? (this.parts.m.tagName === "SELECT" ? String(v.m) : pad(v.m)) : "";
    this.parts.d.value = v ? pad(v.d) : "";
  };
  DateField.errorCounter = 0;
  DateField.prototype.error = function (msg) {
    var invalid = !!msg;
    this.root.classList.toggle("has-error", invalid);
    if (this.err) { this.err.textContent = msg || ""; this.err.hidden = !invalid; }
    var errorId = this.errorId;
    this.order.forEach(function (el) {
      if (!errorId) return;
      var ids = (el.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
      ids = ids.filter(function (id) { return id !== errorId; });
      if (invalid) ids.push(errorId);
      if (ids.length) el.setAttribute("aria-describedby", ids.join(" "));
      else el.removeAttribute("aria-describedby");
      if (invalid) el.setAttribute("aria-invalid", "true");
      else el.removeAttribute("aria-invalid");
    });
  };
  DateField.prototype.on = function (fn) {
    var self = this;
    this.order.forEach(function (el) { el.addEventListener(el.tagName === "SELECT" ? "change" : "input", function () { fn(self); }); });
  };

  /* ---------- Phones: bring the result into view ----------
     In the one-column layout the result sits below the form, and the on-screen keyboard covers
     much of the screen. When the person finishes typing the date of birth (last part complete,
     or Enter/Done), close the keyboard and scroll the result into view. A "change date" button
     in the result takes them back. */
  function isOneColumn() { return window.matchMedia && window.matchMedia("(max-width: 719px)").matches; }
  function smooth() { return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"; }
  function revealResult(resultEl) {
    if (!isOneColumn() || resultEl.getAttribute("data-state") !== "ready") return;
    var top = resultEl.getBoundingClientRect().top;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (top > 0 && top < window.innerHeight * 0.35) return; // already in view
    resultEl.scrollIntoView({ behavior: smooth(), block: "start" });
  }
  function autoReveal(field, resultEl, editLabel) {
    var parts = field.order, last = parts[parts.length - 1];
    parts.forEach(function (el, i) {
      if (el.tagName !== "SELECT") el.setAttribute("enterkeyhint", i === parts.length - 1 ? "done" : "next");
      el.addEventListener("keydown", function (e) {
        if (e.key !== "Enter") return;
        e.preventDefault();
        if (parts[i + 1] && !partComplete(parts[i + 1])) parts[i + 1].focus();
        else setTimeout(function () { revealResult(resultEl); el.blur(); }, 30);
      });
    });
    last.addEventListener(last.tagName === "SELECT" ? "change" : "input", function () {
      if (partComplete(last)) setTimeout(function () { revealResult(resultEl); }, 60);
    });
    // "Change date" shortcut, shown only in the one-column layout (see .result-edit in site.css)
    var body = resultEl.querySelector(".result-body");
    if (body && editLabel) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "btn-link result-edit"; b.textContent = editLabel;
      b.addEventListener("click", function () {
        field.root.scrollIntoView({ behavior: smooth(), block: "center" });
        setTimeout(function () { parts[0].focus({ preventScroll: true }); }, 350);
      });
      body.insertBefore(b, body.firstChild);
    }
  }

  /* ---------- URL state (shareable links) ---------- */
  function readParams() {
    var out = {};
    try { new URLSearchParams(location.search).forEach(function (v, k) { out[k] = v; }); } catch (e) { /* old browser */ }
    return out;
  }
  function buildQuery(obj) {
    var sp = new URLSearchParams();
    if (obj) Object.keys(obj).forEach(function (k) { if (obj[k] != null && obj[k] !== "") sp.set(k, obj[k]); });
    return sp.toString();
  }
  function shareUrl(obj) {
    try {
      var q = buildQuery(obj);
      var base = location.origin && location.origin !== "null" ? location.origin + location.pathname : String(location.href).split("?")[0];
      return base + (q ? "?" + q : "");
    } catch (e) { return String(location.href || ""); }
  }
  function writeParams(obj) {
    try {
      var q = buildQuery(obj);
      history.replaceState(null, "", location.pathname + (q ? "?" + q : ""));
    } catch (e) { /* ignore */ }
  }
  function copyLink(btn, doneText, params) {
    if (params) writeParams(typeof params === "function" ? params() : params);
    var url = location.href;
    function done() {
      var note = btn.parentNode.querySelector(".copied");
      if (note) { note.textContent = doneText; setTimeout(function () { note.textContent = ""; }, 2500); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { prompt("", url); });
    else prompt("", url);
  }

  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };

  /* ---------- Rendering helpers ---------- */
  function renderRuler(el, a, legendHtml) {
    // a = result of age(): 12 segments, a.m full, segment a.m partly filled
    var html = "";
    for (var i = 0; i < 12; i++) {
      if (i < a.m) html += '<span class="full"></span>';
      else if (i === a.m) html += '<span class="part" style="--fill:' + Math.round(a.monthFraction * 100) + '%"></span>';
      else html += "<span></span>";
    }
    el.querySelector(".ruler-track").innerHTML = html;
    if (legendHtml != null) el.querySelector(".ruler-legend").innerHTML = legendHtml;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  global.DC = {
    DAY: DAY, Gregorian: Gregorian, Hijri: Hijri, makeCalendarFromTable: makeCalendarFromTable,
    utcDays: utcDays, fromUtcDays: fromUtcDays, isLeap: isLeap,
    age: age, age30: age30, addMonths: addMonths, nextBirthday: nextBirthday,
    todayParts: todayParts, weekday: weekday, dateObj: dateObj, iso: iso, parseIso: parseIso, pad: pad,
    toLatinDigits: toLatinDigits, toDigits: toDigits,
    DateField: DateField, autoReveal: autoReveal, partComplete: partComplete, readParams: readParams, writeParams: writeParams, shareUrl: shareUrl, copyLink: copyLink,
    store: store, renderRuler: renderRuler, esc: esc
  };
})(typeof window !== "undefined" ? window : globalThis);
