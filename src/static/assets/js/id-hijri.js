/* id-hijri.js: Indonesian Hijri and Gregorian converter and 12 month calendar table. */
(function () {
  "use strict";
  var G = DC.Gregorian, H = DC.Hijri;
  var $ = function (id) { return document.getElementById(id); };

  var GM = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  var HM = ["Muharram", "Safar", "Rabiul Awal", "Rabiul Akhir", "Jumadil Awal", "Jumadil Akhir", "Rajab", "Syaban", "Ramadan", "Syawal", "Zulkaidah", "Zulhijah"];

  var hijriOK = H.supported();
  var mode = "h2g";
  var field = new DC.DateField($("dob"));
  var result = $("result");

  var nf = new Intl.NumberFormat("id-ID");
  var df = new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
  var wf = new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", weekday: "long" });

  var copyText = "";
  var share = null;
  var activeHym = null;
  var tableYear = 1448;

  function fmt(dayNum) { return df.format(DC.dateObj(dayNum)); }
  function cal() { return mode === "h2g" ? H : G; }
  function todayN() { var t = DC.todayParts(); return G.toDays(t.y, t.m, t.d); }
  function hijriWords(h) { return nf.format(h.d) + " " + HM[h.m - 1] + " " + h.y + " H"; }
  function dottedDate(y, m, d) { return DC.pad(d) + "." + DC.pad(m) + "." + y; }

  function fillMonths() {
    var sel = field.parts.m, cur = sel.value, names = mode === "h2g" ? HM : GM;
    var html = '<option value="">Pilih bulan</option>';
    for (var i = 0; i < 12; i++) {
      html += '<option value="' + (i + 1) + '">' + names[i] + " (bulan ke " + nf.format(i + 1) + ")</option>";
    }
    sel.innerHTML = html;
    sel.value = cur;
  }

  function showToday() {
    var n = todayN();
    if (!hijriOK || !H.inRange(n)) {
      $("today-id").innerHTML = "<span>Hari ini</span><strong>" + DC.esc(wf.format(DC.dateObj(n)) + ", " + fmt(n)) + "</strong>";
      return;
    }
    var h = H.fromDays(n);
    tableYear = h.y;
    $("today-id").innerHTML = "<span>Hari ini</span><strong>" + DC.esc(wf.format(DC.dateObj(n)) + ", " + hijriWords(h)) + "</strong>" +
      "<span>" + DC.esc(fmt(n)) + " M</span>";
  }

  function renderYearTable(hy) {
    if (!hijriOK) return;
    hy = Math.max(1300, Math.min(1600, hy));
    tableYear = hy;
    $("tbl-year").textContent = hy;
    if (document.activeElement !== $("table-year")) $("table-year").value = String(hy);

    var total = 0, html = "";
    for (var m = 1; m <= 12; m++) {
      var len = H.dim(hy, m);
      total += len;
      var sN = H.toDays(hy, m, 1), eN = sN + len - 1;
      var cls = activeHym && activeHym.y === hy && activeHym.m === m ? ' class="is-you"' : "";
      html += "<tr" + cls + "><td>" + nf.format(m) + ". " + HM[m - 1] + "</td><td>" + nf.format(len) + " hari</td><td>" +
        DC.esc(fmt(sN)) + "</td><td>" + DC.esc(fmt(eN)) + "</td></tr>";
    }
    $("months-body").innerHTML = html;
    $("year-summary").textContent = "Tahun " + hy + " H berlangsung " + nf.format(total) + " hari (" +
      (total === 355 ? "tahun kabisat" : "tahun biasa") + ").";
    $("prev-year").disabled = hy <= 1300;
    $("next-year").disabled = hy >= 1600;
  }

  function validate() {
    if (!hijriOK) { field.error("Browser Anda tidak mendukung data kalender hijriyah."); return null; }
    if (field.isEmpty()) { field.error(""); return null; }
    var v = field.get();
    if (!v) { field.error(""); return null; }
    if (mode === "h2g" && (v.y < 1300 || v.y > 1600)) {
      field.error("Masukkan tahun hijriyah antara 1300 dan 1600.");
      return null;
    }
    var n = cal().toDays(v.y, v.m, v.d);
    if (n === null) { field.error("Tanggal ini tidak ada di kalender. Periksa tanggal dan bulan."); return null; }
    if (!H.inRange(n)) {
      field.error("Kalender Umm al Qura mendukung tahun 1300 sampai 1600 H.");
      return null;
    }
    field.error("");
    return n;
  }

  function update() {
    share = null;
    var n = validate();
    if (n === null) {
      activeHym = null;
      result.setAttribute("data-state", "empty");
      renderYearTable(tableYear);
      return;
    }

    var h = H.fromDays(n), g = G.fromDays(n), diff = n - todayN();
    var rel = diff === 0 ? "Hari ini" : (diff > 0 ? nf.format(diff) + " hari lagi" : nf.format(-diff) + " hari yang lalu");
    var wd = wf.format(DC.dateObj(n));
    var gText = fmt(n);
    var hText = hijriWords(h);

    if (mode === "h2g") {
      $("r-caption").textContent = "Tanggal masehi untuk " + hText;
      $("r-main").textContent = gText;
      copyText = gText;
    } else {
      $("r-caption").textContent = "Tanggal hijriyah untuk " + gText;
      $("r-main").textContent = hText;
      copyText = hText;
    }
    $("r-sub").textContent = wd;
    $("copy-date").textContent = "Salin tanggal: " + copyText;

    var rows = [
      ["Tanggal hijriyah", hText],
      ["Tanggal hijriyah (angka)", dottedDate(h.y, h.m, h.d)],
      ["Tanggal masehi", gText],
      ["Tanggal masehi (angka)", dottedDate(g.y, g.m, g.d)],
      ["Hari", wd],
      ["Dari hari ini", rel],
      ["Jumlah hari bulan hijriyah ini", nf.format(H.dim(h.y, h.m)) + " hari"]
    ];
    $("r-stats").innerHTML = rows.map(function (r) {
      return "<div><dt>" + r[0] + "</dt><dd>" + DC.esc(r[1]) + "</dd></div>";
    }).join("");

    $("to-age").href = "/id/?dob=" + DC.iso(g);
    result.setAttribute("data-state", "ready");

    activeHym = { y: h.y, m: h.m };
    renderYearTable(h.y);

    share = {
      dir: mode,
      d: String(mode === "h2g" ? h.d : g.d),
      m: String(mode === "h2g" ? h.m : g.m),
      y: String(mode === "h2g" ? h.y : g.y)
    };
  }

  function setMode(newMode) {
    if (mode === newMode) return;
    mode = newMode;
    $("date-legend").textContent = mode === "h2g" ? "Tanggal hijriyah" : "Tanggal masehi";
    fillMonths();
    update();
  }

  document.querySelectorAll('input[name="dir"]').forEach(function (radio) {
    radio.addEventListener("change", function () {
      setMode(this.value);
    });
  });

  field.on(update);
  DC.autoReveal(field, result, "Ubah tanggal");

  $("use-today").addEventListener("click", function () {
    var n = todayN();
    if (mode === "h2g") {
      var h = H.fromDays(n);
      if (h) field.set(h);
    } else {
      var g = G.fromDays(n);
      if (g) field.set(g);
    }
    update();
  });

  $("prev-year").addEventListener("click", function () {
    renderYearTable(tableYear - 1);
  });
  $("next-year").addEventListener("click", function () {
    renderYearTable(tableYear + 1);
  });
  $("table-year").addEventListener("input", function () {
    var v = parseInt(this.value, 10);
    if (!isNaN(v) && v >= 1300 && v <= 1600) renderYearTable(v);
  });

  $("copy-date").addEventListener("click", function () {
    var btn = this;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(copyText).then(function () {
        var note = btn.parentNode.querySelector(".copied");
        if (note) { note.textContent = "Disalin"; setTimeout(function () { note.textContent = ""; }, 2500); }
      });
    }
  });

  $("copy").addEventListener("click", function () {
    DC.copyLink(this, "Tautan disalin", share);
  });

  // Init
  if (!hijriOK) {
    $("hijri-unsupported").hidden = false;
  } else if (H.isFallback()) {
    $("hijri-fallback").hidden = false;
  }

  fillMonths();
  showToday();

  var p = DC.readParams();
  if (p.dir === "g2h") {
    var g2hRadio = $("dir-g2h");
    if (g2hRadio) g2hRadio.checked = true;
    mode = "g2h";
    $("date-legend").textContent = "Tanggal masehi";
    fillMonths();
  }

  if (p.y && p.m && p.d) {
    field.set({ y: parseInt(p.y, 10), m: parseInt(p.m, 10), d: parseInt(p.d, 10) });
  } else {
    var n = todayN();
    if (mode === "h2g") {
      var h = H.fromDays(n);
      if (h) field.set(h);
    } else {
      var g = G.fromDays(n);
      if (g) field.set(g);
    }
  }

  renderYearTable(tableYear);
  update();
})();
