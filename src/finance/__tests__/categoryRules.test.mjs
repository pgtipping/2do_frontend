import assert from "node:assert/strict";
import { test } from "node:test";

import {
  findCategoryRuleForTransaction,
  getCategoryRuleText,
  normalizeCategoryRuleText,
} from "../categoryRules.js";

test("normalizer strips TD DBCRD AUT auth codes", () => {
  const month1 = normalizeCategoryRuleText(
    "DBCRD PUR AP, *****31261027731, AUT 020325 VISA DDA PUR AP EMF K LOVE 800 525 5683 * CA"
  );
  const month2 = normalizeCategoryRuleText(
    "DBCRD PUR AP, *****31261027731, AUT 040525 VISA DDA PUR AP EMF K LOVE 800 525 5683 * CA"
  );

  assert.equal(month1, month2);
  assert.ok(!month1.includes("020325"));
  assert.ok(!month1.includes("040525"));
  assert.ok(month1.includes("EMF K LOVE"));
});

test("normalizer strips per-transfer Zelle reference codes", () => {
  const send1 = normalizeCategoryRuleText(
    "TD ZELLE SENT, 503500P0LARU Zelle JUSTUS GEORGE"
  );
  const send2 = normalizeCategoryRuleText(
    "TD ZELLE SENT, 612400X8WQZB Zelle JUSTUS GEORGE"
  );

  assert.equal(send1, send2);
  assert.ok(!send1.includes("503500P0LARU"));
  assert.ok(send1.includes("JUSTUS GEORGE"));
});

test("normalizer preserves merchant card number and phone digits", () => {
  const normalized = normalizeCategoryRuleText(
    "DBCRD PUR AP, *****31261027731, AUT 020325 VISA DDA PUR AP WALMART COM 8009256278 800 966 6546 * AR"
  );

  // 11-digit masked card number stays (distinguishes accounts).
  assert.ok(normalized.includes("31261027731"));
  // Phone digit groups stay (distinguish merchants).
  assert.ok(normalized.includes("800 966 6546"));
  // Merchant name stays.
  assert.ok(normalized.includes("WALMART COM"));
});

test("learned rule matches a same-merchant transaction with a different AUT code", () => {
  const savedRule = {
    id: "rule_emf",
    categoryId: "cat_groceries",
    matchText: getCategoryRuleText({
      rawNarration:
        "DBCRD PUR AP, *****31261027731, AUT 020325 VISA DDA PUR AP EMF K LOVE 800 525 5683 * CA",
    }),
    archivedAt: null,
  };
  const nextMonthTransaction = {
    rawNarration:
      "DBCRD PUR AP, *****31261027731, AUT 040525 VISA DDA PUR AP EMF K LOVE 800 525 5683 * CA",
  };

  const match = findCategoryRuleForTransaction([savedRule], nextMonthTransaction);

  assert.ok(match, "expected the rule to match a same-merchant charge with a different AUT code");
  assert.equal(match.categoryId, "cat_groceries");
});

test("legacy rules stored with AUT codes still match new transactions after re-normalization", () => {
  // A rule saved BEFORE the normalizer fix (matchText carries the auth
  // code). Re-normalization at lookup time should strip it.
  const legacyRule = {
    id: "rule_emf_legacy",
    categoryId: "cat_groceries",
    matchText:
      "DBCRD PUR AP 31261027731 AUT 020325 VISA DDA PUR AP EMF K LOVE 800 525 5683 CA",
    archivedAt: null,
  };
  const nextMonthTransaction = {
    rawNarration:
      "DBCRD PUR AP, *****31261027731, AUT 040525 VISA DDA PUR AP EMF K LOVE 800 525 5683 * CA",
  };

  const match = findCategoryRuleForTransaction([legacyRule], nextMonthTransaction);

  assert.ok(match, "expected pre-fix legacy rule to match via re-normalization");
  assert.equal(match.categoryId, "cat_groceries");
});

test("normalizer strips in-description month tokens so subscription text generalizes", () => {
  const january = normalizeCategoryRuleText(
    "DBCRD PUR AP, *****31261027731, AUT 020325 VISA DDA PUR AP CURSOR USAGE JAN CURSOR COM * NY"
  );
  const february = normalizeCategoryRuleText(
    "DBCRD PUR AP, *****31261027731, AUT 030325 VISA DDA PUR AP CURSOR USAGE FEB CURSOR COM * NY"
  );
  const fullName = normalizeCategoryRuleText(
    "DBCRD PUR AP, *****31261027731, AUT 040325 VISA DDA PUR AP CURSOR USAGE MARCH CURSOR COM * NY"
  );

  assert.equal(january, february);
  assert.equal(january, fullName);
  assert.ok(!january.includes("JAN"));
  assert.ok(!january.includes("FEB"));
  assert.ok(!january.includes("MARCH"));
  assert.ok(january.includes("CURSOR"));
});

test("month-token strip preserves words that merely contain a month abbreviation", () => {
  // "JUNIOR" contains "JUN", "MARSHALL" contains "MAR", "MAYTAG"
  // contains "MAY", "AUGUSTA" contains "AUG" — all should survive.
  const normalized = normalizeCategoryRuleText(
    "JUNIOR MARSHALL MAYTAG AUGUSTA PLAZA"
  );

  assert.ok(normalized.includes("JUNIOR"));
  assert.ok(normalized.includes("MARSHALL"));
  assert.ok(normalized.includes("MAYTAG"));
  assert.ok(normalized.includes("AUGUSTA"));
});

test("different merchants do not collide", () => {
  const emfRule = {
    id: "rule_emf",
    categoryId: "cat_a",
    matchText: getCategoryRuleText({
      rawNarration:
        "DBCRD PUR AP, *****31261027731, AUT 020325 VISA DDA PUR AP EMF K LOVE 800 525 5683 * CA",
    }),
    archivedAt: null,
  };
  const walmartTransaction = {
    rawNarration:
      "DBCRD PUR AP, *****31261027731, AUT 040525 VISA DDA PUR AP WALMART COM 8009256278 800 966 6546 * AR",
  };

  const match = findCategoryRuleForTransaction([emfRule], walmartTransaction);

  assert.equal(match, null, "EMF K LOVE rule should not match a Walmart charge");
});
