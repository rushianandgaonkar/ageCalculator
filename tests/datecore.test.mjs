// Unit tests for the date maths in src/static/assets/js/datecore.js (+ bs-data.js).
// Run from the project folder:   node --test tests/datecore.test.mjs
// Needs Node 18+ (built-in test runner and full ICU, which includes the Umm al-Qura calendar).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ctx = { console, Intl, Date, Math, JSON, String, Number, Object, Array, URLSearchParams, globalThis: null, location: { origin: "https://www.example.com", pathname: "/ar/", href: "https://www.example.com/ar/", search: "" } };
ctx.globalThis = ctx; ctx.window = ctx;
vm.createContext(ctx);
for (const f of ["datecore.js", "bs-data.js"]) vm.runInContext(fs.readFileSync(path.join(root, "src/static/assets/js", f), "utf8"), ctx);
const DC = ctx.DC, G = DC.Gregorian, H = DC.Hijri;

const g = (s) => { const [y, m, d] = s.split("-").map(Number); return { y, m, d }; };
const gd = (s) => { const x = g(s); return G.toDays(x.y, x.m, x.d); };
const age = (a, b) => { const r = DC.age(G, g(a), g(b)); return r && [r.y, r.m, r.d]; };
const hOf = (s) => { const h = H.fromDays(gd(s)); return `${h.y}-${h.m}-${h.d}`; };

/* ---------------- Gregorian ---------------- */
test("leap years follow the Gregorian rule (1900 no, 2000 yes, 2100 no)", () => {
  assert.equal(DC.isLeap(1900), false);
  assert.equal(DC.isLeap(2000), true);
  assert.equal(DC.isLeap(2024), true);
  assert.equal(DC.isLeap(2026), false);
  assert.equal(DC.isLeap(2100), false);
});

test("impossible dates are rejected", () => {
  assert.equal(G.toDays(2023, 2, 29), null);
  assert.equal(G.toDays(1900, 2, 29), null);
  assert.equal(G.toDays(2026, 4, 31), null);
  assert.equal(G.toDays(2026, 13, 1), null);
  assert.equal(G.toDays(2026, 0, 10), null);
  assert.notEqual(G.toDays(2024, 2, 29), null);
});

test("basic age in years, months and days", () => {
  assert.deepEqual(age("1994-08-15", "2026-11-10"), [32, 2, 26]);
  assert.deepEqual(age("2000-01-01", "2000-01-01"), [0, 0, 0]);
  assert.deepEqual(age("1990-11-11", "2026-11-10"), [35, 11, 30]); // day before the birthday
  assert.deepEqual(age("1990-11-10", "2026-11-10"), [36, 0, 0]);   // on the birthday
});

test("29 February birthdays: 28 February counts in non-leap years", () => {
  assert.deepEqual(age("2000-02-29", "2001-02-28"), [1, 0, 0]);
  assert.deepEqual(age("2000-02-29", "2001-02-27"), [0, 11, 29]);
  assert.deepEqual(age("2000-02-29", "2004-02-29"), [4, 0, 0]);
  const nb = DC.nextBirthday(G, g("2000-02-29"), g("2026-03-01"));
  assert.deepEqual([nb.date.y, nb.date.m, nb.date.d, nb.days], [2027, 2, 28, 364]);
  const leap = DC.nextBirthday(G, g("2000-02-29"), g("2027-03-01"));
  assert.deepEqual([leap.date.y, leap.date.m, leap.date.d], [2028, 2, 29]);
});

test("month ends: a missing day uses the last day of the month", () => {
  assert.deepEqual(age("2026-01-31", "2026-02-28"), [0, 1, 0]);
  assert.deepEqual(age("2026-01-31", "2026-03-01"), [0, 1, 1]);
  assert.deepEqual(age("2026-03-31", "2026-04-30"), [0, 1, 0]);
  assert.deepEqual(age("2024-01-31", "2024-02-29"), [0, 1, 0]);
});

test("future birth dates give no result", () => {
  assert.equal(DC.age(G, g("2030-01-01"), g("2026-01-01")), null);
});

test("total days count every leap day", () => {
  assert.equal(DC.age(G, g("2024-01-01"), g("2025-01-01")).days, 366);
  assert.equal(DC.age(G, g("2023-01-01"), g("2024-01-01")).days, 365);
  assert.equal(DC.age(G, g("2000-01-01"), g("2026-01-01")).days, 9497);
});

test("next birthday today and countdown", () => {
  const t = DC.nextBirthday(G, g("1990-11-10"), g("2026-11-10"));
  assert.equal(t.isToday, true); assert.equal(t.days, 0); assert.equal(t.turning, 36);
  const n = DC.nextBirthday(G, g("1990-11-11"), g("2026-11-10"));
  assert.equal(n.days, 1); assert.equal(n.turning, 36);
});

test("30-day test-manual method", () => {
  assert.deepEqual({ ...DC.age30(g("2018-05-20"), g("2026-11-08")) }, { y: 8, m: 5, d: 18 });
});

