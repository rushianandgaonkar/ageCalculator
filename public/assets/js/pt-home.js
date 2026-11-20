/* pt-home.js: Brazilian Portuguese strings and result rows for age-l10n.js (Calculadora de idade). */
(function () {
  function pl(nf, n, one, many) { return nf.format(n) + " " + (n === 1 ? one : many); }
  window.AGE_L10N = {
    locale: "pt-BR",
    t: {
      errYear: "Digite um ano entre 1800 e 2200.",
      errDate: "Essa data não existe no calendário. Confira o dia e o mês.",
      errOrder: "A data de nascimento não pode ser depois da data de referência.",
      change: "Alterar data de nascimento",
      copied: "Link copiado"
    },
    signs: ["Aquário", "Peixes", "Áries", "Touro", "Gêmeos", "Câncer", "Leão", "Virgem", "Libra", "Escorpião", "Sagitário", "Capricórnio"],
    caption: function (isToday, onText) { return isToday ? "Sua idade exata hoje" : "Sua idade em " + onText; },
    sub: function (a, nf) { return pl(nf, a.m, "mês", "meses") + " e " + pl(nf, a.d, "dia", "dias"); },
    ruler: function (a, last, next) {
      return "<span><b>" + a.y + "</b> anos (" + last + ")</span><span><b>" + (a.y + 1) + "</b> anos (" + next + ")</span>";
    },
    rulerLabel: function (a) { return a.m + " de 12 meses até completar " + (a.y + 1) + " anos"; },
    birthdayToday: function (y) { return "Feliz aniversário! Hoje você completa " + y + " anos."; },
    rows: function (c) {
      var a = c.a, nf = c.nf, nb = c.nb;
      var next = !nb ? "Desconhecido" : nb.isToday ? "Hoje é seu aniversário!" : c.fmt(nb.dayNum) + " (faltam " + pl(nf, nb.days, "dia", "dias") + ")";
      return [
        ["Data de nascimento", c.weekday(c.bn) + ", " + c.fmt(c.bn)],
        ["Próximo aniversário", next],
        ["Signo do zodíaco", this.signs[c.sign]],
        ["Idade em meses", pl(nf, a.months, "mês", "meses") + (a.d ? " e " + pl(nf, a.d, "dia", "dias") : "")],
        ["Idade em semanas", pl(nf, Math.floor(a.days / 7), "semana", "semanas") + (a.days % 7 ? " e " + pl(nf, a.days % 7, "dia", "dias") : "")],
        ["Dias vividos", pl(nf, a.days, "dia", "dias")],
        ["Horas vividas", nf.format(a.days * 24) + " horas"],
        ["Minutos vividos", nf.format(a.days * 1440) + " minutos"]
      ];
    }
  };
})();
