/* pt-date.js: Brazilian Portuguese strings for date-l10n.js (Calculadora de dias e datas). */
window.DATE_L10N = {
  locale: "pt-BR",
  units: { days: "dias", businessDays: "dias úteis", weeks: "semanas", months: "meses", years: "anos" },
  t: {
    errYear: "Digite um ano entre 1800 e 2200.",
    errDate: "Essa data não existe no calendário.",
    between: function (a, b) { return "De " + a + " até " + b; },
    inclusive: "(incluindo o último dia)",
    calendar: "No calendário",
    ymd: function (c, nf) {
      var p = [];
      if (c.y) p.push(nf.format(c.y) + (c.y === 1 ? " ano" : " anos"));
      if (c.m) p.push(nf.format(c.m) + (c.m === 1 ? " mês" : " meses"));
      if (c.d || !p.length) p.push(nf.format(c.d) + (c.d === 1 ? " dia" : " dias"));
      return p.join(", ");
    },
    weeks: "Semanas e dias",
    business: "Dias úteis",
    businessNote: "dias (segunda a sexta)",
    weekend: "Dias de fim de semana",
    weekendNote: "dias (sábado e domingo)",
    hours: "Total de horas",
    minutes: "Total de minutos",
    pctYear: "Parte do ano",
    targetFuture: "Data resultante",
    targetPast: "Data no passado",
    offset: function (base, amt, add) { return amt + (add ? " depois de " : " antes de ") + base; },
    weekday: "Dia da semana",
    dayOfYear: "Dia do ano",
    dayOfYearText: function (d, total) { return d + "º de " + total + " dias"; },
    isoWeek: "Semana do ano (ISO)",
    relToday: "Em relação a hoje",
    today: "Hoje",
    rel: function (n, future) { return future ? "daqui a " + n + " dias" : "há " + n + " dias"; },
    year: "Ano",
    leap: "(ano bissexto)",
    common: "(ano comum)",
    copied: "Link copiado"
  },
  // contagem regressiva: days from today until the later date
  extraDiff: function (c) {
    var d = c.hi - c.todayN;
    return [["Contagem regressiva a partir de hoje", d === 0 ? "É hoje" : d > 0 ? "Faltam " + c.nf.format(d) + " dias" : "Passaram " + c.nf.format(-d) + " dias"]];
  }
};
