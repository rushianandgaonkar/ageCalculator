/* id-date.js: Indonesian strings for date-l10n.js (Hitung hari dan kalkulator tanggal). */
window.DATE_L10N = {
  locale: "id-ID",
  units: { days: "hari", businessDays: "hari kerja", weeks: "minggu", months: "bulan", years: "tahun" },
  t: {
    errYear: "Masukkan tahun antara 1800 dan 2200.",
    errDate: "Tanggal ini tidak ada di kalender.",
    between: function (a, b) { return a + " sampai " + b; },
    inclusive: "(termasuk hari terakhir)",
    calendar: "Dalam kalender",
    ymd: function (c, nf) {
      var p = [];
      if (c.y) p.push(nf.format(c.y) + " tahun");
      if (c.m) p.push(nf.format(c.m) + " bulan");
      if (c.d || !p.length) p.push(nf.format(c.d) + " hari");
      return p.join(", ");
    },
    weeks: "Minggu dan hari",
    business: "Hari kerja",
    businessNote: "hari (Senin sampai Jumat)",
    weekend: "Hari akhir pekan",
    weekendNote: "hari (Sabtu dan Minggu)",
    hours: "Total jam",
    minutes: "Total menit",
    pctYear: "Porsi dari satu tahun",
    targetFuture: "Tanggal hasil",
    targetPast: "Tanggal di masa lalu",
    offset: function (base, amt, add) { return amt + (add ? " setelah " : " sebelum ") + base; },
    weekday: "Hari",
    dayOfYear: "Hari ke dalam tahun",
    dayOfYearText: function (d, total) { return "hari ke " + d + " dari " + total; },
    isoWeek: "Minggu ke (ISO)",
    relToday: "Dari hari ini",
    today: "Hari ini",
    rel: function (n, future) { return future ? n + " hari lagi" : n + " hari yang lalu"; },
    year: "Tahun",
    leap: "(tahun kabisat)",
    common: "(tahun biasa)",
    copied: "Tautan disalin"
  },
  // countdown: how many days from today until the later date
  extraDiff: function (c) {
    var d = c.hi - c.todayN;
    return [["Berapa hari lagi dari hari ini", d === 0 ? "Hari ini" : d > 0 ? c.nf.format(d) + " hari lagi (" + c.fmt(c.hi) + ")" : "Sudah lewat " + c.nf.format(-d) + " hari"]];
  }
};
