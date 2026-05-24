import {
  createDefaultFinanceData,
  createId as defaultCreateId,
  getCurrentTimestamp,
} from "../domain.js";

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
    return data || createDefaultFinanceData();
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

  const saveReviewedImport = async ({ importBatch, rows }) => {
    const data = await loadData();
    let createdTransactionCount = 0;
    let duplicateTransactionCount = 0;

    rows.forEach((row) => {
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
    });

    const savedImportBatch = {
      ...importBatch,
      rowCount: rows.length,
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
    saveSubscription: (subscription) => saveRecord("subscriptions", subscription),
    saveImportBatch: (importBatch) => saveRecord("importBatches", importBatch),
    saveTransaction,
    saveReviewedImport,
  };
}
