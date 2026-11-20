import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// Create sandbox context with standard globals
const ctx = {
  console, Intl, Date, Math, JSON, String, Number, Object, Array, URLSearchParams,
  globalThis: null,
  location: { origin: "https://www.ageason.com", pathname: "/experience-calculator/", href: "https://www.ageason.com/experience-calculator/", search: "" }
};
ctx.globalThis = ctx;
ctx.window = ctx;
vm.createContext(ctx);

// Run datecore.js, experience.js, and birth-year.js in context
vm.runInContext(fs.readFileSync(path.join(root, "src/static/assets/js/datecore.js"), "utf8"), ctx);
vm.runInContext(fs.readFileSync(path.join(root, "src/static/assets/js/experience.js"), "utf8"), ctx);
vm.runInContext(fs.readFileSync(path.join(root, "src/static/assets/js/birth-year.js"), "utf8"), ctx);

const { calculateStint, aggregateExperience, calculateGapsAndOverlaps, calculateBirthYear, getGeneration, getChineseZodiac, calculateDaysAlive } = ctx;

test("Experience Calculator: single stint inclusive date math", () => {
  // Join 2021-01-01, Leave 2021-01-31 inclusive -> exactly 1 month, 0 days, 31 calendar days
  const s1 = calculateStint({ y: 2021, m: 1, d: 1 }, { y: 2021, m: 1, d: 31 }, true);
  assert.equal(s1.y, 0);
  assert.equal(s1.m, 1);
  assert.equal(s1.d, 0);
  assert.equal(s1.days, 31);

  // Join 2020-01-01, Leave 2020-12-31 inclusive (leap year) -> exactly 1 year, 0 months, 0 days, 366 days
  const s2 = calculateStint({ y: 2020, m: 1, d: 1 }, { y: 2020, m: 12, d: 31 }, true);
  assert.equal(s2.y, 1);
  assert.equal(s2.m, 0);
  assert.equal(s2.d, 0);
  assert.equal(s2.days, 366);

  // Relieving date before joining date returns null
  assert.equal(calculateStint({ y: 2022, m: 5, d: 1 }, { y: 2022, m: 4, d: 30 }, true), null);
});

test("Experience Calculator: multi-employment aggregation without borrowing errors", () => {
  // Job 1: 1 year, 7 months, 20 days (e.g. 597 days)
  // Job 2: 2 years, 8 months, 25 days (e.g. 999 days)
  // Days: 20 + 25 = 45 -> 1 month, 15 days
  // Months: 7 + 8 + 1 = 16 -> 1 year, 4 months
  // Years: 1 + 2 + 1 = 4 years
  // Result: 4 years, 4 months, 15 days
  const stints = [
    { y: 1, m: 7, d: 20, days: 597, start: { y: 2018, m: 1, d: 1 }, end: { y: 2019, m: 8, d: 20 } },
    { y: 2, m: 8, d: 25, days: 999, start: { y: 2020, m: 1, d: 1 }, end: { y: 2022, m: 9, d: 25 } }
  ];
  const total = aggregateExperience(stints);
  assert.equal(total.y, 4);
  assert.equal(total.m, 4);
  assert.equal(total.d, 15);
  assert.equal(total.totalDays, 1596);
  assert.ok(total.workingHours > 0);
});

test("Experience Calculator: gap and overlap detection", () => {
  const stintsWithGap = [
    { start: { y: 2019, m: 1, d: 1 }, end: { y: 2020, m: 12, d: 31 }, y: 2, m: 0, d: 0, days: 731 },
    { start: { y: 2021, m: 3, d: 1 }, end: { y: 2022, m: 12, d: 31 }, y: 1, m: 10, d: 0, days: 670 }
  ];
  const gapsRes = calculateGapsAndOverlaps(stintsWithGap);
  assert.equal(gapsRes.overlaps.length, 0);
  assert.equal(gapsRes.gaps.length, 1);
  // Gap runs from 2021-01-01 to 2021-02-28 (59 days in non-leap 2021)
  assert.equal(gapsRes.totalGapDays, 59);
  assert.ok(gapsRes.totalGapDuration);

  // Overlap test
  const stintsWithOverlap = [
    { start: { y: 2020, m: 1, d: 1 }, end: { y: 2021, m: 6, d: 30 }, y: 1, m: 6, d: 0, days: 547 },
    { start: { y: 2021, m: 4, d: 1 }, end: { y: 2022, m: 12, d: 31 }, y: 1, m: 9, d: 0, days: 640 }
  ];
  const overlapRes = calculateGapsAndOverlaps(stintsWithOverlap);
  assert.equal(overlapRes.gaps.length, 0);
  assert.equal(overlapRes.overlaps.length, 1);
  assert.ok(overlapRes.overlaps[0].days > 0);
});

