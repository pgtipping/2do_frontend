import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createReviewedImportDraft,
  summarizeReviewedImportSave,
} from "../reviewedImportDraft.js";
import { createCategory, createCategoryRule } from "../../domain.js";

test("save summary reports created count, duplicates, and remaining rows", () => {
  const summary = summarizeReviewedImportSave({
    createdTransactionCount: 56,
    duplicateTransactionCount: 3,
    remainingCount: 3,
  });

  assert.equal(summary.tone, "success");
  assert.equal(summary.headline, "Saved 56 transactions to your ledger.");
  assert.equal(
    summary.detail,
    "Skipped 3 duplicates. 3 rows still need a category, kept below."
  );
});

test("save summary uses singular nouns and omits empty detail", () => {
  const summary = summarizeReviewedImportSave({
    createdTransactionCount: 1,
    duplicateTransactionCount: 0,
    remainingCount: 0,
  });

  assert.equal(summary.tone, "success");
  assert.equal(summary.headline, "Saved 1 transaction to your ledger.");
  assert.equal(summary.detail, null);
});

test("save summary handles an all-duplicates save with no new rows", () => {
  const summary = summarizeReviewedImportSave({
    createdTransactionCount: 0,
    duplicateTransactionCount: 2,
    remainingCount: 1,
  });

  assert.equal(summary.tone, "neutral");
  assert.equal(
    summary.headline,
    "No new transactions — all 2 rows were already in your ledger."
  );
  assert.equal(summary.detail, "1 row still needs a category, kept below.");
});

test("creates review rows from parsed TD Bank transactions", () => {
  const draft = createReviewedImportDraft({
    accountId: "acct_checking",
    fileName: "td-january.pdf",
    now: () => "2026-05-24T10:00:00.000Z",
    createId: (prefix) => `${prefix}_fixed`,
    parsedStatement: {
      transactions: [
        {
          date: "2025-01-02",
          description: "TD ZELLESENT JOHN DOE",
          amount: -75,
          type: "transfer_to_other",
          counterpartyType: "external_person",
          confidence: "high",
          needsReview: false,
          source: "td_bank_pdf",
          rawNarration: "TD ZELLESENT JOHN DOE",
          importFingerprint: "td:2025-01-02:zelle:75.00",
        },
        {
          date: "2025-01-03",
          description: "ELECTRONICPMT-WEB CREDIT CARD",
          amount: -55,
          type: "expense",
          counterpartyType: "unknown",
          confidence: "low",
          needsReview: true,
          source: "td_bank_pdf",
          rawNarration: "ELECTRONICPMT-WEB CREDIT CARD",
          importFingerprint: "td:2025-01-03:web:55.00",
        },
      ],
      reconciliation: [
        {
          section: "Electronic Payments",
          parsedTotal: 130,
          expectedTotal: 130,
          difference: 0,
          status: "matched",
        },
      ],
    },
  });

  assert.equal(draft.importBatch.fileName, "td-january.pdf");
  assert.equal(draft.importBatch.rowCount, 2);
  assert.equal(draft.rows.length, 2);
  assert.equal(draft.rows[0].status, "ready");
  assert.equal(draft.rows[0].transaction.accountId, "acct_checking");
  assert.equal(draft.rows[0].transaction.type, "transfer_to_other");
  assert.equal(draft.rows[1].status, "needs_review");
  assert.deepEqual(draft.rows[1].reviewReasons, [
    "Parser marked this row for review.",
    "Low confidence classification.",
  ]);
});

test("applies a learned category rule to future import drafts", () => {
  const categories = [
    createCategory({
      createId: () => "cat_insurance",
      now: () => "2026-05-24T10:00:00.000Z",
      name: "Insurance",
      type: "expense",
    }),
  ];
  const categoryRules = [
    createCategoryRule({
      createId: () => "rule_geico",
      now: () => "2026-05-24T10:00:00.000Z",
      categoryId: "cat_insurance",
      sourceText: "ELECTRONICPMT-WEB GEICO",
    }),
  ];
  const draft = createReviewedImportDraft({
    accountId: "acct_checking",
    fileName: "td-february.pdf",
    now: () => "2026-05-24T10:00:00.000Z",
    createId: (prefix) => `${prefix}_fixed`,
    categories,
    categoryRules,
    parsedStatement: {
      transactions: [
        {
          date: "2025-02-02",
          description: "ELECTRONICPMT-WEB GEICO",
          amount: -128.44,
          type: "expense",
          counterpartyType: "unknown",
          confidence: "low",
          needsReview: true,
          source: "td_bank_pdf",
          rawNarration: "ELECTRONICPMT-WEB GEICO",
          importFingerprint: "td:2025-02-02:geico:128.44",
        },
      ],
      reconciliation: [],
    },
  });

  assert.equal(draft.rows[0].transaction.categoryId, "cat_insurance");
  assert.equal(draft.rows[0].categorySuggestion, "Insurance");
  assert.equal(draft.rows[0].categorySource, "learned");
});

test("marks all rows for review when statement reconciliation does not match", () => {
  const draft = createReviewedImportDraft({
    accountId: "acct_checking",
    fileName: "td-january.pdf",
    now: () => "2026-05-24T10:00:00.000Z",
    createId: (prefix) => `${prefix}_fixed`,
    parsedStatement: {
      transactions: [
        {
          date: "2025-01-02",
          description: "WALMART STORE",
          amount: -42.91,
          type: "expense",
          counterpartyType: "unknown",
          confidence: "medium",
          needsReview: false,
          source: "td_bank_pdf",
          rawNarration: "WALMART STORE",
          importFingerprint: "td:2025-01-02:walmart:42.91",
        },
      ],
      reconciliation: [
        {
          section: "Electronic Payments",
          parsedTotal: 42.91,
          expectedTotal: 50,
          difference: -7.09,
          status: "needs_review",
        },
      ],
    },
  });

  assert.equal(draft.rows[0].status, "needs_review");
  assert.deepEqual(draft.rows[0].reviewReasons, [
    "Statement totals do not match parsed rows.",
  ]);
});
