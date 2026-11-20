import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Load generation.js
const genScript = fs.readFileSync(path.join(ROOT, "src/static/assets/js/generation.js"), "utf8");
const sandbox = { window: {}, document: { readyState: "complete", addEventListener: () => {} } };
const fn = new Function("global", "window", "document", genScript);
fn(sandbox, sandbox.window, sandbox.document);
const { getGeneration, getCusp, GENERATIONS, CUSPS } = sandbox.GenerationLogic || sandbox.window.GenerationLogic;

test("Generation ranges and age bounds in 2026", () => {
  // Gen Alpha: 2013 to 2024 (Ages 2 to 13 in 2026)
  const alphaStart = getGeneration(2013);
  const alphaEnd = getGeneration(2024);
  assert.equal(alphaStart.id, "alpha");
  assert.equal(alphaEnd.id, "alpha");
  assert.equal(alphaStart.minAge2026, 2);
  assert.equal(alphaStart.maxAge2026, 13);

  // Gen Z: 1997 to 2012 (Ages 14 to 29 in 2026)
  const zStart = getGeneration(1997);
  const zEnd = getGeneration(2012);
  assert.equal(zStart.id, "z");
  assert.equal(zEnd.id, "z");
  assert.equal(zStart.minAge2026, 14);
  assert.equal(zStart.maxAge2026, 29);

  // Millennials: 1981 to 1996 (Ages 30 to 45 in 2026)
  const milStart = getGeneration(1981);
  const milEnd = getGeneration(1996);
  assert.equal(milStart.id, "millennial");
  assert.equal(milEnd.id, "millennial");
  assert.equal(milStart.minAge2026, 30);
  assert.equal(milStart.maxAge2026, 45);

  // Gen X: 1965 to 1980 (Ages 46 to 61 in 2026)
  const xStart = getGeneration(1965);
  const xEnd = getGeneration(1980);
  assert.equal(xStart.id, "x");
  assert.equal(xEnd.id, "x");
  assert.equal(xStart.minAge2026, 46);
  assert.equal(xStart.maxAge2026, 61);

  // Baby Boomers: 1946 to 1964 (Ages 62 to 80 in 2026)
  const boomStart = getGeneration(1946);
  const boomEnd = getGeneration(1964);
  assert.equal(boomStart.id, "boomer");
  assert.equal(boomEnd.id, "boomer");
  assert.equal(boomStart.minAge2026, 62);
  assert.equal(boomStart.maxAge2026, 80);

  // Silent Generation: 1928 to 1945 (Ages 81 to 98 in 2026)
  const silStart = getGeneration(1928);
  const silEnd = getGeneration(1945);
  assert.equal(silStart.id, "silent");
  assert.equal(silEnd.id, "silent");
  assert.equal(silStart.minAge2026, 81);
  assert.equal(silStart.maxAge2026, 98);

  // Greatest Generation: 1901 to 1927 (Ages 99 to 125 in 2026)
  const greatStart = getGeneration(1901);
  const greatEnd = getGeneration(1927);
  assert.equal(greatStart.id, "greatest");
  assert.equal(greatEnd.id, "greatest");
  assert.equal(greatStart.minAge2026, 99);
  assert.equal(greatStart.maxAge2026, 125);
});

test("Micro-generation and cusp detection", () => {
  // 2010 to 2015: Zalpha
  assert.equal(getCusp(2010)?.name, "Zalpha");
  assert.equal(getCusp(2012)?.name, "Zalpha");
  assert.equal(getCusp(2015)?.name, "Zalpha");

  // 1993 to 1998: Zillennial
  assert.equal(getCusp(1993)?.name, "Zillennial");
  assert.equal(getCusp(1996)?.name, "Zillennial");
  assert.equal(getCusp(1998)?.name, "Zillennial");

  // 1977 to 1983: Xennial
  assert.equal(getCusp(1977)?.name, "Xennial");
  assert.equal(getCusp(1980)?.name, "Xennial");
  assert.equal(getCusp(1983)?.name, "Xennial");

  // 1954 to 1965: Generation Jones
  assert.equal(getCusp(1954)?.name, "Generation Jones");
  assert.equal(getCusp(1960)?.name, "Generation Jones");
  assert.equal(getCusp(1965)?.name, "Generation Jones");

  // Non-cusp years
  assert.equal(getCusp(1990), null);
  assert.equal(getCusp(2005), null);
  assert.equal(getCusp(1972), null);
  assert.equal(getCusp(1948), null);
});

test("HTML and Hallmark constraints on generation-calculator", () => {
  const htmlPath = path.join(ROOT, "public/generation-calculator/index.html");
  assert.ok(fs.existsSync(htmlPath), "public/generation-calculator/index.html must exist");
  const html = fs.readFileSync(htmlPath, "utf8");

  // Route and basic metadata
  assert.ok(html.includes("<title>Generation Calculator: What Generation Am I by Birth Year | Ageason</title>"), "Title matches requirement");
  assert.ok(html.includes("Find your generation name, age range and birth years."), "Description matches requirement");

  // Hero sentence <= 12 words
  const ledeMatch = html.match(/<p class="lede">(.*?)<\/p>/);
  assert.ok(ledeMatch, "Hero lede paragraph exists");
  const ledeText = ledeMatch[1].replace(/<[^>]+>/g, "").trim();
  const wordCount = ledeText.split(/\s+/).length;
  assert.ok(wordCount <= 12, `Hero sentence must be <= 12 words (got ${wordCount}: "${ledeText}")`);

  // Zero dashes in titles and headings
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/);
  assert.ok(h1Match && !/[-–—]/.test(h1Match[1]), "H1 must have zero dashes");
  const h2Matches = [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/g)];
  for (const m of h2Matches) {
    assert.ok(!/[-–—]/.test(m[1]), `H2 "${m[1]}" must have zero dashes`);
  }

  // Schema.org validation
  assert.ok(html.includes('"@type": "WebApplication"'), "WebApplication schema present");
  assert.ok(html.includes('"@type": "FAQPage"'), "FAQPage schema present");

  // Zero dashes in visible text across the document (outside script/style/svg/noscript/attributes)
  const bodyWithoutCode = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");

  // Extract visible text between tags
  const textMatches = bodyWithoutCode.match(/>([^<]+)</g) || [];
  for (const m of textMatches) {
    const txt = m.slice(1, -1).trim();
    if (txt && /[-–—]/.test(txt)) {
      assert.fail(`Visible text contains a dash: "${txt}"`);
    }
  }

  // Presence of key FAQ questions
  assert.ok(html.includes("What generation am I if born in 1996?"));
  assert.ok(html.includes("What is the millennial age range in 2026?"));
  assert.ok(html.includes("What are the Gen Z birth years?"));
  assert.ok(html.includes("Who are Generation Alpha?"));

  // Scripts
  assert.ok(html.includes("/assets/js/datecore.js"));
  assert.ok(html.includes("/assets/js/generation.js"));
});