test("Birth Year Calculator: reverse lookup from age", () => {
  // Current year 2026, age 28
  // If birthday passed -> 1998
  const passed = calculateBirthYear(28, true, 2026);
  assert.equal(passed.exact, true);
  assert.equal(passed.year, 1998);

  // If birthday upcoming -> 1997
  const upcoming = calculateBirthYear(28, false, 2026);
  assert.equal(upcoming.exact, true);
  assert.equal(upcoming.year, 1997);

  // If unknown -> range 1997 to 1998
  const unknown = calculateBirthYear(28, null, 2026);
  assert.equal(unknown.exact, false);
  assert.equal(unknown.minYear, 1997);
  assert.equal(unknown.maxYear, 1998);
  assert.equal(unknown.text, "1997 or 1998");
});

test("Birth Year Calculator: generational cohorts and Chinese zodiac", () => {
  assert.ok(getGeneration(2025).includes("Generation Beta"));
  assert.ok(getGeneration(2015).includes("Generation Alpha"));
  assert.ok(getGeneration(2000).includes("Generation Z"));
  assert.ok(getGeneration(1990).includes("Millennial"));
  assert.ok(getGeneration(1975).includes("Generation X"));
  assert.ok(getGeneration(1955).includes("Baby Boomer"));
  assert.ok(getGeneration(1935).includes("Silent Generation"));

  // 1998 was Year of the Tiger
  assert.equal(getChineseZodiac(1998), "Tiger");
  // 1997 was Year of the Ox
  assert.equal(getChineseZodiac(1997), "Ox");
  // 2024 was Year of the Dragon
  assert.equal(getChineseZodiac(2024), "Dragon");
});

test("Birth Year Calculator: days alive and milestone targets", () => {
  // Born 2000-01-01, on 2026-01-01 -> 26 years (including leap years 2000, 2004, 2008, 2012, 2016, 2020, 2024: 7 leap days)
  // 26 * 365 + 7 = 9497 days
  const res = calculateDaysAlive({ y: 2000, m: 1, d: 1 }, { y: 2026, m: 1, d: 1 });
  assert.equal(res.daysLived, 9497);
  assert.equal(res.hoursLived, 9497 * 24);
  assert.equal(res.bornWeekday, "Saturday");
  assert.equal(res.exactAge.y, 26);
  assert.equal(res.exactAge.m, 0);
  assert.equal(res.exactAge.d, 0);

  // Next milestone for 9497 days should be 10,000 days
  assert.ok(res.nextMilestone);
  assert.equal(res.nextMilestone.days, 10000);
  assert.equal(res.nextMilestone.daysRemaining, 10000 - 9497);
});

test("Hallmark compliance: zero dashes and hero sentence <= 12 words", () => {
  const pages = [
    ["Experience Calculator", path.join(root, "src/pages/experience-calculator.html")],
    ["Birth Year Calculator", path.join(root, "src/pages/birth-year-calculator.html")]
  ];

  for (const [name, filePath] of pages) {
    const raw = fs.readFileSync(filePath, "utf8");

    // Title check in meta block
    const metaMatch = raw.match(/<!--meta\s*(\{[\s\S]*?\})\s*-->/);
    assert.ok(metaMatch, `${name} has valid meta JSON`);
    const meta = JSON.parse(metaMatch[1]);

    assert.ok(!meta.title.includes("—"), `${name} title has em-dash`);
    assert.ok(!meta.title.includes("–"), `${name} title has en-dash`);
    assert.ok(!meta.title.includes(" - "), `${name} title has spaced hyphen as dash`);
    assert.ok(!meta.title.includes("-"), `${name} title contains hyphen`);

    assert.ok(!meta.description.includes("—"), `${name} description has em-dash`);
    assert.ok(!meta.description.includes("–"), `${name} description has en-dash`);
    assert.ok(!meta.description.includes(" - "), `${name} description has spaced hyphen as dash`);

    // Body content check (outside html comments)
    const bodyOnly = raw.replace(/<!--[\s\S]*?-->/g, "");
    assert.ok(!bodyOnly.includes("—"), `${name} body contains em-dash`);
    assert.ok(!bodyOnly.includes("–"), `${name} body contains en-dash`);
    assert.ok(!bodyOnly.includes(" - "), `${name} body contains spaced hyphen as dash`);

    // Lede word count check <= 12 words
    const ledeMatch = raw.match(/<p class="lede">(.*?)<\/p>/);
    assert.ok(ledeMatch, `${name} has lede paragraph`);
    const wordCount = ledeMatch[1].trim().split(/\s+/).length;
    assert.ok(wordCount <= 12, `${name} lede has ${wordCount} words (> 12)`);
  }
});