test("randomised: months + leftover days always rebuild the exact day count", () => {
  for (let i = 0; i < 5000; i++) {
    const an = gd("1920-01-01") + Math.floor(Math.random() * 38000), bn = an + Math.floor(Math.random() * 30000);
    const a = DC.fromUtcDays(an), b = DC.fromUtcDays(bn), r = DC.age(G, a, b);
    assert.ok(r.m >= 0 && r.m < 12 && r.d >= 0 && r.d <= 31);
    const anchor = DC.addMonths(G, a, r.months);
    assert.equal(G.toDays(anchor.y, anchor.m, anchor.d) + r.d, bn);
  }
});

/* ---------------- Hijri (Umm al-Qura) ---------------- */
test("the engine uses the Umm al-Qura calendar", () => {
  assert.equal(H.supported(), true);
  assert.equal(H.calendarName(), "islamic-umalqura");
  assert.equal(H.isFallback(), false);
});

test("known Saudi Umm al-Qura dates", () => {
  assert.equal(hOf("2024-03-11"), "1445-9-1");   // 1 Ramadan 1445
  assert.equal(hOf("2024-04-10"), "1445-10-1");  // 1 Shawwal 1445 (Eid al-Fitr)
  assert.equal(hOf("2024-06-16"), "1445-12-10"); // 10 Dhu al-Hijjah 1445 (Eid al-Adha)
  assert.equal(hOf("2024-07-07"), "1446-1-1");   // 1 Muharram 1446
  assert.equal(hOf("2025-03-01"), "1446-9-1");   // 1 Ramadan 1446
  assert.equal(hOf("2025-03-30"), "1446-10-1");  // 1 Shawwal 1446
  assert.equal(hOf("2025-06-26"), "1447-1-1");   // 1 Muharram 1447
});

test("Hijri to Gregorian conversion matches the anchors", () => {
  assert.equal(H.toDays(1445, 9, 1), gd("2024-03-11"));
  assert.equal(H.toDays(1447, 1, 1), gd("2025-06-26"));
});

test("supported Umm al-Qura range: 1 Muharram 1300 to 30 Dhu al-Hijjah 1600", () => {
  assert.equal(H.toDays(1300, 1, 1), gd("1882-11-12"));
  assert.equal(H.toDays(1600, 12, 30), gd("2174-11-25"));
});

test("Hijri official range check covers 1882-11-12 through 2174-11-25", () => {
  assert.equal(H.minDays, gd("1882-11-12"));
  assert.equal(H.maxDays, gd("2174-11-25"));
  assert.equal(H.inRange(gd("1882-11-11")), false);
  assert.equal(H.inRange(gd("1882-11-12")), true);
  assert.equal(H.inRange(gd("2174-11-25")), true);
  assert.equal(H.inRange(gd("2174-11-26")), false);
  assert.equal(H.inRange(null), false);
});

test("every Umm al-Qura month has 29 or 30 days and every year 354 or 355", () => {
  for (let y = 1300; y <= 1599; y++) {
    let len = 0;
    for (let m = 1; m <= 12; m++) {
      const dm = H.dim(y, m);
      assert.ok(dm === 29 || dm === 30, `${y}/${m} has ${dm}`);
      len += dm;
    }
    assert.ok(len === 354 || len === 355, `${y} has ${len}`);
    assert.equal(H.toDays(y + 1, 1, 1) - H.toDays(y, 1, 1), len);
  }
});

test("a 30th day in a 29-day month is rejected", () => {
  let y = 1446, m = 1;
  while (H.dim(y, m) !== 29) m++;
  assert.equal(H.toDays(y, m, 30), null);
  assert.notEqual(H.toDays(y, m, 29), null);
});

test("Gregorian ↔ Hijri round trip for every 3rd day, 1882–2174", () => {
  for (let n = gd("1882-11-12"); n <= gd("2174-11-25"); n += 3) {
    const h = H.fromDays(n);
    assert.equal(H.toDays(h.y, h.m, h.d), n);
  }
});

test("Hijri age and Hijri birthday on a 30th", () => {
  const b = H.fromDays(gd("1994-08-15")), on = H.fromDays(gd("2026-11-10"));
  const r = DC.age(H, b, on);
  assert.ok(r.y === 33 && r.m >= 0 && r.m < 12);
  // born on a 30th: in a 29-day month the birthday falls on the 29th
  let y = 1440, m = 1; while (H.dim(y, m) !== 30) m++;
  let y2 = 1446; while (H.dim(y2, m) !== 29) y2++;
  const nb = DC.nextBirthday(H, { y, m, d: 30 }, { y: y2, m, d: 1 });
  assert.deepEqual([nb.date.y, nb.date.m, nb.date.d], [y2, m, 29]);
});

/* ---------------- Digits ---------------- */
test("Arabic-Indic, Persian, Devanagari and full-width digits are accepted", () => {
  assert.equal(DC.toLatinDigits("١٩٩٤/٠٨/١٥"), "1994/08/15");
  assert.equal(DC.toLatinDigits("۱۹۹۴"), "1994");
  assert.equal(DC.toLatinDigits("२०८३"), "2083");
  assert.equal(DC.toLatinDigits("１９９４"), "1994");
  assert.equal(DC.toDigits("1994", "arab"), "١٩٩٤");
});

test("shareUrl formats query parameters without modifying location", () => {
  assert.equal(DC.shareUrl({ dob: "1994-08-15", on: "" }), "https://www.example.com/ar/?dob=1994-08-15");
  assert.equal(DC.shareUrl({}), "https://www.example.com/ar/");
});
