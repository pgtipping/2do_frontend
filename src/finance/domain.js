const SCHEMA_VERSION = 1;

const DEFAULT_SOURCE = "manual";

export function createDefaultFinanceData() {
  return {
    schemaVersion: SCHEMA_VERSION,
    accounts: [],
    transactions: [],
    categories: [],
    categoryRules: [],
    subscriptions: [],
    importBatches: [],
  };
}

export function createId(prefix) {
  const randomValue =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`;

  return `${prefix}_${randomValue}`;
}

export function getCurrentTimestamp() {
  return new Date().toISOString();
}

export function createAccount({
  createId: makeId = createId,
  now = getCurrentTimestamp,
  name,
  type = "checking",
  institution = null,
  openingBalance = 0,
} = {}) {
  const timestamp = now();

  return {
    id: makeId("acct"),
    name,
    type,
    institution,
    openingBalance,
    syncMetadata: {
      providerAccountId: null,
      providerName: null,
      syncedAt: null,
    },
    createdAt: timestamp,
    archivedAt: null,
  };
}

export function createCategory({
  createId: makeId = createId,
  now = getCurrentTimestamp,
  name,
  type = "mixed",
  color = "#5b6f82",
  sortOrder = 0,
} = {}) {
  return {
    id: makeId("cat"),
    name,
    type,
    color,
    sortOrder,
    createdAt: now(),
    archivedAt: null,
  };
}

export function createCategoryRule({
  createId: makeId = createId,
  now = getCurrentTimestamp,
  categoryId,
  sourceText,
  matchText = sourceText,
} = {}) {
  const timestamp = now();

  return {
    id: makeId("rule"),
    categoryId,
    sourceText,
    matchText,
    createdAt: timestamp,
    updatedAt: timestamp,
    archivedAt: null,
  };
}

export function createTransaction({
  createId: makeId = createId,
  now = getCurrentTimestamp,
  accountId,
  date,
  description,
  merchant = null,
  amount,
  type,
  counterpartyType = "unknown",
  categoryId = null,
  notes = "",
  source = DEFAULT_SOURCE,
  rawNarration = description,
  importFingerprint = null,
  syncMetadata = {},
} = {}) {
  const timestamp = now();

  return {
    id: makeId("txn"),
    accountId,
    date,
    description,
    merchant,
    amount,
    type,
    counterpartyType,
    categoryId,
    notes,
    source,
    rawNarration,
    importFingerprint,
    syncMetadata: {
      providerTransactionId: null,
      providerCursor: null,
      syncedAt: null,
      ...syncMetadata,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createSubscription({
  createId: makeId = createId,
  now = getCurrentTimestamp,
  name,
  categoryId = null,
  amount,
  cadence = "monthly",
  nextRenewalDate,
  reminderDaysBefore = 7,
  status = "active",
  notes = "",
} = {}) {
  const timestamp = now();

  return {
    id: makeId("sub"),
    name,
    categoryId,
    amount,
    cadence,
    nextRenewalDate,
    reminderDaysBefore,
    status,
    notes,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createImportBatch({
  createId: makeId = createId,
  now = getCurrentTimestamp,
  source = "td_bank_pdf",
  fileName,
  rowCount = 0,
  createdTransactionCount = 0,
  duplicateTransactionCount = 0,
} = {}) {
  return {
    id: makeId("batch"),
    source,
    importedAt: now(),
    fileName,
    rowCount,
    createdTransactionCount,
    duplicateTransactionCount,
  };
}
