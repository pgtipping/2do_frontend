import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createJsonBackup,
  exportTransactionsCsv,
  restoreJsonBackup,
} from "../backup.js";
import { createDefaultFinanceData } from "../domain.js";

const financeData = {
  ...createDefaultFinanceData(),
  accounts: [
    {
      id: "acct_1",
      name: "TD Checking",
      type: "checking",
      institution: "TD Bank",
    },
  ],
  transactions: [
    {
      id: "txn_1",
      accountId: "acct_1",
      date: "2025-01-02",
      description: "WALMART, STORE",
      merchant: "Walmart",
      amount: -42.91,
      type: "expense",
      categoryId: "cat_groceries",
      source: "td_bank_pdf",
      rawNarration: "WALMART, STORE",
    },
  ],
};

test("creates and restores a versioned JSON backup", () => {
  const backup = createJsonBackup(financeData, {
    exportedAt: "2026-05-24T10:00:00.000Z",
  });
  const restored = restoreJsonBackup(backup);

  assert.equal(backup.exportedAt, "2026-05-24T10:00:00.000Z");
  assert.equal(backup.kind, "personal_finance_backup");
  assert.deepEqual(restored, financeData);
});

test("rejects backups with the wrong kind", () => {
  assert.throws(
    () => restoreJsonBackup({ kind: "other", data: financeData }),
    /Unsupported backup file/
  );
});

test("exports transactions to CSV with escaped values", () => {
  const csv = exportTransactionsCsv(financeData.transactions);

  assert.equal(
    csv,
    [
      "date,description,merchant,amount,type,categoryId,source,rawNarration",
      '2025-01-02,"WALMART, STORE",Walmart,-42.91,expense,cat_groceries,td_bank_pdf,"WALMART, STORE"',
    ].join("\n")
  );
});
