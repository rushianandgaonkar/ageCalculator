/* tr-home.js: Turkish age calculator with zodiac and birthday countdown. */
(function () {
  "use strict";
  var G = DC.Gregorian;
  var $ = function (id) { return document.getElementById(id); };
  var dob = new DC.DateField($("dob"));
  var on = new DC.DateField($("on"));
  var result = $("result");
  var nf = new Intl.NumberFormat("tr-TR");
  var df = new Intl.DateTimeFormat("tr-TR", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
  var dfShort = new Intl.DateTimeFormat("tr-TR", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
  var wf = new Intl.DateTimeFormat("tr-TR", { timeZone: "UTC", weekday: "long" });
  var share = null;

  function fmt(dayNum) { return df.format(DC.dateObj(dayNum)); }
  function fmtShort(dayNum) { return dfShort.format(DC.dateObj(dayNum)); }

  function getZodiac(m, d) {
    if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return { name: "Koç", element: "Ateş" };
    if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return { name: "Boğa", element: "Toprak" };
    if ((m === 5 && d >= 21) || (m === 6 && d <= 20)) return { name: "İkizler", element: "Hava" };
    if ((m === 6 && d >= 21) || (m === 7 && d <= 22)) return { name: "Yengeç", element: "Su" };
    if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return { name: "Aslan", element: "Ateş" };
    if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return { name: "Başak", element: "Toprak" };
    if ((m === 9 && d >= 23) || (m === 10 && d <= 22)) return { name: "Terazi", element: "Hava" };
    if ((m === 10 && d >= 23) || (m === 11 && d <= 21)) return { name: "Akrep", element: "Su" };
    if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return { name: "Yay", element: "Ateş" };
    if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return { name: "Oğlak", element: "Toprak" };
    if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return { name: "Kova", element: "Hava" };
    return { name: "Balık", element: "Su" };
  }

  function validate(field, label) {
    if (field.isEmpty()) { field.error(""); return null; }
    var v = field.get();
    if (!v) { field.error(""); return null; }
    if (v.y < 1800 || v.y > 2200) { field.error("Lütfen 1800 ile 2200 arasında geçerli bir yıl girin."); return null; }
    if (G.toDays(v.y, v.m, v.d) === null) { field.error("Girdiğiniz " + label + " takvimde bulunmuyor. Gün ve ayı kontrol edin."); return null; }
    field.error("");
    return v;
  }

  function update() {
    share = null;
    var b = validate(dob, "tarih");
    var o = validate(on, "tarih");
    if (!b || !o) { result.setAttribute("data-state", "empty"); return; }
    var bn = G.toDays(b.y, b.m, b.d), onN = G.toDays(o.y, o.m, o.d);
    if (bn > onN) {
      dob.error("Doğum tarihi, hesaplama tarihinden sonraki bir gün olamaz.");
      result.setAttribute("data-state", "empty");
      return;
    }
    var a = DC.age(G, b, o);
    var isToday = DC.iso(o) === DC.iso(DC.todayParts());

    $("r-caption").textContent = isToday ? "Bugünkü tam yaşınız" : fmt(onN) + " tarihindeki yaşınız";
    $("r-years").textContent = nf.format(a.y);
    $("r-years-unit").textContent = "yaşında";
    $("r-sub").textContent = nf.format(a.m) + " ay, " + nf.format(a.d) + " gün";

    var last = DC.addMonths(G, b, a.y * 12), next = DC.addMonths(G, b, (a.y + 1) * 12);
    var lastN = G.toDays(last.y, last.m, last.d), nextN = G.toDays(next.y, next.m, next.d);
    DC.renderRuler($("r-ruler"), a,
      "<span><b>" + a.y + "</b> yaş (" + fmtShort(lastN) + ")</span><span><b>" + (a.y + 1) + "</b> yaş (" + fmtShort(nextN) + ")</span>");
    $("r-ruler").setAttribute("aria-label", a.m + " ay tamamlandı, " + (a.y + 1) + " yaş yolculuğu");

    var nb = DC.nextBirthday(G, b, o);
    var note = $("r-note");
    if (nb && nb.isToday && a.y > 0) {
      note.hidden = false; note.className = "callout ok";
      note.innerHTML = "<p>Doğum gününüz kutlu olsun! " + a.y + ". yaşınızı doldurdunuz.</p>";
    } else note.hidden = true;

    var weeks = Math.floor(a.days / 7), wd = a.days % 7;
    var zodiac = getZodiac(b.m, b.d);
    var nextBdayText = "Belirlenemedi";
    if (nb) {
      if (nb.isToday) nextBdayText = "Bugün doğum gününüz!";
      else nextBdayText = fmt(nb.dayNum) + " (" + nf.format(nb.days) + " gün kaldı)";
    }

    var rows = [
      ["Doğum tarihi", fmt(bn) + " " + wf.format(DC.dateObj(bn))],
      ["Sonraki doğum günü", nextBdayText],
      ["Doldurulan yaş", nf.format(a.y) + " tam yaş"],
      ["Gün alınan yaş", nf.format(a.y + 1) + " yaştan gün alınıyor"],
      ["Burç", zodiac.name + " (" + zodiac.element + " grubu)"],
      ["Toplam süre (ay)", nf.format(a.months) + " ay" + (a.d ? ", " + nf.format(a.d) + " gün" : "")],
      ["Toplam süre (hafta)", nf.format(weeks) + " hafta" + (wd ? ", " + nf.format(wd) + " gün" : "")],
      ["Toplam gün", nf.format(a.days) + " gün"],
      ["Toplam saat", nf.format(a.days * 24) + " saat"],
      ["Toplam dakika", nf.format(a.days * 1440) + " dakika"]
    ];
    $("r-stats").innerHTML = rows.map(function (r) {
      return "<div><dt>" + r[0] + "</dt><dd>" + DC.esc(r[1]) + "</dd></div>";
    }).join("");

    result.setAttribute("data-state", "ready");
    share = { dob: DC.iso(b), on: isToday ? "" : DC.iso(o) };
  }

  var p = DC.readParams();
  on.set(DC.parseIso(p.on) || DC.todayParts());
  var pd = DC.parseIso(p.dob);
  if (pd) dob.set(pd);

  dob.on(update);
  DC.autoReveal(dob, result, "Doğum tarihini değiştir");
  on.on(update);
  $("reset-today").addEventListener("click", function () { on.set(DC.todayParts()); update(); });
  $("copy").addEventListener("click", function () { DC.copyLink(this, "Bağlantı kopyalandı", share); });
  update();
})();
