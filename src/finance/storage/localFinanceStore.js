import {
  createCategoryRule,
  createDefaultFinanceData,
  createId as defaultCreateId,
  getCurrentTimestamp,
} from "../domain.js";
import {
  getCategoryRuleText,
  normalizeCategoryRuleText,
} from "../categoryRules.js";

const FINANCE_DATA_KEY = "finance_app_data_v1";
const DATABASE_NAME = "personal_finance_app";
const DATABASE_VERSION = 1;
const STORE_NAME = "records";

export function createMemoryStorageDriver(initialData = null) {
  let storedData = initialData;

  return {
    async load() {
      return storedData ? structuredClone(storedData) : null;
    },
    async save(data) {
      storedData = structuredClone(data);
      return structuredClone(storedData);
    },
  };
}

export function createIndexedDbStorageDriver({
  indexedDb = globalThis.indexedDB,
} = {}) {
  if (!indexedDb) {
    throw new Error("IndexedDB is not available in this browser.");
  }

  const openDatabase = () =>
    new Promise((resolve, reject) => {
      const request = indexedDb.open(DATABASE_NAME, DATABASE_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

  const runTransaction = async (mode, callback) => {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const store = transaction.objectStore(STORE_NAME);
      const request = callback(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => database.close();
      transaction.onerror = () => {
        database.close();
        reject(transaction.error);
      };
    });
  };

  return {
    async load() {
      return runTransaction("readonly", (store) => store.get(FINANCE_DATA_KEY));
    },
    async save(data) {
      await runTransaction("readwrite", (store) =>
        store.put(data, FINANCE_DATA_KEY)
      );
      return data;
    },
  };
}

export function createFinanceRepository({
  driver = createIndexedDbStorageDriver(),
  now = getCurrentTimestamp,
  createId = defaultCreateId,
} = {}) {
  const loadData = async () => {
    const data = await driver.load();
    return {
      ...createDefaultFinanceData(),
      ...(data || {}),
    };
  };

  const saveData = async (data) => driver.save(data);

  const saveRecord = async (collectionName, record) => {
    const data = await loadData();
    const currentRecords = data[collectionName];
    const existingIndex = currentRecords.findIndex(
      (currentRecord) => currentRecord.id === record.id
    );

    if (existingIndex >= 0) {
      currentRecords[existingIndex] = record;
    } else {
      currentRecords.push(record);
    }

    await saveData(data);

    return {
      status: existingIndex >= 0 ? "updated" : "created",
      record,
    };
  };

  const saveTransaction = async (transaction) => {
    const data = await loadData();
    const isDuplicate =
      transaction.importFingerprint &&
      data.transactions.some(
        (currentTransaction) =>
          currentTransaction.importFingerprint === transaction.importFingerprint
      );

    if (isDuplicate) {
      return {
        status: "duplicate",
        record: transaction,
      };
    }

    data.transactions.push(transaction);
    await saveData(data);

    return {
      status: "created",
      record: transaction,
    };
  };

  const findCategoryIndex = (data, categoryId) =>
    data.categories.findIndex((category) => category.id === categoryId);

  const rememberCategoryRule = (data, transaction) => {
    const matchText = getCategoryRuleText(transaction);

    if (!transaction.categoryId || !matchText) {
      return;
    }

    const existingRule = data.categoryRules.find(
      (rule) => !rule.archivedAt && rule.matchText === matchText
    );

    if (existingRule) {
      existingRule.categoryId = transaction.categoryId;
      existingRule.updatedAt = now();
      return;
    }

    data.categoryRules.push(
      createCategoryRule({
        createId,
        now,
        categoryId: transaction.categoryId,
        sourceText: transaction.rawNarration || transaction.description,
        matchText,
      })
    );
  };

  const updateCategory = async (categoryId, updates) => {
    const data = await loadData();
    const categoryIndex = findCategoryIndex(data, categoryId);

    if (categoryIndex < 0) {
      return {
        status: "missing",
        record: null,
      };
    }

    const updatedCategory = {
      ...data.categories[categoryIndex],
      ...updates,
      id: data.categories[categoryIndex].id,
      createdAt: data.categories[categoryIndex].createdAt,
    };

    data.categories[categoryIndex] = updatedCategory;
    await saveData(data);

    return {
      status: "updated",
      record: updatedCategory,
    };
  };

  const archiveCategory = async (categoryId) =>
    updateCategory(categoryId, {
      archivedAt: now(),
    });

  const restoreCategory = async (categoryId) =>
    updateCategory(categoryId, {
      archivedAt: null,
    });

  const normalizeSimilarityText = (value) =>
    normalizeCategoryRuleText(value)
      .replace(/\b\d+\b/g, " ")
      .replace(/\b(STORE|LOCATION|POS|PURCHASE)\b/g, " ")
      .trim()
      .replace(/\s+/g, " ");

  const getSimilarityKey = (transaction) => {
    const sourceText = transaction.merchant || getCategoryRuleText(transaction);
    return normalizeSimilarityText(sourceText || "");
  };

  const findSimilarTransactionsInData = (data, transactionId) => {
    const sourceTransaction = data.transactions.find(
      (transaction) => transaction.id === transactionId
    );

    if (!sourceTransaction) {
      return [];
    }

    const similarityKey = getSimilarityKey(sourceTransaction);

    if (!similarityKey) {
      return [sourceTransaction];
    }

    return data.transactions.filter(
      (transaction) => getSimilarityKey(transaction) === similarityKey
    );
  };

  const findSimilarTransactions = async (transactionId) => {
    const data = await loadData();
    return findSimilarTransactionsInData(data, transactionId);
  };

  const updateTransaction = async (transactionId, updates) => {
    const data = await loadData();
    const transactionIndex = data.transactions.findIndex(
      (transaction) => transaction.id === transactionId
    );

    if (transactionIndex < 0) {
      return {
        status: "missing",
        record: null,
      };
    }

    const updatedTransaction = {
      ...data.transactions[transactionIndex],
      ...updates,
      rawNarration: data.transactions[transactionIndex].rawNarration,
      id: data.transactions[transactionIndex].id,
      updatedAt: now(),
    };

    data.transactions[transactionIndex] = updatedTransaction;
    await saveData(data);

    return {
      status: "updated",
      record: updatedTransaction,
    };
  };

  const applyTransactionCategoryChange = async ({
    transactionId,
    categoryId,
    scope = "single",
  }) => {
    const data = await loadData();
    const sourceTransaction = data.transactions.find(
      (transaction) => transaction.id === transactionId
    );

    if (!sourceTransaction) {
      return {
        status: "missing",
        updatedCount: 0,
        learnedFutureRule: false,
      };
    }

    const targetTransactions =
      scope === "single"
        ? [sourceTransaction]
        : findSimilarTransactionsInData(data, transactionId);

    const targetIds = new Set(
      targetTransactions.map((transaction) => transaction.id)
    );

    data.transactions = data.transactions.map((transaction) =>
      targetIds.has(transaction.id)
        ? {
            ...transaction,
            categoryId,
            updatedAt: now(),
          }
        : transaction
    );

    const learnedFutureRule = scope === "matching_past_and_future";

    if (learnedFutureRule) {
      const updatedSource =
        data.transactions.find((transaction) => transaction.id === transactionId) ||
        sourceTransaction;
      rememberCategoryRule(data, updatedSource);
    }

    await saveData(data);

    return {
      status: "updated",
      updatedCount: targetIds.size,
      learnedFutureRule,
    };
  };

  const deleteTransaction = async (transactionId) => {
    const data = await loadData();
    const originalLength = data.transactions.length;

    data.transactions = data.transactions.filter(
      (transaction) => transaction.id !== transactionId
    );

    if (data.transactions.length === originalLength) {
      return {
        status: "missing",
        record: null,
      };
    }

    await saveData(data);

    return {
      status: "deleted",
      record: null,
    };
  };

  const deleteTransactions = async (transactionIds = []) => {
    if (transactionIds.length === 0) {
      return {
        status: "noop",
        deletedCount: 0,
      };
    }

    const data = await loadData();
    const originalLength = data.transactions.length;
    const removalSet = new Set(transactionIds);

    data.transactions = data.transactions.filter(
      (transaction) => !removalSet.has(transaction.id)
    );

    const deletedCount = originalLength - data.transactions.length;

    if (deletedCount === 0) {
      return {
        status: "missing",
        deletedCount: 0,
      };
    }

    await saveData(data);

    return {
      status: "deleted",
      deletedCount,
    };
  };

  const updateSubscription = async (subscriptionId, updates) => {
    const data = await loadData();
    const subscriptionIndex = data.subscriptions.findIndex(
      (subscription) => subscription.id === subscriptionId
    );

    if (subscriptionIndex < 0) {
      return {
        status: "missing",
        record: null,
      };
    }

    const updatedSubscription = {
      ...data.subscriptions[subscriptionIndex],
      ...updates,
      id: data.subscriptions[subscriptionIndex].id,
      createdAt: data.subscriptions[subscriptionIndex].createdAt,
      updatedAt: now(),
    };

    data.subscriptions[subscriptionIndex] = updatedSubscription;
    await saveData(data);

    return {
      status: "updated",
      record: updatedSubscription,
    };
  };

  const deleteSubscription = async (subscriptionId) => {
    const data = await loadData();
    const originalLength = data.subscriptions.length;

    data.subscriptions = data.subscriptions.filter(
      (subscription) => subscription.id !== subscriptionId
    );

    if (data.subscriptions.length === originalLength) {
      return {
        status: "missing",
        record: null,
      };
    }

    await saveData(data);

    return {
      status: "deleted",
      record: null,
    };
  };

  const saveReviewedImport = async ({ importBatch, rows }) => {
    const data = await loadData();
    let createdTransactionCount = 0;
    let duplicateTransactionCount = 0;

    // Safety net: an uncategorized row must never reach the ledger, no matter
    // what the review UI passed in. This is the single chokepoint shared by
    // every storage backend.
    const categorizedRows = rows.filter((row) => Boolean(row.transaction?.categoryId));

    categorizedRows.forEach((row) => {
      const transaction = row.transaction;
      const isDuplicate =
        transaction.importFingerprint &&
        data.transactions.some(
          (currentTransaction) =>
            currentTransaction.importFingerprint === transaction.importFingerprint
        );

      if (isDuplicate) {
        duplicateTransactionCount += 1;
        return;
      }

      data.transactions.push(transaction);
      createdTransactionCount += 1;

      rememberCategoryRule(data, transaction);
    });

    const savedImportBatch = {
      ...importBatch,
      rowCount: categorizedRows.length,
      createdTransactionCount,
      duplicateTransactionCount,
    };

    data.importBatches.push(savedImportBatch);
    await saveData(data);

    return savedImportBatch;
  };

  return {
    now,
    createId,
    loadData,
    saveData,
    saveAccount: (account) => saveRecord("accounts", account),
    saveCategory: (category) => saveRecord("categories", category),
    updateCategory,
    archiveCategory,
    restoreCategory,
    saveCategoryRule: (categoryRule) =>
      saveRecord("categoryRules", categoryRule),
    saveSubscription: (subscription) => saveRecord("subscriptions", subscription),
    updateSubscription,
    deleteSubscription,
    saveImportBatch: (importBatch) => saveRecord("importBatches", importBatch),
    saveTransaction,
    updateTransaction,
    findSimilarTransactions,
    applyTransactionCategoryChange,
    deleteTransaction,
    deleteTransactions,
    saveReviewedImport,
  };
}
