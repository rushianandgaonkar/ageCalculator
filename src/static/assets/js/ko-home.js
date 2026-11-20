/* ko-home.js: Korean strings and result rows for age-l10n.js (만 나이 계산기).
   만 나이 = completed years (legal age since June 2023), 연 나이 = year difference, 세는나이 = year difference + 1. */
(function () {
  var TTI = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];
  var MILESTONES = [100, 1000, 5000, 10000, 15000, 20000, 25000, 30000];
  window.AGE_L10N = {
    locale: "ko-KR",
    t: {
      errYear: "1800년에서 2200년 사이의 연도를 입력하세요.",
      errDate: "달력에 없는 날짜입니다. 월과 일을 확인하세요.",
      errOrder: "생년월일은 기준일보다 늦을 수 없습니다.",
      change: "생년월일 변경",
      copied: "링크가 복사되었습니다"
    },
    caption: function (isToday, onText) { return isToday ? "오늘 기준 법적 만 나이" : onText + " 기준 만 나이"; },
    sub: function (a, nf) { return nf.format(a.m) + "개월 " + nf.format(a.d) + "일"; },
    ruler: function (a, last, next) {
      return "<span>만 <b>" + a.y + "</b>세 (" + last + ")</span><span>만 <b>" + (a.y + 1) + "</b>세 (" + next + ")</span>";
    },
    rulerLabel: function (a) { return "만 " + (a.y + 1) + "세까지 12개월 중 " + a.m + "개월 지남"; },
    birthdayToday: function (y) { return "생일 축하합니다! 오늘 만 " + y + "세가 되었습니다."; },
    rows: function (c) {
      var a = c.a, nf = c.nf, nb = c.nb, yd = c.o.y - c.b.y;
      var next = !nb ? "알 수 없음" : nb.isToday ? "오늘이 생일입니다" : "D-" + nf.format(nb.days) + " (" + c.fmt(nb.dayNum) + ")";
      // Korean counting: the birth day is day 1, so day N falls on birth + (N - 1)
      var ms = MILESTONES.filter(function (m) { return m > a.days + 1; })[0];
      var rows = [
        ["법적 만 나이", "만 " + nf.format(a.y) + "세"],
        ["연 나이", nf.format(yd) + "세 (기준 연도에서 출생 연도를 뺀 나이)"],
        ["세는나이", nf.format(yd + 1) + "세 (태어나자마자 1세로 세는 나이)"],
        ["띠", TTI[((c.b.y - 4) % 12 + 12) % 12] + "띠 (" + c.b.y + "년생)"],
        ["생년월일", c.fmt(c.bn) + " " + c.weekday(c.bn)],
        ["다음 생일 디데이", next],
        ["태어난 지", nf.format(a.days + 1) + "일째 (" + nf.format(a.days) + "일 지남)"],
        ["총 개월 수", nf.format(a.months) + "개월"],
        ["총 시간", nf.format(a.days * 24) + "시간"]
      ];
      if (ms) rows.push(["다음 기념일", "태어난 지 " + nf.format(ms) + "일: " + c.fmt(c.bn + ms - 1) + " (D-" + nf.format(ms - 1 - a.days) + ")"]);
      return rows;
    }
  };
})();
