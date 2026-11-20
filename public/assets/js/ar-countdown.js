/* ar-countdown.js: Ramadan and Eid live countdown with Umm al-Qura calculations */
(function () {
  "use strict";

  var G = DC.Gregorian, H = DC.Hijri;
  var $ = function (id) { return document.getElementById(id); };

  var HM = ["محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"];
  var GM = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  var WD = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

  var digits = DC.store.get("ac-digits") === "arab" ? "arab" : "latn";
  var pr = null;
  try { pr = new Intl.PluralRules("ar"); } catch (e) {}

  var timerId = null;
  var isEidPage = !!$("eid-switch");

  function dig(n) {
    return DC.toDigits(String(n), digits);
  }

  function pluralCategory(n) {
    if (pr) return pr.select(n);
    if (n === 0) return "zero";
    if (n === 1) return "one";
    if (n === 2) return "two";
    var mod = n % 100;
    if (mod >= 3 && mod <= 10) return "few";
    if (mod >= 11 && mod <= 99) return "many";
    return "other";
  }

  function unitLabel(unit, n) {
    var c = pluralCategory(n);
    if (unit === "day") {
      if (n === 1) return "يوم";
      if (n === 2) return "يومان";
      if (c === "few") return "أيام";
      if (c === "many") return "يومًا";
      return "يوم";
    }
    if (unit === "hour") {
      if (n === 1) return "ساعة";
      if (n === 2) return "ساعتان";
      if (c === "few") return "ساعات";
      return "ساعة";
    }
    if (unit === "minute") {
      if (n === 1) return "دقيقة";
      if (n === 2) return "دقيقتان";
      if (c === "few") return "دقائق";
      return "دقيقة";
    }
    if (unit === "second") {
      if (n === 1) return "ثانية";
      if (n === 2) return "ثانيتان";
      if (c === "few") return "ثوانٍ";
      return "ثانية";
    }
    return "";
  }

  function formatCount(unit, n) {
    var c = pluralCategory(n);
    var d = dig(n);
    if (unit === "day") {
      if (n === 1) return "يوم واحد";
      if (n === 2) return "يومان";
      if (c === "few") return d + " أيام";
      if (c === "many") return d + " يومًا";
      return d + " يوم";
    }
    if (unit === "hour") {
      if (n === 1) return "ساعة واحدة";
      if (n === 2) return "ساعتان";
      if (c === "few") return d + " ساعات";
      return d + " ساعة";
    }
    if (unit === "minute") {
      if (n === 1) return "دقيقة واحدة";
      if (n === 2) return "دقيقتان";
      if (c === "few") return d + " دقائق";
      return d + " دقيقة";
    }
    if (unit === "second") {
      if (n === 1) return "ثانية واحدة";
      if (n === 2) return "ثانيتان";
      if (c === "few") return d + " ثوانٍ";
      return d + " ثانية";
    }
    return d;
  }

  function formatPhrase(days, hours, mins, secs) {
    var parts = [];
    if (days > 0) parts.push(formatCount("day", days));
    if (hours > 0 || days > 0) parts.push(formatCount("hour", hours));
    if (mins > 0 || hours > 0 || days > 0) parts.push(formatCount("minute", mins));
    parts.push(formatCount("second", secs));
    return parts.join(" و");
  }

  function getTarget() {
    var now = new Date();
    var todayDays = G.toDays(now.getFullYear(), now.getMonth() + 1, now.getDate());
    var h = H.fromDays(todayDays);
    var hy = h ? h.y : 1448;
    var hm = h ? h.m : 6;
    var hd = h ? h.d : 1;

    var targetHy = hy;
    var targetHm = 9;
    var targetHd = 1;
    var eventName = "شهر رمضان المبارك";
    var captionText = "الوقت المتبقي حتى بداية شهر رمضان المبارك";

    if (isEidPage) {
      var isAdha = $("eid-adha") && $("eid-adha").checked;
      if (isAdha) {
        eventName = "عيد الأضحى المبارك";
        captionText = "الوقت المتبقي حتى حلول عيد الأضحى المبارك";
        targetHm = 12;
        targetHd = 10;
        if (hm > 12 || (hm === 12 && hd > 10)) {
          targetHy = hy + 1;
        }
      } else {
        eventName = "عيد الفطر المبارك";
        captionText = "الوقت المتبقي حتى حلول عيد الفطر المبارك";
        targetHm = 10;
        targetHd = 1;
        if (hm > 10 || (hm === 10 && hd > 1)) {
          targetHy = hy + 1;
        }
      }
    } else {
      if (hm > 9 || (hm === 9 && hd > 1)) {
        targetHy = hy + 1;
      }
    }

    var targetDays = H.toDays(targetHy, targetHm, targetHd);
    if (targetDays === null) {
      targetDays = todayDays + 80;
    }
    var targetG = G.fromDays(targetDays);
    var targetDate = new Date(targetG.y, targetG.m - 1, targetG.d, 0, 0, 0);

    var dayOfWeek = WD[targetDate.getDay()];
    var gregStr = dig(targetG.d) + " " + GM[targetG.m - 1] + " " + dig(targetG.y) + " م";
    var hijriStr = dig(targetHd) + " " + HM[targetHm - 1] + " " + dig(targetHy) + " هـ";

    return {
      eventName: eventName,
      captionText: captionText,
      targetHy: targetHy,
      targetHm: targetHm,
      targetHd: targetHd,
      targetG: targetG,
      targetDate: targetDate,
      dayOfWeek: dayOfWeek,
      gregStr: gregStr,
      hijriStr: hijriStr
    };
  }

  function updateStaticInfo(target) {
    if ($("r-caption")) $("r-caption").textContent = target.captionText;
    if ($("target-hijri")) $("target-hijri").textContent = target.hijriStr;
    if ($("target-greg")) $("target-greg").textContent = target.gregStr;
    if ($("target-weekday")) $("target-weekday").textContent = target.dayOfWeek;
    if ($("target-event")) $("target-event").textContent = target.eventName;
    if ($("info-greg")) $("info-greg").textContent = target.gregStr;
    if ($("info-weekday")) $("info-weekday").textContent = target.dayOfWeek;
  }

  function tick() {
    var target = getTarget();
    updateStaticInfo(target);

    var now = new Date();
    var diffMs = target.targetDate.getTime() - now.getTime();

    var daysEl = $("cd-days"), hoursEl = $("cd-hours"), minsEl = $("cd-mins"), secsEl = $("cd-secs");
    var daysLbl = $("cd-days-lbl"), hoursLbl = $("cd-hours-lbl"), minsLbl = $("cd-mins-lbl"), secsLbl = $("cd-secs-lbl");
    var summaryEl = $("cd-summary");
    var whatsappBtn = $("whatsapp");

    if (diffMs <= 0) {
      if (daysEl) daysEl.textContent = dig(0);
      if (hoursEl) hoursEl.textContent = dig(0);
      if (minsEl) minsEl.textContent = dig(0);
      if (secsEl) secsEl.textContent = dig(0);
      if (summaryEl) summaryEl.textContent = "حل موعد " + target.eventName + " المبارك، تقبل الله منا ومنكم صالح الأعمال.";
      if (whatsappBtn) {
        var msgArrived = "حل موعد " + target.eventName + "، كل عام وأنتم بخير!\n" + window.location.href;
        whatsappBtn.href = "https://api.whatsapp.com/send?text=" + encodeURIComponent(msgArrived);
      }
      return;
    }

    var totalSec = Math.floor(diffMs / 1000);
    var d = Math.floor(totalSec / 86400);
    var h = Math.floor((totalSec % 86400) / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;

    if (daysEl) daysEl.textContent = dig(d);
    if (hoursEl) hoursEl.textContent = dig(h);
    if (minsEl) minsEl.textContent = dig(m);
    if (secsEl) secsEl.textContent = dig(s);

    if (daysLbl) daysLbl.textContent = unitLabel("day", d);
    if (hoursLbl) hoursLbl.textContent = unitLabel("hour", h);
    if (minsLbl) minsLbl.textContent = unitLabel("minute", m);
    if (secsLbl) secsLbl.textContent = unitLabel("second", s);

    var phrase = formatPhrase(d, h, m, s);
    if (summaryEl) {
      summaryEl.textContent = "باقي " + phrase + " على حلول " + target.eventName + " " + dig(target.targetHy) + " هـ.";
    }

    if (whatsappBtn) {
      var shareText = "كم باقي على " + target.eventName + " " + dig(target.targetHy) + " هـ؟\n" +
        "الوقت المتبقي: " + phrase + "\n" +
        "الموافق فلكيًا: " + target.dayOfWeek + " " + target.gregStr + "\n\n" +
        "تابع العداد التنازلي المباشر:\n" + window.location.href;
      whatsappBtn.href = "https://api.whatsapp.com/send?text=" + encodeURIComponent(shareText);
    }
  }

  function initDigits() {
    var latnRadio = $("dig-latn");
    var arabRadio = $("dig-arab");
    if (latnRadio && arabRadio) {
      if (digits === "arab") arabRadio.checked = true;
      else latnRadio.checked = true;

      latnRadio.addEventListener("change", function () {
        digits = "latn";
        DC.store.set("ac-digits", digits);
        tick();
      });
      arabRadio.addEventListener("change", function () {
        digits = "arab";
        DC.store.set("ac-digits", digits);
        tick();
      });
    }
  }

  function initSwitch() {
    var fitrRadio = $("eid-fitr");
    var adhaRadio = $("eid-adha");
    if (fitrRadio) {
      fitrRadio.addEventListener("change", function () {
        tick();
      });
    }
    if (adhaRadio) {
      adhaRadio.addEventListener("change", function () {
        tick();
      });
    }
  }

  function initCopy() {
    var copyBtn = $("copy");
    var copiedSpan = document.querySelector(".copied");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var url = window.location.href;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(onCopied, onCopied);
        } else {
          var ta = document.createElement("textarea");
          ta.value = url;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          try { document.execCommand("copy"); } catch (e) {}
          document.body.removeChild(ta);
          onCopied();
        }
      });
    }

    function onCopied() {
      if (copiedSpan) {
        copiedSpan.textContent = "تم نسخ الرابط";
        setTimeout(function () {
          copiedSpan.textContent = "";
        }, 2500);
      }
    }
  }

  function start() {
    initDigits();
    initSwitch();
    initCopy();
    tick();
    if (timerId) clearInterval(timerId);
    timerId = setInterval(tick, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
