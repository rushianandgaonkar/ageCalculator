/* id-home.js: Indonesian strings and result rows for age-l10n.js (Kalkulator umur). */
window.AGE_L10N = {
  locale: "id-ID",
  t: {
    errYear: "Masukkan tahun antara 1800 dan 2200.",
    errDate: "Tanggal ini tidak ada di kalender. Periksa tanggal dan bulan.",
    errOrder: "Tanggal lahir tidak boleh setelah tanggal perhitungan.",
    change: "Ubah tanggal lahir",
    copied: "Tautan disalin"
  },
  signs: ["Aquarius", "Pisces", "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagitarius", "Capricorn"],
  caption: function (isToday, onText) { return isToday ? "Umur Anda hari ini" : "Umur Anda pada " + onText; },
  sub: function (a, nf) { return nf.format(a.m) + " bulan, " + nf.format(a.d) + " hari"; },
  ruler: function (a, last, next) {
    return "<span><b>" + a.y + "</b> tahun (" + last + ")</span><span><b>" + (a.y + 1) + "</b> tahun (" + next + ")</span>";
  },
  rulerLabel: function (a) { return a.m + " dari 12 bulan menuju umur " + (a.y + 1) + " tahun"; },
  birthdayToday: function (y) { return "Selamat ulang tahun! Hari ini Anda berumur " + y + " tahun."; },
  rows: function (c) {
    var a = c.a, nf = c.nf, nb = c.nb;
    var next = !nb ? "Tidak diketahui" : nb.isToday ? "Hari ini ulang tahun Anda!" : c.fmt(nb.dayNum) + " (" + nf.format(nb.days) + " hari lagi)";
    return [
      ["Tanggal lahir", c.weekday(c.bn) + ", " + c.fmt(c.bn)],
      ["Ulang tahun berikutnya", next],
      ["Zodiak", this.signs[c.sign]],
      ["Umur dalam bulan", nf.format(a.months) + " bulan" + (a.d ? ", " + nf.format(a.d) + " hari" : "")],
      ["Umur dalam minggu", nf.format(Math.floor(a.days / 7)) + " minggu" + (a.days % 7 ? ", " + nf.format(a.days % 7) + " hari" : "")],
      ["Total hari", nf.format(a.days) + " hari"],
      ["Total jam", nf.format(a.days * 24) + " jam"],
      ["Total menit", nf.format(a.days * 1440) + " menit"]
    ];
  }
};
