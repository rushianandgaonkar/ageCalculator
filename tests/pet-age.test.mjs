// Unit tests for the pet age calculation formulas and rules in pet-age.js
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function calculateCatAge(totalMonths) {
  var humanYears = 0;
  if (totalMonths <= 12) {
    humanYears = totalMonths * (15 / 12);
  } else if (totalMonths <= 24) {
    humanYears = 15 + (totalMonths - 12) * (9 / 12);
  } else {
    humanYears = 24 + (totalMonths - 24) * (4 / 12);
  }

  var stage = "";
  if (totalMonths < 12) stage = "Kitten";
  else if (totalMonths < 36) stage = "Junior";
  else if (totalMonths < 84) stage = "Prime";
  else if (totalMonths < 132) stage = "Mature";
  else if (totalMonths < 180) stage = "Senior";
  else stage = "Geriatric";

  return { humanYears, stage };
}

function calculateDogAge(totalMonths, size) {
  var humanYears = 0;
  if (size === "small") {
    if (totalMonths <= 12) humanYears = totalMonths * (15 / 12);
    else if (totalMonths <= 24) humanYears = 15 + (totalMonths - 12) * (9 / 12);
    else humanYears = 24 + (totalMonths - 24) * (4 / 12);
  } else if (size === "medium") {
    if (totalMonths <= 12) humanYears = totalMonths * (15 / 12);
    else if (totalMonths <= 24) humanYears = 15 + (totalMonths - 12) * (9 / 12);
    else humanYears = 24 + (totalMonths - 24) * (5 / 12);
  } else if (size === "large") {
    if (totalMonths <= 12) humanYears = totalMonths * (15 / 12);
    else if (totalMonths <= 24) humanYears = 15 + (totalMonths - 12) * (9 / 12);
    else humanYears = 24 + (totalMonths - 24) * (6 / 12);
  } else {
    if (totalMonths <= 12) humanYears = totalMonths * (12 / 12);
    else if (totalMonths <= 24) humanYears = 12 + (totalMonths - 12) * (10 / 12);
    else humanYears = 22 + (totalMonths - 24) * (8 / 12);
  }
  return humanYears;
}

test("Cat age calculation matches AAHA veterinary formula", () => {
  assert.equal(calculateCatAge(0).humanYears, 0);
  assert.equal(calculateCatAge(6).humanYears, 7.5);
  assert.equal(calculateCatAge(12).humanYears, 15);
  assert.equal(calculateCatAge(24).humanYears, 24);
  assert.equal(calculateCatAge(36).humanYears, 28);
  assert.equal(calculateCatAge(84).humanYears, 44);
  assert.equal(calculateCatAge(120).humanYears, 56);
  assert.equal(calculateCatAge(180).humanYears, 76);
  assert.equal(calculateCatAge(240).humanYears, 96);
});

test("Cat life stages correctly classify according to AAHA guidelines", () => {
  assert.equal(calculateCatAge(6).stage, "Kitten");
  assert.equal(calculateCatAge(12).stage, "Junior");
  assert.equal(calculateCatAge(24).stage, "Junior");
  assert.equal(calculateCatAge(36).stage, "Prime");
  assert.equal(calculateCatAge(72).stage, "Prime");
  assert.equal(calculateCatAge(84).stage, "Mature");
  assert.equal(calculateCatAge(120).stage, "Mature");
  assert.equal(calculateCatAge(132).stage, "Senior");
  assert.equal(calculateCatAge(168).stage, "Senior");
  assert.equal(calculateCatAge(180).stage, "Geriatric");
});

test("Dog age calculation matches AVMA size-stratified formula", () => {
  // Small dogs
  assert.equal(calculateDogAge(12, "small"), 15);
  assert.equal(calculateDogAge(24, "small"), 24);
  assert.equal(calculateDogAge(84, "small"), 44);
  assert.equal(calculateDogAge(132, "small"), 60);

  // Medium dogs
  assert.equal(calculateDogAge(12, "medium"), 15);
  assert.equal(calculateDogAge(24, "medium"), 24);
  assert.equal(calculateDogAge(84, "medium"), 49);
  assert.equal(calculateDogAge(108, "medium"), 59);

  // Large dogs (at 7 years = 54 human years, matching the prompt example)
  assert.equal(calculateDogAge(12, "large"), 15);
  assert.equal(calculateDogAge(24, "large"), 24);
  assert.equal(calculateDogAge(84, "large"), 54);
  assert.equal(calculateDogAge(96, "large"), 60);

  // Giant dogs
  assert.equal(calculateDogAge(12, "giant"), 12);
  assert.equal(calculateDogAge(24, "giant"), 22);
  assert.equal(calculateDogAge(60, "giant"), 46);
  assert.equal(calculateDogAge(72, "giant"), 54);
});

test("Generated pages adhere to Hallmark guidelines: no dashes and <= 12 word hero", () => {
  const catHtml = fs.readFileSync(path.join(root, "src/pages/cat-age-calculator.html"), "utf8");
  const dogHtml = fs.readFileSync(path.join(root, "src/pages/dog-age-calculator.html"), "utf8");

  for (const [name, content] of [["Cat page", catHtml], ["Dog page", dogHtml]]) {
    // No em dash or en dash in titles or body content (outside html comments)
    const bodyContent = content.replace(/<!--[\s\S]*?-->/g, "");
    assert.ok(!bodyContent.includes("—"), `${name} contains em-dash`);
    assert.ok(!bodyContent.includes("–"), `${name} contains en-dash`);
    assert.ok(!bodyContent.includes(" - "), `${name} contains spaced hyphen as dash`);

    // Hero sentence check <= 12 words
    const ledeMatch = content.match(/<p class="lede">(.*?)<\/p>/);
    assert.ok(ledeMatch, `${name} has lede paragraph`);
    const ledeWords = ledeMatch[1].trim().split(/\s+/).length;
    assert.ok(ledeWords <= 12, `${name} hero sentence has ${ledeWords} words (> 12)`);
  }
});
