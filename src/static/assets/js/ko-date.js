/* ko-date.js: Korean strings for date-l10n.js (날짜 및 디데이 계산기).
   D-day anniversaries use the Korean convention: the start day is day 1, so 100일 = start + 99 days. */
(function () {
  var DDAYS = [100, 200, 300, 500, 1000];
  window.DATE_L10N = {
    locale: "ko-KR",
    sep: "",
    defaultSpan: 99,
    units: { days: "일", businessDays: "영업일", weeks: "주", months: "개월", years: "년" },
    t: {
      errYear: "1800년에서 2200년 사이의 연도를 입력하세요.",
      errDate: "달력에 없는 날짜입니다.",
      between: function (a, b) { return a + "부터 " + b + "까지"; },
      inclusive: "(시작일 포함)",
      calendar: "달력 기준",
      ymd: function (c, nf) {
        var p = [];
        if (c.y) p.push(nf.format(c.y) + "년");
        if (c.m) p.push(nf.format(c.m) + "개월");
        if (c.d || !p.length) p.push(nf.format(c.d) + "일");
        return p.join(" ");
      },
      weeks: "주와 일",
      business: "평일 (영업일)",
      businessNote: "일 (월요일부터 금요일)",
      weekend: "주말",
      weekendNote: "일 (토요일과 일요일)",
      hours: "총 시간",
      minutes: "총 분",
      pctYear: "1년 중 비율",
      targetFuture: "계산된 날짜",
      targetPast: "계산된 지난 날짜",
      offset: function (base, amt, add) { return base + (add ? " 기준 " + amt + " 후" : " 기준 " + amt + " 전"); },
      weekday: "요일",
      dayOfYear: "연중 일차",
      dayOfYearText: function (d, total) { return total + "일 중 " + d + "일째"; },
      isoWeek: "ISO 주차",
      relToday: "오늘 기준",
      today: "오늘 (D-Day)",
      rel: function (n, future) { return future ? "D-" + n : "D+" + n; },
      year: "연도",
      leap: "(윤년)",
      common: "(평년)",
      copied: "링크가 복사되었습니다"
    },
    extraDiff: function (c) {
      var rows = [], d = c.hi - c.todayN;
      rows.push(["끝 날짜 디데이", d === 0 ? "D-Day" : d > 0 ? "D-" + c.nf.format(d) : "D+" + c.nf.format(-d)]);
      DDAYS.forEach(function (n) {
        var day = c.lo + n - 1, rel = day - c.todayN;
        rows.push(["시작일부터 " + c.nf.format(n) + "일", c.fmt(day) + " " + c.weekday(day) + " (" + (rel === 0 ? "D-Day" : rel > 0 ? "D-" + c.nf.format(rel) : "지남") + ")"]);
      });
      return rows;
    }
  };
})();
