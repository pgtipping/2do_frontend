import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createAccount,
  createCategory,
  createDefaultFinanceData,
  createTransaction,
} from "../domain.js";
import { calculateMonthlySummary } from "../reports.js";
import {
  createFinanceRepository,
  createMemoryStorageDriver,
} from "../storage/localFinanceStore.js";

test("default finance data starts with sync-ready collections", () => {
  const data = createDefaultFinanceData();

  assert.equal(data.schemaVersion, 1);
  assert.deepEqual(Object.keys(data).sort(), [
    "accounts",
    "categories",
    "importBatches",
    "schemaVersion",
    "subscriptions",
    "transactions",
  ]);
});

test("repository saves sync-ready account, category, and transaction records", async () => {
  const repository = createFinanceRepository({
    driver: createMemoryStorageDriver(),
    now: () => "2026-05-24T06:00:00.000Z",
    createId: (prefix) => `${prefix}_fixed`,
  });

  const account = createAccount({
    createId: repository.createId,
    now: repository.now,
    name: "TD Convenience Checking",
    institution: "TD Bank",
    openingBalance: 1250.25,
  });
  const category = createCategory({
    createId: repository.createId,
    now: repository.now,
    name: "Groceries",
    type: "expense",
    color: "#3f7d58",
  });
  const transaction = createTransaction({
    createId: repository.createId,
    now: repository.now,
    accountId: account.id,
    categoryId: category.id,
    date: "2025-01-02",
    description: "WALMART STORE",
    merchant: "Walmart",
    amount: -42.91,
    type: "expense",
    source: "td_bank_pdf",
    rawNarration: "01/02 WALMART STORE 42.91",
    importFingerprint: "td:2025-01-02:walmart:42.91",
  });

  await repository.saveAccount(account);
  await repository.saveCategory(category);
  await repository.saveTransaction(transaction);

  const saved = await repository.loadData();

  assert.equal(saved.accounts[0].syncMetadata.providerAccountId, null);
  assert.equal(saved.categories[0].archivedAt, null);
  assert.equal(saved.transactions[0].source, "td_bank_pdf");
  assert.equal(saved.transactions[0].rawNarration, "01/02 WALMART STORE 42.91");
  assert.deepEqual(saved.transactions[0].syncMetadata, {
    providerTransactionId: null,
    providerCursor: null,
    syncedAt: null,
  });
});

test("repository skips duplicate imported transactions by fingerprint", async () => {
  const repository = createFinanceRepository({
    driver: createMemoryStorageDriver(),
    now: () => "2026-05-24T06:00:00.000Z",
    createId: (prefix) => `${prefix}_${Math.random()}`,
  });
  const transaction = createTransaction({
    createId: repository.createId,
    now: repository.now,
    accountId: "acct_1",
    date: "2025-01-02",
    description: "TD ZELLESENT JOHN",
    amount: -75,
    type: "transfer_to_other",
    source: "td_bank_pdf",
    rawNarration: "TD ZELLESENT JOHN",
    importFingerprint: "td-zelle-sent-john-2025-01-02-75",
  });

  const first = await repository.saveTransaction(transaction);
  const second = await repository.saveTransaction({
    ...transaction,
    id: "txn_duplicate",
  });
  const saved = await repository.loadData();

  assert.equal(first.status, "created");
  assert.equal(second.status, "duplicate");
  assert.equal(saved.transactions.length, 1);
});

test("monthly summary counts transfers to others as spend and hides self-transfers by default", () => {
  const transactions = [
    createTransaction({
      createId: () => "txn_income",
      now: () => "2026-05-24T06:00:00.000Z",
      accountId: "acct_1",
      date: "2025-01-03",
      description: "ACHDEPOSIT PAYROLL",
      amount: 2400,
      type: "income",
    }),
    createTransaction({
      createId: () => "txn_zelle",
      now: () => "2026-05-24T06:00:00.000Z",
      accountId: "acct_1",
      date: "2025-01-04",
      description: "TD ZELLESENT RENT",
      amount: -800,
      type: "transfer_to_other",
    }),
    createTransaction({
      createId: () => "txn_self",
      now: () => "2026-05-24T06:00:00.000Z",
      accountId: "acct_1",
      date: "2025-01-05",
      description: "TRANSFER TO SAVINGS",
      amount: -300,
      type: "transfer_to_self",
    }),
  ];

  const defaultSummary = calculateMonthlySummary(transactions, {
    month: "2025-01",
  });
  const expandedSummary = calculateMonthlySummary(transactions, {
    month: "2025-01",
    includeSelfTransfers: true,
  });

  assert.equal(defaultSummary.income, 2400);
  assert.equal(defaultSummary.expenses, 800);
  assert.equal(defaultSummary.selfTransfers, 300);
  assert.equal(defaultSummary.net, 1600);
  assert.equal(expandedSummary.expenses, 1100);
});
