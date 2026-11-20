/* age-l10n.js: shared age calculator engine for localized home pages.
   The page loads a language file first that sets window.AGE_L10N:
   { locale, t: {strings}, caption, sub, ruler, rulerLabel, birthdayToday, rows(ctx) } */
(function () {
  "use strict";
  var L = window.AGE_L10N, t = L.t;
  var G = DC.Gregorian;
  var $ = function (id) { return document.getElementById(id); };
  var dob = new DC.DateField($("dob"));
  var on = new DC.DateField($("on"));
  var result = $("result");
  var nf = new Intl.NumberFormat(L.locale);
  var df = new Intl.DateTimeFormat(L.locale, { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
  var dfShort = new Intl.DateTimeFormat(L.locale, { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
  var wf = new Intl.DateTimeFormat(L.locale, { timeZone: "UTC", weekday: "long" });
  var share = null;

  function fmt(n) { return df.format(DC.dateObj(n)); }

  // Western sun sign index: 0 = Aquarius (from 20 Jan) ... 11 = Capricorn
  var SIGN_START = [20, 19, 21, 20, 21, 21, 23, 23, 23, 23, 22, 22];
  function zodiac(m, d) { return d >= SIGN_START[m - 1] ? m - 1 : (m + 10) % 12; }

  function validate(field) {
    if (field.isEmpty()) { field.error(""); return null; }
    var v = field.get();
    if (!v) { field.error(""); return null; }
    if (v.y < 1800 || v.y > 2200) { field.error(t.errYear); return null; }
    if (G.toDays(v.y, v.m, v.d) === null) { field.error(t.errDate); return null; }
    field.error("");
    return v;
  }

  function update() {
    share = null;
    var b = validate(dob), o = validate(on);
    if (!b || !o) { result.setAttribute("data-state", "empty"); return; }
    var bn = G.toDays(b.y, b.m, b.d), onN = G.toDays(o.y, o.m, o.d);
    if (bn > onN) { dob.error(t.errOrder); result.setAttribute("data-state", "empty"); return; }
    var a = DC.age(G, b, o);
    var isToday = DC.iso(o) === DC.iso(DC.todayParts());

    $("r-caption").textContent = L.caption(isToday, fmt(onN));
    $("r-years").textContent = nf.format(a.y);
    $("r-sub").textContent = L.sub(a, nf);

    var last = DC.addMonths(G, b, a.y * 12), next = DC.addMonths(G, b, (a.y + 1) * 12);
    var lastN = G.toDays(last.y, last.m, last.d), nextN = G.toDays(next.y, next.m, next.d);
    DC.renderRuler($("r-ruler"), a, L.ruler(a, dfShort.format(DC.dateObj(lastN)), dfShort.format(DC.dateObj(nextN))));
    $("r-ruler").setAttribute("aria-label", L.rulerLabel(a));

    var nb = DC.nextBirthday(G, b, o);
    var note = $("r-note");
    if (nb && nb.isToday && a.y > 0) {
      note.hidden = false; note.className = "callout ok";
      note.innerHTML = "<p>" + DC.esc(L.birthdayToday(a.y)) + "</p>";
    } else note.hidden = true;

    var rows = L.rows({ a: a, b: b, o: o, bn: bn, onN: onN, nb: nb, nf: nf, fmt: fmt, sign: zodiac(b.m, b.d),
      weekday: function (n) { return wf.format(DC.dateObj(n)); } });
    $("r-stats").innerHTML = rows.map(function (r) {
      return "<div><dt>" + DC.esc(r[0]) + "</dt><dd>" + DC.esc(r[1]) + "</dd></div>";
    }).join("");

    result.setAttribute("data-state", "ready");
    share = { dob: DC.iso(b), on: isToday ? "" : DC.iso(o) };
  }

  var p = DC.readParams();
  on.set(DC.parseIso(p.on) || DC.todayParts());
  var pd = DC.parseIso(p.dob);
  if (pd) dob.set(pd);

  dob.on(update);
  DC.autoReveal(dob, result, t.change);
  on.on(update);
  $("reset-today").addEventListener("click", function () { on.set(DC.todayParts()); update(); });
  $("copy").addEventListener("click", function () { DC.copyLink(this, t.copied, share); });
  update();
})();
