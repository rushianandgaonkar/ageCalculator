/* de-home.js: German strings and result rows for age-l10n.js (Altersrechner). */
(function () {
  function pl(nf, n, one, many) { return nf.format(n) + " " + (n === 1 ? one : many); }
  window.AGE_L10N = {
    locale: "de-DE",
    t: {
      errYear: "Bitte ein Jahr zwischen 1800 und 2200 eingeben.",
      errDate: "Dieses Datum gibt es im Kalender nicht. Bitte Tag und Monat prüfen.",
      errOrder: "Das Geburtsdatum darf nicht nach dem Stichtag liegen.",
      change: "Geburtsdatum ändern",
      copied: "Link kopiert"
    },
    signs: ["Wassermann", "Fische", "Widder", "Stier", "Zwillinge", "Krebs", "Löwe", "Jungfrau", "Waage", "Skorpion", "Schütze", "Steinbock"],
    caption: function (isToday, onText) { return isToday ? "Ihr genaues Alter heute" : "Ihr Alter am " + onText; },
    sub: function (a, nf) { return pl(nf, a.m, "Monat", "Monate") + ", " + pl(nf, a.d, "Tag", "Tage"); },
    ruler: function (a, last, next) {
      return "<span><b>" + a.y + "</b> Jahre (" + last + ")</span><span><b>" + (a.y + 1) + "</b> Jahre (" + next + ")</span>";
    },
    rulerLabel: function (a) { return a.m + " von 12 Monaten bis zum " + (a.y + 1) + ". Geburtstag"; },
    birthdayToday: function (y) { return "Alles Gute zum Geburtstag! Heute werden Sie " + y + "."; },
    rows: function (c) {
      var a = c.a, nf = c.nf, nb = c.nb;
      var next = !nb ? "Unbekannt" : nb.isToday ? "Heute ist Ihr Geburtstag!" : c.fmt(nb.dayNum) + " (noch " + pl(nf, nb.days, "Tag", "Tage") + ")";
      return [
        ["Geburtsdatum", c.weekday(c.bn) + ", " + c.fmt(c.bn)],
        ["Nächster Geburtstag", next],
        ["Sternzeichen", this.signs[c.sign]],
        ["Alter in Monaten", pl(nf, a.months, "Monat", "Monate") + (a.d ? ", " + pl(nf, a.d, "Tag", "Tage") : "")],
        ["Alter in Wochen", pl(nf, Math.floor(a.days / 7), "Woche", "Wochen") + (a.days % 7 ? ", " + pl(nf, a.days % 7, "Tag", "Tage") : "")],
        ["Gelebte Tage", pl(nf, a.days, "Tag", "Tage")],
        ["Gelebte Stunden", nf.format(a.days * 24) + " Stunden"],
        ["Gelebte Minuten", nf.format(a.days * 1440) + " Minuten"]
      ];
    }
  };
})();
