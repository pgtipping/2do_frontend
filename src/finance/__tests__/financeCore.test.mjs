import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createAccount,
  createCategoryRule,
  createCategory,
  createDefaultFinanceData,
  createTransaction,
} from "../domain.js";
import { calculateMonthlySummary } from "../reports.js";
import {
  createFinanceRepository,
  createMemoryStorageDriver,
} from "../storage/localFinanceStore.js";
import {
  findCategoryRuleForTransaction,
  normalizeCategoryRuleText,
} from "../categoryRules.js";

test("default finance data starts with sync-ready collections", () => {
  const data = createDefaultFinanceData();

  assert.equal(data.schemaVersion, 1);
  assert.deepEqual(Object.keys(data).sort(), [
    "accounts",
    "categories",
    "categoryRules",
    "importBatches",
    "schemaVersion",
    "subscriptions",
    "transactions",
  ]);
});

test("category rules normalize bank narration for future matching", () => {
  const rule = createCategoryRule({
    createId: () => "rule_geico",
    now: () => "2026-05-24T06:00:00.000Z",
    categoryId: "cat_insurance",
    sourceText: "ELECTRONICPMT-WEB GEICO  128.44",
  });
  const match = findCategoryRuleForTransaction([rule], {
    rawNarration: "ElectronicPmt-Web   GEICO",
  });

  assert.equal(
    normalizeCategoryRuleText("ElectronicPmt-Web   GEICO"),
    "ELECTRONICPMT WEB GEICO"
  );
  assert.equal(match.categoryId, "cat_insurance");
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

test("repository saves reviewed import batches with created and duplicate counts", async () => {
  const repository = createFinanceRepository({
    driver: createMemoryStorageDriver(),
    now: () => "2026-05-24T06:00:00.000Z",
    createId: (prefix) => `${prefix}_fixed`,
  });
  const transaction = createTransaction({
    createId: repository.createId,
    now: repository.now,
    accountId: "acct_1",
    date: "2025-01-02",
    description: "WALMART STORE",
    amount: -42.91,
    type: "expense",
    source: "td_bank_pdf",
    rawNarration: "WALMART STORE",
    importFingerprint: "td-walmart-2025-01-02-42.91",
  });
  await repository.saveTransaction(transaction);

  const result = await repository.saveReviewedImport({
    importBatch: {
      id: "batch_1",
      source: "td_bank_pdf",
      importedAt: "2026-05-24T06:00:00.000Z",
      fileName: "td.pdf",
      rowCount: 2,
      createdTransactionCount: 0,
      duplicateTransactionCount: 0,
    },
    rows: [
      {
        status: "ready",
        transaction: {
          ...transaction,
          id: "txn_duplicate",
        },
      },
      {
        status: "ready",
        transaction: {
          ...transaction,
          id: "txn_new",
          description: "STOP SHOP",
          rawNarration: "STOP SHOP",
          importFingerprint: "td-stop-shop-2025-01-03-21.40",
          amount: -21.4,
        },
      },
    ],
  });
  const saved = await repository.loadData();

  assert.equal(result.createdTransactionCount, 1);
  assert.equal(result.duplicateTransactionCount, 1);
  assert.equal(saved.transactions.length, 2);
  assert.deepEqual(saved.importBatches[0], {
    id: "batch_1",
    source: "td_bank_pdf",
    importedAt: "2026-05-24T06:00:00.000Z",
    fileName: "td.pdf",
    rowCount: 2,
    createdTransactionCount: 1,
    duplicateTransactionCount: 1,
  });
});

test("repository remembers reviewed transaction labels as future import rules", async () => {
  const repository = createFinanceRepository({
    driver: createMemoryStorageDriver(),
    now: () => "2026-05-24T06:00:00.000Z",
    createId: (prefix) => `${prefix}_fixed`,
  });
  const transaction = createTransaction({
    createId: repository.createId,
    now: repository.now,
    accountId: "acct_1",
    categoryId: "cat_insurance",
    date: "2025-01-02",
    description: "ELECTRONICPMT-WEB GEICO",
    amount: -128.44,
    type: "expense",
    source: "td_bank_pdf",
    rawNarration: "ELECTRONICPMT-WEB GEICO",
    importFingerprint: "td-geico-2025-01-02-128.44",
  });

  await repository.saveReviewedImport({
    importBatch: {
      id: "batch_1",
      source: "td_bank_pdf",
      importedAt: "2026-05-24T06:00:00.000Z",
      fileName: "td.pdf",
      rowCount: 1,
      createdTransactionCount: 0,
      duplicateTransactionCount: 0,
    },
    rows: [
      {
        status: "ready",
        transaction,
      },
    ],
  });
  const saved = await repository.loadData();
  const match = findCategoryRuleForTransaction(saved.categoryRules, {
    rawNarration: "ELECTRONICPMT-WEB GEICO",
  });

  assert.equal(saved.categoryRules.length, 1);
  assert.equal(saved.categoryRules[0].categoryId, "cat_insurance");
  assert.equal(match.categoryId, "cat_insurance");
});

test("repository updates saved transactions while preserving raw bank narration", async () => {
  const repository = createFinanceRepository({
    driver: createMemoryStorageDriver(),
    now: () => "2026-05-24T06:00:00.000Z",
    createId: (prefix) => `${prefix}_fixed`,
  });
  const transaction = createTransaction({
    createId: () => "txn_rent",
    now: () => "2026-05-23T06:00:00.000Z",
    accountId: "acct_1",
    categoryId: "cat_uncategorized",
    date: "2025-01-02",
    description: "TD ZELLESENT JOHN DOE RENT PAYMENT",
    amount: -800,
    type: "transfer_to_other",
    source: "td_bank_pdf",
    rawNarration: "TD ZELLESENT JOHN DOE RENT PAYMENT",
    importFingerprint: "td-rent-2025-01-02-800",
  });

  await repository.saveTransaction(transaction);
  const result = await repository.updateTransaction("txn_rent", {
    categoryId: "cat_rent",
    description: "Rent to John",
    merchant: "John Doe",
    notes: "January rent",
    type: "expense",
  });
  const saved = await repository.loadData();

  assert.equal(result.status, "updated");
  assert.equal(saved.transactions[0].description, "Rent to John");
  assert.equal(saved.transactions[0].rawNarration, "TD ZELLESENT JOHN DOE RENT PAYMENT");
  assert.equal(saved.transactions[0].categoryId, "cat_rent");
  assert.equal(saved.transactions[0].merchant, "John Doe");
  assert.equal(saved.transactions[0].notes, "January rent");
  assert.equal(saved.transactions[0].type, "expense");
  assert.equal(saved.transactions[0].updatedAt, "2026-05-24T06:00:00.000Z");
});

test("repository updates learned category rule when edited category changes", async () => {
  const repository = createFinanceRepository({
    driver: createMemoryStorageDriver(),
    now: () => "2026-05-24T06:00:00.000Z",
    createId: (prefix) => `${prefix}_fixed`,
  });
  const transaction = createTransaction({
    createId: () => "txn_geico",
    now: () => "2026-05-23T06:00:00.000Z",
    accountId: "acct_1",
    categoryId: "cat_uncategorized",
    date: "2025-01-02",
    description: "ELECTRONICPMT-WEB GEICO",
    amount: -128.44,
    type: "expense",
    source: "td_bank_pdf",
    rawNarration: "ELECTRONICPMT-WEB GEICO",
    importFingerprint: "td-geico-2025-01-02-128.44",
  });

  await repository.saveTransaction(transaction);
  await repository.updateTransaction("txn_geico", {
    categoryId: "cat_insurance",
  });
  await repository.updateTransaction("txn_geico", {
    categoryId: "cat_bills",
  });
  const saved = await repository.loadData();
  const match = findCategoryRuleForTransaction(saved.categoryRules, {
    rawNarration: "ELECTRONICPMT-WEB GEICO",
  });

  assert.equal(saved.categoryRules.length, 1);
  assert.equal(saved.categoryRules[0].categoryId, "cat_bills");
  assert.equal(saved.categoryRules[0].updatedAt, "2026-05-24T06:00:00.000Z");
  assert.equal(match.categoryId, "cat_bills");
});

test("repository deletes saved transactions by id", async () => {
  const repository = createFinanceRepository({
    driver: createMemoryStorageDriver(),
    now: () => "2026-05-24T06:00:00.000Z",
    createId: (prefix) => `${prefix}_fixed`,
  });
  const firstTransaction = createTransaction({
    createId: () => "txn_keep",
    now: repository.now,
    accountId: "acct_1",
    date: "2025-01-02",
    description: "MOBILE DEPOSIT",
    amount: 500,
    type: "income",
  });
  const secondTransaction = createTransaction({
    createId: () => "txn_delete",
    now: repository.now,
    accountId: "acct_1",
    date: "2025-01-03",
    description: "WALMART STORE",
    amount: -42.91,
    type: "expense",
  });

  await repository.saveTransaction(firstTransaction);
  await repository.saveTransaction(secondTransaction);
  const result = await repository.deleteTransaction("txn_delete");
  const saved = await repository.loadData();

  assert.equal(result.status, "deleted");
  assert.deepEqual(
    saved.transactions.map((transactionRecord) => transactionRecord.id),
    ["txn_keep"]
  );
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
