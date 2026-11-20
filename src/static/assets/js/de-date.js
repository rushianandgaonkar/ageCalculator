/* de-date.js: German strings for date-l10n.js (Datumsrechner und Tagerechner). */
window.DATE_L10N = {
  locale: "de-DE",
  units: { days: "Tage", businessDays: "Arbeitstage", weeks: "Wochen", months: "Monate", years: "Jahre" },
  t: {
    errYear: "Bitte ein Jahr zwischen 1800 und 2200 eingeben.",
    errDate: "Dieses Datum gibt es im Kalender nicht.",
    between: function (a, b) { return "Vom " + a + " bis " + b; },
    inclusive: "(inklusive Endtag)",
    calendar: "Kalendarisch",
    ymd: function (c, nf) {
      var p = [];
      if (c.y) p.push(nf.format(c.y) + (c.y === 1 ? " Jahr" : " Jahre"));
      if (c.m) p.push(nf.format(c.m) + (c.m === 1 ? " Monat" : " Monate"));
      if (c.d || !p.length) p.push(nf.format(c.d) + (c.d === 1 ? " Tag" : " Tage"));
      return p.join(", ");
    },
    weeks: "Wochen und Tage",
    business: "Arbeitstage (Werktage)",
    businessNote: "Tage (Montag bis Freitag)",
    weekend: "Wochenendtage",
    weekendNote: "Tage (Samstag und Sonntag)",
    hours: "Stunden",
    minutes: "Minuten",
    pctYear: "Anteil am Jahr",
    targetFuture: "Ergebnisdatum",
    targetPast: "Datum in der Vergangenheit",
    offset: function (base, amt, add) { return amt + (add ? " nach dem " : " vor dem ") + base; },
    weekday: "Wochentag",
    dayOfYear: "Tag im Jahr",
    dayOfYearText: function (d, total) { return d + ". von " + total + " Tagen"; },
    isoWeek: "Kalenderwoche (KW)",
    relToday: "Abstand zu heute",
    today: "Heute",
    rel: function (n, future) { return (future ? "in " : "vor ") + n + " Tagen"; },
    year: "Jahr",
    leap: "(Schaltjahr)",
    common: "(Gemeinjahr)",
    copied: "Link kopiert"
  }
};
