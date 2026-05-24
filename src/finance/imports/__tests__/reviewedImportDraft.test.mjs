import assert from "node:assert/strict";
import { test } from "node:test";

import { createReviewedImportDraft } from "../reviewedImportDraft.js";

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
