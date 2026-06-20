import React, { useEffect, useMemo, useState } from "react";
import {
  FaCalendarAlt,
  FaChartPie,
  FaCheck,
  FaDownload,
  FaEdit,
  FaExclamationTriangle,
  FaFileImport,
  FaListUl,
  FaSignOutAlt,
  FaTags,
  FaTimes,
  FaTrash,
} from "react-icons/fa";
import { mergeCategoriesWithDefaults } from "../categories";
import { createDefaultCategories } from "../defaultCategories";
import { createCategory, createSubscription } from "../domain";
import { createFinanceRepository } from "../storage/localFinanceStore";
import { createSupabaseStorageDriver } from "../storage/supabaseFinanceDriver";
import { supabase } from "../storage/supabaseClient";
import { extractTextFromPdfFile } from "../imports/pdfTextExtractor";
import { parseTdBankStatementText } from "../imports/tdBankStatementParser";
import {
  createReviewedImportDraft,
  summarizeReviewedImportSave,
} from "../imports/reviewedImportDraft";
import {
  ALL_MONTHS,
  calculateCategorySpending,
  calculateMonthlySummary,
  getUpcomingSubscriptions,
} from "../reports";
import {
  createJsonBackup,
  exportTransactionsCsv,
  restoreJsonBackup,
} from "../backup";
import {
  findSuspectedDuplicateClusters,
  getRemovalIdsForClusters,
} from "../duplicateDetection";
import "./FinanceImportScreen.css";

const SAMPLE_STATEMENT_TEXT = `Page: 1 of 6
Statement Period: Dec 04 2024-Jan 03 2025
Primary Account #: xxx-xxx8531
Account Product Label: TD Convenience Checking

Daily Account Activity
Deposits
POSTING DATE DESCRIPTION AMOUNT
12/05 MOBILE DEPOSIT 1,250.00
Subtotal: 1,250.00

Electronic Deposits
POSTING DATE DESCRIPTION AMOUNT
01/03 TD ZELLERECEIVED FROM JANE DOE 200.00
Subtotal: 200.00

Electronic Payments
POSTING DATE DESCRIPTION AMOUNT
12/20 TD ZELLESENT JOHN DOE
RENT PAYMENT 800.00
12/22 WALMART STORE 42.91
01/02 ELECTRONICPMT-WEB CREDIT CARD 55.00
Subtotal: 897.91`;

const DEFAULT_CATEGORY_FORM = {
  color: "#406f59",
  name: "",
  type: "expense",
};

const DEFAULT_SUBSCRIPTION_FORM = {
  amount: "",
  cadence: "monthly",
  categoryId: "",
  name: "",
  nextRenewalDate: "",
  notes: "",
  reminderDaysBefore: "7",
  status: "active",
};

function createStableId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatMoney(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatType(type) {
  return type.replaceAll("_", " ");
}

function getMonthKey(date) {
  return date.slice(0, 7);
}

function getBarHeight(value, maxValue) {
  if (!maxValue) {
    return "12%";
  }

  return `${Math.max(12, Math.round((Math.abs(value) / maxValue) * 100))}%`;
}

function downloadTextFile(fileName, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function isReviewRowCategorized(row) {
  return Boolean(row?.transaction?.categoryId);
}

export default function FinanceImportScreen() {
  const [activeTab, setActiveTab] = useState("import");
  const [statementText, setStatementText] = useState(SAMPLE_STATEMENT_TEXT);
  const [draft, setDraft] = useState(null);
  const [saveResult, setSaveResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [pdfStatus, setPdfStatus] = useState("");
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [financeData, setFinanceData] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(ALL_MONTHS);
  const [includeSelfTransfers, setIncludeSelfTransfers] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState(null);
  const [transactionForm, setTransactionForm] = useState(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  const [newCategoryForm, setNewCategoryForm] = useState(DEFAULT_CATEGORY_FORM);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [categoryForm, setCategoryForm] = useState(DEFAULT_CATEGORY_FORM);
  const [pendingCategoryApply, setPendingCategoryApply] = useState(null);
  const [subscriptionForm, setSubscriptionForm] = useState(DEFAULT_SUBSCRIPTION_FORM);
  const [editingSubscriptionId, setEditingSubscriptionId] = useState(null);
  const [editingSubscriptionForm, setEditingSubscriptionForm] = useState(
    DEFAULT_SUBSCRIPTION_FORM
  );
  const [confirmingSubscriptionDeleteId, setConfirmingSubscriptionDeleteId] =
    useState(null);
  const [duplicateReview, setDuplicateReview] = useState(null);
  const defaultCategories = useMemo(() => createDefaultCategories(), []);
  const repository = useMemo(
    () => createFinanceRepository({ driver: createSupabaseStorageDriver({ supabase }) }),
    []
  );
  const categories = mergeCategoriesWithDefaults(
    defaultCategories,
    financeData?.categories || []
  );
  const visibleCategories = categories.filter((category) => !category.archivedAt);
  const hiddenCategories = categories.filter((category) => category.archivedAt);
  const transactions = financeData?.transactions || [];
  const subscriptions = financeData?.subscriptions || [];
  const categoryRules = financeData?.categoryRules || [];

  const loadFinanceData = async () => {
    try {
      const data = await repository.loadData();
      const hydratedData = {
        ...data,
        categories: mergeCategoriesWithDefaults(defaultCategories, data.categories),
      };
      const months = Array.from(
        new Set(hydratedData.transactions.map((transaction) => getMonthKey(transaction.date)))
      ).sort();

      setFinanceData(hydratedData);
      setLoadError("");

      if (
        selectedMonth !== ALL_MONTHS &&
        months.length > 0 &&
        !months.includes(selectedMonth)
      ) {
        setSelectedMonth(ALL_MONTHS);
      }
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Could not load your finance data."
      );
    }
  };

  useEffect(() => {
    loadFinanceData();
  }, []);

  const parseStatement = () => {
    setErrorMessage("");
    setSaveResult(null);

    try {
      const parsedStatement = parseTdBankStatementText(statementText);
      const nextDraft = createReviewedImportDraft({
        accountId: "acct_td_checking",
        fileName: "td-bank-statement.txt",
        parsedStatement,
        categories,
        categoryRules,
        now: () => new Date().toISOString(),
        createId: createStableId,
      });
      setDraft(nextDraft);
      setSelectedRows(
        new Set(
          nextDraft.rows
            .filter((row) => isReviewRowCategorized(row))
            .map((row) => row.id)
        )
      );
    } catch (error) {
      setDraft(null);
      setSelectedRows(new Set());
      setErrorMessage(error.message || "Statement could not be parsed.");
    }
  };

  const importPdf = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setErrorMessage("");
    setPdfStatus(`Reading ${file.name}...`);

    try {
      const extractedText = await extractTextFromPdfFile(file);
      setStatementText(extractedText);
      setDraft(null);
      setSelectedRows(new Set());
      setSaveResult(null);
      setPdfStatus(`Extracted text from ${file.name}. Review it, then parse.`);
    } catch (error) {
      setPdfStatus("");
      setErrorMessage(error.message || "PDF text could not be extracted.");
    } finally {
      event.target.value = "";
    }
  };

  const toggleRow = (rowId) => {
    setSelectedRows((currentRows) => {
      const nextRows = new Set(currentRows);

      if (nextRows.has(rowId)) {
        nextRows.delete(rowId);
        return nextRows;
      }

      // Uncategorized rows can never be selected — they are blocked from import.
      const targetRow = draft?.rows.find((row) => row.id === rowId);

      if (targetRow && isReviewRowCategorized(targetRow)) {
        nextRows.add(rowId);
      }

      return nextRows;
    });
  };

  const updateRowCategory = (rowId, categoryId) => {
    const nextCategoryId = categoryId || null;

    setDraft((currentDraft) => ({
      ...currentDraft,
      rows: currentDraft.rows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              transaction: {
                ...row.transaction,
                categoryId: nextCategoryId,
              },
            }
          : row
      ),
    }));

    // Keep selection in sync: assigning a category includes the row; clearing
    // it back to "Uncategorized" removes it so it cannot reach the ledger.
    setSelectedRows((currentRows) => {
      const nextRows = new Set(currentRows);

      if (nextCategoryId) {
        nextRows.add(rowId);
      } else {
        nextRows.delete(rowId);
      }

      return nextRows;
    });
  };

  const createInlineCategory = async () => {
    const rawName =
      typeof window !== "undefined" ? window.prompt("New category name") : "";
    const categoryName = (rawName || "").trim();

    if (!categoryName) {
      return null;
    }

    const newCategory = createCategory({
      createId: repository.createId,
      now: repository.now,
      name: categoryName,
      type: "expense",
      color: DEFAULT_CATEGORY_FORM.color,
      sortOrder: categories.length,
    });

    await repository.saveCategory(newCategory);
    await loadFinanceData();
    return newCategory.id;
  };

  const handleCategorySelectChange = async (event, applyId) => {
    const value = event.target.value;

    if (value === "__create__") {
      const newId = await createInlineCategory();

      if (newId) {
        applyId(newId);
      }

      return;
    }

    applyId(value);
  };

  const saveSelectedRows = async () => {
    if (!draft) {
      return;
    }

    const savedRowIds = new Set(selectedRows);
    const selectedDraft = {
      ...draft,
      rows: draft.rows.filter((row) => savedRowIds.has(row.id)),
    };
    const result = await repository.saveReviewedImport(selectedDraft);
    await loadFinanceData();

    // Drop the just-saved rows from the review list; keep the rest (the locked
    // uncategorized rows plus any categorized row left unchecked). Stay on the
    // Import tab so the confirmation and the leftovers are visible.
    const remainingRows = draft.rows.filter((row) => !savedRowIds.has(row.id));
    setSelectedRows(new Set());
    setSaveResult({ ...result, remainingCount: remainingRows.length });
    setDraft(remainingRows.length > 0 ? { ...draft, rows: remainingRows } : null);
  };

  const startEditingTransaction = (transaction) => {
    setEditingTransactionId(transaction.id);
    setConfirmingDeleteId(null);
    setTransactionForm({
      categoryId: transaction.categoryId || "",
      description: transaction.description || "",
      merchant: transaction.merchant || "",
      notes: transaction.notes || "",
      type: transaction.type,
    });
  };

  const cancelEditingTransaction = () => {
    setEditingTransactionId(null);
    setTransactionForm(null);
    setPendingCategoryApply(null);
  };

  const updateTransactionForm = (fieldName, value) => {
    setTransactionForm((currentForm) => ({
      ...currentForm,
      [fieldName]: value,
    }));
  };

  const saveTransactionEdit = async (transactionId) => {
    if (!transactionForm) {
      return;
    }

    const currentTransaction = transactions.find(
      (transaction) => transaction.id === transactionId
    );
    const nextCategoryId = transactionForm.categoryId || null;
    const transactionUpdates = {
      categoryId: transactionForm.categoryId || null,
      description: transactionForm.description.trim(),
      merchant: transactionForm.merchant.trim() || null,
      notes: transactionForm.notes.trim(),
      type: transactionForm.type,
    };
    const categoryChanged =
      currentTransaction && (currentTransaction.categoryId || null) !== nextCategoryId;

    if (categoryChanged) {
      const similarTransactions = await repository.findSimilarTransactions(transactionId);

      if (similarTransactions.length > 1) {
        setPendingCategoryApply({
          categoryId: nextCategoryId,
          matchLabel:
            currentTransaction.merchant ||
            currentTransaction.rawNarration ||
            currentTransaction.description,
          similarCount: similarTransactions.length,
          transactionId,
          updates: transactionUpdates,
        });
        return;
      }
    }

    await repository.updateTransaction(transactionId, transactionUpdates);
    cancelEditingTransaction();
    await loadFinanceData();
  };

  const applyPendingCategoryChange = async (scope) => {
    if (!pendingCategoryApply) {
      return;
    }

    await repository.applyTransactionCategoryChange({
      transactionId: pendingCategoryApply.transactionId,
      categoryId: pendingCategoryApply.categoryId,
      scope,
    });
    await repository.updateTransaction(
      pendingCategoryApply.transactionId,
      pendingCategoryApply.updates
    );
    cancelEditingTransaction();
    await loadFinanceData();
  };

  const deleteTransaction = async (transactionId) => {
    if (confirmingDeleteId !== transactionId) {
      setConfirmingDeleteId(transactionId);
      setEditingTransactionId(null);
      setTransactionForm(null);
      return;
    }

    await repository.deleteTransaction(transactionId);
    setConfirmingDeleteId(null);
    await loadFinanceData();
  };

  const openDuplicateReview = () => {
    const clusters = findSuspectedDuplicateClusters(transactions);
    // Pre-select every row past the first in each cluster — the typical
    // case is "keep the first, drop the rest". The user can flip any
    // checkbox before confirming.
    const removedIdsByCluster = new Map();

    clusters.forEach((cluster) => {
      const removalSet = new Set();

      cluster.transactions.slice(1).forEach((transaction) => {
        removalSet.add(transaction.id);
      });

      removedIdsByCluster.set(cluster.key, removalSet);
    });

    setDuplicateReview({ clusters, removedIdsByCluster });
  };

  const closeDuplicateReview = () => {
    setDuplicateReview(null);
  };

  const toggleDuplicateRemoval = (clusterKey, transactionId) => {
    setDuplicateReview((currentReview) => {
      if (!currentReview) {
        return currentReview;
      }

      const nextRemoved = new Map(currentReview.removedIdsByCluster);
      const removalSet = new Set(nextRemoved.get(clusterKey) || []);

      if (removalSet.has(transactionId)) {
        removalSet.delete(transactionId);
      } else {
        removalSet.add(transactionId);
      }

      nextRemoved.set(clusterKey, removalSet);

      return {
        ...currentReview,
        removedIdsByCluster: nextRemoved,
      };
    });
  };

  const confirmDuplicateRemoval = async () => {
    if (!duplicateReview) {
      return;
    }

    const removalIds = getRemovalIdsForClusters(
      duplicateReview.clusters,
      duplicateReview.removedIdsByCluster
    );

    if (removalIds.length === 0) {
      closeDuplicateReview();
      return;
    }

    await repository.deleteTransactions(removalIds);
    closeDuplicateReview();
    await loadFinanceData();
  };

  const updateNewCategoryForm = (fieldName, value) => {
    setNewCategoryForm((currentForm) => ({
      ...currentForm,
      [fieldName]: value,
    }));
  };

  const updateCategoryForm = (fieldName, value) => {
    setCategoryForm((currentForm) => ({
      ...currentForm,
      [fieldName]: value,
    }));
  };

  const createCustomCategory = async () => {
    const categoryName = newCategoryForm.name.trim();

    if (!categoryName) {
      return;
    }

    await repository.saveCategory(
      createCategory({
        createId: repository.createId,
        now: repository.now,
        name: categoryName,
        type: newCategoryForm.type,
        color: newCategoryForm.color,
        sortOrder: categories.length,
      })
    );
    setNewCategoryForm(DEFAULT_CATEGORY_FORM);
    await loadFinanceData();
  };

  const startEditingCategory = (category) => {
    setEditingCategoryId(category.id);
    setCategoryForm({
      color: category.color,
      name: category.name,
      type: category.type,
    });
  };

  const cancelEditingCategory = () => {
    setEditingCategoryId(null);
    setCategoryForm(DEFAULT_CATEGORY_FORM);
  };

  const saveCategoryEdit = async (categoryId) => {
    const categoryName = categoryForm.name.trim();
    const currentCategory = categories.find((category) => category.id === categoryId);

    if (!categoryName || !currentCategory) {
      return;
    }

    await repository.saveCategory({
      ...currentCategory,
      color: categoryForm.color,
      id: categoryId,
      name: categoryName,
      type: categoryForm.type,
    });
    cancelEditingCategory();
    await loadFinanceData();
  };

  const archiveCategory = async (categoryId) => {
    const currentCategory = categories.find((category) => category.id === categoryId);

    if (!currentCategory) {
      return;
    }

    await repository.saveCategory({
      ...currentCategory,
      archivedAt: repository.now(),
    });
    await loadFinanceData();
  };

  const restoreCategory = async (categoryId) => {
    const currentCategory = categories.find((category) => category.id === categoryId);

    if (!currentCategory) {
      return;
    }

    await repository.saveCategory({
      ...currentCategory,
      archivedAt: null,
    });
    await loadFinanceData();
  };

  const updateSubscriptionForm = (fieldName, value) => {
    setSubscriptionForm((currentForm) => ({
      ...currentForm,
      [fieldName]: value,
    }));
  };

  const updateEditingSubscriptionForm = (fieldName, value) => {
    setEditingSubscriptionForm((currentForm) => ({
      ...currentForm,
      [fieldName]: value,
    }));
  };

  const buildSubscriptionUpdates = (form) => ({
    amount: Number(form.amount),
    cadence: form.cadence,
    categoryId: form.categoryId || null,
    name: form.name.trim(),
    nextRenewalDate: form.nextRenewalDate,
    notes: form.notes.trim(),
    reminderDaysBefore: Number(form.reminderDaysBefore),
    status: form.status,
  });

  const isSubscriptionFormValid = (form) =>
    form.name.trim() &&
    form.nextRenewalDate &&
    Number.isFinite(Number(form.amount)) &&
    Number(form.amount) > 0 &&
    Number.isFinite(Number(form.reminderDaysBefore)) &&
    Number(form.reminderDaysBefore) >= 0;

  const createCustomSubscription = async () => {
    if (!isSubscriptionFormValid(subscriptionForm)) {
      return;
    }

    await repository.saveSubscription(
      createSubscription({
        createId: repository.createId,
        now: repository.now,
        ...buildSubscriptionUpdates(subscriptionForm),
      })
    );
    setSubscriptionForm(DEFAULT_SUBSCRIPTION_FORM);
    await loadFinanceData();
  };

  const startEditingSubscription = (subscription) => {
    setEditingSubscriptionId(subscription.id);
    setConfirmingSubscriptionDeleteId(null);
    setEditingSubscriptionForm({
      amount: String(subscription.amount),
      cadence: subscription.cadence || "monthly",
      categoryId: subscription.categoryId || "",
      name: subscription.name || "",
      nextRenewalDate: subscription.nextRenewalDate || "",
      notes: subscription.notes || "",
      reminderDaysBefore: String(subscription.reminderDaysBefore ?? 7),
      status: subscription.status || "active",
    });
  };

  const cancelEditingSubscription = () => {
    setEditingSubscriptionId(null);
    setEditingSubscriptionForm(DEFAULT_SUBSCRIPTION_FORM);
  };

  const saveSubscriptionEdit = async (subscriptionId) => {
    if (!isSubscriptionFormValid(editingSubscriptionForm)) {
      return;
    }

    await repository.updateSubscription(
      subscriptionId,
      buildSubscriptionUpdates(editingSubscriptionForm)
    );
    cancelEditingSubscription();
    await loadFinanceData();
  };

  const deleteSubscription = async (subscriptionId) => {
    if (confirmingSubscriptionDeleteId !== subscriptionId) {
      setConfirmingSubscriptionDeleteId(subscriptionId);
      setEditingSubscriptionId(null);
      return;
    }

    await repository.deleteSubscription(subscriptionId);
    setConfirmingSubscriptionDeleteId(null);
    await loadFinanceData();
  };

  const exportBackup = () => {
    if (!financeData) {
      return;
    }

    downloadTextFile(
      "personal-finance-backup.json",
      JSON.stringify(createJsonBackup(financeData), null, 2),
      "application/json"
    );
  };

  const exportCsv = () => {
    downloadTextFile(
      "personal-finance-transactions.csv",
      exportTransactionsCsv(transactions),
      "text/csv"
    );
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const restoreFromBackup = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setErrorMessage("");

    try {
      const parsedBackup = JSON.parse(await file.text());
      const restoredData = restoreJsonBackup(parsedBackup);

      await repository.saveData(restoredData);
      await loadFinanceData();
      setSaveResult(null);
      setPdfStatus(`Restored your data from ${file.name}.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Backup could not be restored."
      );
    } finally {
      event.target.value = "";
    }
  };

  const readyCount = draft?.rows.filter((row) => row.status === "ready").length || 0;
  const reviewCount =
    draft?.rows.filter((row) => row.status === "needs_review").length || 0;
  const uncategorizedCount =
    draft?.rows.filter((row) => !isReviewRowCategorized(row)).length || 0;
  const selectedCount = selectedRows.size;
  const saveSummary = saveResult
    ? summarizeReviewedImportSave({
        createdTransactionCount: saveResult.createdTransactionCount,
        duplicateTransactionCount: saveResult.duplicateTransactionCount,
        remainingCount: saveResult.remainingCount ?? 0,
      })
    : null;
  const monthOptions = Array.from(
    new Set(transactions.map((transaction) => getMonthKey(transaction.date)))
  ).sort();
  const monthSummary = calculateMonthlySummary(transactions, {
    month: selectedMonth,
    includeSelfTransfers,
  });
  const categorySpending = calculateCategorySpending(transactions, {
    month: selectedMonth,
  });
  const sortedCategorySpending = Object.entries(categorySpending).sort(
    (first, second) => second[1] - first[1]
  );
  const maxCashflowValue = Math.max(
    monthSummary.income,
    monthSummary.expenses,
    monthSummary.selfTransfers
  );
  const upcomingSubscriptions = getUpcomingSubscriptions(subscriptions, {
    today: new Date().toISOString().slice(0, 10),
    daysAhead: 30,
  });
  const monthTransactions = transactions
    .filter((transaction) =>
      selectedMonth === ALL_MONTHS
        ? true
        : getMonthKey(transaction.date) === selectedMonth
    )
    .sort((first, second) => second.date.localeCompare(first.date));
  const categoryById = new Map(
    categories.map((category) => [category.id, category])
  );
  const getSelectableCategories = (selectedCategoryId) =>
    categories.filter(
      (category) => !category.archivedAt || category.id === selectedCategoryId
    );
  const sortedSubscriptions = [...subscriptions].sort((first, second) =>
    first.nextRenewalDate.localeCompare(second.nextRenewalDate)
  );

  return (
    <main className="finance-shell">
      <section className="finance-hero">
        <div>
          <p className="finance-kicker">Personal finance workspace</p>
          <h1>Import, label, and understand your TD Bank activity.</h1>
        </div>
        <div className="hero-actions">
          <button className="ghost-action" type="button" onClick={exportCsv}>
            <FaDownload aria-hidden="true" />
            Export CSV
          </button>
          <button className="primary-action" type="button" onClick={exportBackup}>
            <FaDownload aria-hidden="true" />
            Backup JSON
          </button>
          <button className="ghost-action" type="button" onClick={signOut}>
            <FaSignOutAlt aria-hidden="true" />
            Sign out
          </button>
        </div>
      </section>

      {loadError ? (
        <p className="error-message data-error" role="alert">
          {loadError}
        </p>
      ) : null}

      <nav className="workspace-tabs" aria-label="Finance workspace sections">
        <button
          className={activeTab === "import" ? "active" : ""}
          type="button"
          onClick={() => setActiveTab("import")}
        >
          <FaFileImport aria-hidden="true" />
          Import
        </button>
        <button
          className={activeTab === "ledger" ? "active" : ""}
          type="button"
          onClick={() => setActiveTab("ledger")}
        >
          <FaListUl aria-hidden="true" />
          Ledger
        </button>
        <button
          className={activeTab === "reports" ? "active" : ""}
          type="button"
          onClick={() => setActiveTab("reports")}
        >
          <FaChartPie aria-hidden="true" />
          Reports
        </button>
        <button
          className={activeTab === "subscriptions" ? "active" : ""}
          type="button"
          onClick={() => setActiveTab("subscriptions")}
        >
          <FaCalendarAlt aria-hidden="true" />
          Subscriptions
        </button>
        <button
          className={activeTab === "categories" ? "active" : ""}
          type="button"
          onClick={() => setActiveTab("categories")}
        >
          <FaTags aria-hidden="true" />
          Categories
        </button>
      </nav>

      {activeTab === "import" ? (
        <section className="import-workspace">
        <div className="statement-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Statement Text</p>
              <h2>TD Bank Source</h2>
            </div>
            <div className="source-actions">
              <button className="primary-action" type="button" onClick={parseStatement}>
                <FaFileImport aria-hidden="true" />
                Parse
              </button>
              <label className="file-action">
                <input
                  accept="application/pdf"
                  aria-label="Upload TD Bank PDF statement"
                  type="file"
                  onChange={importPdf}
                />
                Upload PDF
              </label>
              <label className="file-action">
                <input
                  accept="application/json"
                  aria-label="Restore from a backup JSON file"
                  type="file"
                  onChange={restoreFromBackup}
                />
                Restore JSON
              </label>
              <button
                className="ghost-action"
                type="button"
                onClick={() => setStatementText("")}
              >
                Clear
              </button>
            </div>
          </div>
          {pdfStatus ? (
            <p aria-live="polite" className="pdf-status" role="status">
              {pdfStatus}
            </p>
          ) : null}
          {errorMessage ? (
            <p className="error-message" role="alert">
              {errorMessage}
            </p>
          ) : null}
          <textarea
            aria-label="TD Bank statement text"
            value={statementText}
            onChange={(event) => setStatementText(event.target.value)}
            spellCheck="false"
          />
        </div>

        <div className="review-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Import Review</p>
              <h2>{draft ? `${draft.rows.length} parsed rows` : "No rows yet"}</h2>
            </div>
            <button
              className="primary-action compact"
              type="button"
              onClick={saveSelectedRows}
              disabled={!draft || selectedCount === 0}
            >
              <FaCheck aria-hidden="true" />
              Save Selected
            </button>
          </div>

          {saveSummary ? (
            <div
              className={`save-confirmation ${saveSummary.tone}`}
              role="status"
              aria-live="polite"
            >
              <FaCheck className="save-confirmation-icon" aria-hidden="true" />
              <div className="save-confirmation-text">
                <strong>{saveSummary.headline}</strong>
                {saveSummary.detail ? <span>{saveSummary.detail}</span> : null}
              </div>
              <button
                className="save-confirmation-link"
                type="button"
                onClick={() => setActiveTab("ledger")}
              >
                View ledger
              </button>
              <button
                className="save-confirmation-dismiss"
                type="button"
                aria-label="Dismiss"
                onClick={() => setSaveResult(null)}
              >
                <FaTimes aria-hidden="true" />
              </button>
            </div>
          ) : null}

          <div className="import-metrics" aria-label="Import metrics">
            <div>
              <span>{readyCount}</span>
              Ready
            </div>
            <div>
              <span>{reviewCount}</span>
              Review
            </div>
            <div className={uncategorizedCount > 0 ? "metric-uncategorized" : undefined}>
              <span>{uncategorizedCount}</span>
              Uncategorized
            </div>
            <div>
              <span>{selectedCount}</span>
              Selected
            </div>
          </div>

          {draft ? (
            <div className="review-table">
              {draft.rows.map((row) => {
                const isUncategorized = !isReviewRowCategorized(row);

                return (
                <article
                  className={`review-row${isUncategorized ? " uncategorized" : ""}`}
                  key={row.id}
                >
                  <label className="row-select">
                    <input
                      checked={selectedRows.has(row.id)}
                      disabled={isUncategorized}
                      type="checkbox"
                      onChange={() => toggleRow(row.id)}
                    />
                    <span>{row.transaction.date}</span>
                  </label>
                  <div className="row-main">
                    <strong>{row.transaction.description}</strong>
                    <span>{formatType(row.transaction.type)}</span>
                  </div>
                  <div className="row-category">
                    <select
                      aria-label={`Category for ${row.transaction.description}`}
                      value={row.transaction.categoryId || ""}
                      onChange={(event) =>
                        handleCategorySelectChange(event, (id) =>
                          updateRowCategory(row.id, id)
                        )
                      }
                    >
                      <option value="">Uncategorized</option>
                      {visibleCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                      <option value="__create__">+ Add new category…</option>
                    </select>
                    {isUncategorized ? (
                      <span className="row-uncategorized-tag">
                        Pick a category to include
                      </span>
                    ) : row.categorySource === "learned" ? (
                      <span>Learned</span>
                    ) : null}
                  </div>
                  <div className="row-amount">{formatMoney(row.transaction.amount)}</div>
                  <div className={`row-status ${row.status}`}>
                    {row.status === "needs_review" ? (
                      <FaExclamationTriangle aria-hidden="true" />
                    ) : (
                      <FaCheck aria-hidden="true" />
                    )}
                    {row.status === "needs_review" ? "Review" : "Ready"}
                  </div>
                  {row.reviewReasons.length > 0 ? (
                    <p className="row-reasons">{row.reviewReasons.join(" ")}</p>
                  ) : null}
                </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-review">Parse a TD statement to review rows.</div>
          )}

          {draft ? (
            <div className="reconciliation-strip">
              {draft.reconciliation.map((item) => (
                <div className={item.status} key={item.section}>
                  <span>{item.section}</span>
                  <strong>{formatMoney(item.parsedTotal)}</strong>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        </section>
      ) : null}

      {activeTab === "ledger" ? (
        <section className="ledger-workspace">
          <div className="summary-strip">
            <div>
              <span>Income</span>
              <strong>{formatMoney(monthSummary.income)}</strong>
            </div>
            <div>
              <span>Spending</span>
              <strong>{formatMoney(monthSummary.expenses)}</strong>
            </div>
            <div>
              <span>Left over</span>
              <strong>{formatMoney(monthSummary.net)}</strong>
            </div>
          </div>

          <div className="panel-heading ledger-heading">
            <div>
              <p className="eyebrow">Ledger</p>
              <h2>
                {selectedMonth === ALL_MONTHS
                  ? `${monthTransactions.length} saved transactions`
                  : `${selectedMonth} transactions`}
              </h2>
            </div>
            <div className="ledger-heading-actions">
              <button
                type="button"
                className="ghost-action compact"
                onClick={openDuplicateReview}
                disabled={transactions.length < 2}
              >
                Find duplicates
              </button>
              <select
                className="month-select"
                aria-label="Select ledger month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
              >
                <option value={ALL_MONTHS}>All months</option>
                {[selectedMonth, ...monthOptions]
                  .filter((month) => month && month !== ALL_MONTHS)
                  .filter((month, index, months) => months.indexOf(month) === index)
                  .map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {duplicateReview ? (
            <div className="duplicate-review-panel">
              <div className="duplicate-review-heading">
                <div>
                  <h3>Suspected duplicates</h3>
                  <p>
                    {duplicateReview.clusters.length === 0
                      ? "No duplicate clusters found across your saved transactions."
                      : "Each group shares the same date, amount, and merchant. Uncheck any row you want to keep, then confirm."}
                  </p>
                </div>
                <button
                  type="button"
                  className="ghost-action compact"
                  onClick={closeDuplicateReview}
                >
                  Close
                </button>
              </div>

              {duplicateReview.clusters.length > 0 ? (
                <>
                  <div className="duplicate-cluster-list">
                    {duplicateReview.clusters.map((cluster) => {
                      const removalSet =
                        duplicateReview.removedIdsByCluster.get(cluster.key) ||
                        new Set();

                      return (
                        <div key={cluster.key} className="duplicate-cluster">
                          <p className="duplicate-cluster-summary">
                            {cluster.transactions[0].date} ·{" "}
                            {formatMoney(cluster.transactions[0].amount)} ·{" "}
                            {cluster.transactions.length} matching rows
                          </p>
                          <ul>
                            {cluster.transactions.map((transaction) => {
                              const isMarkedForRemoval = removalSet.has(
                                transaction.id
                              );

                              return (
                                <li
                                  key={transaction.id}
                                  className={
                                    isMarkedForRemoval ? "marked-for-removal" : ""
                                  }
                                >
                                  <label>
                                    <input
                                      type="checkbox"
                                      checked={isMarkedForRemoval}
                                      onChange={() =>
                                        toggleDuplicateRemoval(
                                          cluster.key,
                                          transaction.id
                                        )
                                      }
                                    />
                                    <span className="duplicate-row-description">
                                      {transaction.description ||
                                        transaction.rawNarration}
                                    </span>
                                    <span className="duplicate-row-meta">
                                      {categoryById.get(transaction.categoryId)
                                        ?.name || "Uncategorized"}
                                    </span>
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                  <div className="duplicate-review-actions">
                    <button
                      type="button"
                      className="primary-action compact"
                      onClick={confirmDuplicateRemoval}
                    >
                      Remove selected
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {monthTransactions.length > 0 ? (
            <div className="transaction-table">
              {monthTransactions.map((transaction) => {
                const isEditing = editingTransactionId === transaction.id;
                const isConfirmingDelete = confirmingDeleteId === transaction.id;

                return (
                  <article
                    className={`transaction-row ${isEditing ? "editing" : ""}`}
                    key={transaction.id}
                  >
                    {isEditing ? (
                      <>
                        <div className="transaction-edit-grid">
                          <label>
                            Description
                            <input
                              value={transactionForm.description}
                              onChange={(event) =>
                                updateTransactionForm("description", event.target.value)
                              }
                            />
                          </label>
                          <label>
                            Merchant
                            <input
                              value={transactionForm.merchant}
                              onChange={(event) =>
                                updateTransactionForm("merchant", event.target.value)
                              }
                            />
                          </label>
                          <label>
                            Type
                            <select
                              value={transactionForm.type}
                              onChange={(event) =>
                                updateTransactionForm("type", event.target.value)
                              }
                            >
                              <option value="income">Income</option>
                              <option value="expense">Expense</option>
                              <option value="transfer_to_other">
                                Transfer to other
                              </option>
                              <option value="transfer_to_self">
                                Transfer to self
                              </option>
                            </select>
                          </label>
                          <label>
                            Category
                            <select
                              value={transactionForm.categoryId}
                              onChange={(event) =>
                                handleCategorySelectChange(event, (id) =>
                                  updateTransactionForm("categoryId", id)
                                )
                              }
                            >
                              <option value="">Uncategorized</option>
                              {getSelectableCategories(
                                transaction.categoryId
                              ).map((category) => (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              ))}
                              <option value="__create__">+ Add new category…</option>
                            </select>
                          </label>
                          <label className="transaction-notes-field">
                            Notes
                            <textarea
                              value={transactionForm.notes}
                              onChange={(event) =>
                                updateTransactionForm("notes", event.target.value)
                              }
                            />
                          </label>
                        </div>
                        <div className="transaction-actions">
                          <button
                            className="primary-action compact"
                            type="button"
                            onClick={() => saveTransactionEdit(transaction.id)}
                          >
                            <FaCheck aria-hidden="true" />
                            Save
                          </button>
                          <button
                            className="ghost-action compact"
                            type="button"
                            onClick={cancelEditingTransaction}
                          >
                            Cancel
                          </button>
                        </div>
                        {pendingCategoryApply?.transactionId === transaction.id ? (
                          <div className="smart-apply-panel">
                            <p>
                              Found {pendingCategoryApply.similarCount} similar
                              transactions for {pendingCategoryApply.matchLabel}.
                            </p>
                            <div>
                              <button
                                className="ghost-action compact"
                                type="button"
                                onClick={() => applyPendingCategoryChange("single")}
                              >
                                This transaction
                              </button>
                              <button
                                className="ghost-action compact"
                                type="button"
                                onClick={() =>
                                  applyPendingCategoryChange("matching_past")
                                }
                              >
                                Matching past
                              </button>
                              <button
                                className="primary-action compact"
                                type="button"
                                onClick={() =>
                                  applyPendingCategoryChange(
                                    "matching_past_and_future"
                                  )
                                }
                              >
                                Past and future
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <div>
                          <strong>{transaction.description}</strong>
                          <span>{transaction.date}</span>
                        </div>
                        <div>{formatType(transaction.type)}</div>
                        <div>
                          {categoryById.get(transaction.categoryId)?.name ||
                            "Uncategorized"}
                        </div>
                        <div>{formatMoney(transaction.amount)}</div>
                        <div className="transaction-actions">
                          <button
                            className="icon-action"
                            type="button"
                            aria-label={`Edit ${transaction.description}`}
                            onClick={() => startEditingTransaction(transaction)}
                          >
                            <FaEdit aria-hidden="true" />
                          </button>
                          <button
                            className={`icon-action danger ${
                              isConfirmingDelete ? "confirming" : ""
                            }`}
                            type="button"
                            aria-label={
                              isConfirmingDelete
                                ? `Confirm delete ${transaction.description}`
                                : `Delete ${transaction.description}`
                            }
                            onClick={() => deleteTransaction(transaction.id)}
                          >
                            <FaTrash aria-hidden="true" />
                          </button>
                        </div>
                        {isConfirmingDelete ? (
                          <p className="delete-confirmation">
                            Select delete again to remove this transaction.
                          </p>
                        ) : null}
                      </>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-review">
              Save an import to start filling the ledger.
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "categories" ? (
        <section className="categories-workspace">
          <div className="category-layout">
            <section className="category-editor-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Categories</p>
                  <h2>Create category</h2>
                </div>
              </div>
              <div className="category-form-grid">
                <label>
                  Name
                  <input
                    value={newCategoryForm.name}
                    onChange={(event) =>
                      updateNewCategoryForm("name", event.target.value)
                    }
                  />
                </label>
                <label>
                  Type
                  <select
                    value={newCategoryForm.type}
                    onChange={(event) =>
                      updateNewCategoryForm("type", event.target.value)
                    }
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                    <option value="transfer">Transfer</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </label>
                <label>
                  Color
                  <input
                    type="color"
                    value={newCategoryForm.color}
                    onChange={(event) =>
                      updateNewCategoryForm("color", event.target.value)
                    }
                  />
                </label>
                <button
                  className="primary-action"
                  type="button"
                  onClick={createCustomCategory}
                  disabled={!newCategoryForm.name.trim()}
                >
                  Add category
                </button>
              </div>
            </section>

            <section className="category-list-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Active</p>
                  <h2>{visibleCategories.length} available categories</h2>
                </div>
              </div>
              <div className="category-list">
                {visibleCategories.map((category) => {
                  const isEditingCategory = editingCategoryId === category.id;

                  return (
                    <article className="category-row" key={category.id}>
                      <span
                        className="category-color"
                        style={{ background: category.color }}
                        aria-hidden="true"
                      />
                      {isEditingCategory ? (
                        <>
                          <div className="category-form-grid inline">
                            <label>
                              Name
                              <input
                                value={categoryForm.name}
                                onChange={(event) =>
                                  updateCategoryForm("name", event.target.value)
                                }
                              />
                            </label>
                            <label>
                              Type
                              <select
                                value={categoryForm.type}
                                onChange={(event) =>
                                  updateCategoryForm("type", event.target.value)
                                }
                              >
                                <option value="expense">Expense</option>
                                <option value="income">Income</option>
                                <option value="transfer">Transfer</option>
                                <option value="mixed">Mixed</option>
                              </select>
                            </label>
                            <label>
                              Color
                              <input
                                type="color"
                                value={categoryForm.color}
                                onChange={(event) =>
                                  updateCategoryForm("color", event.target.value)
                                }
                              />
                            </label>
                          </div>
                          <div className="transaction-actions">
                            <button
                              className="primary-action compact"
                              type="button"
                              onClick={() => saveCategoryEdit(category.id)}
                            >
                              Save
                            </button>
                            <button
                              className="ghost-action compact"
                              type="button"
                              onClick={cancelEditingCategory}
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <strong>{category.name}</strong>
                            <span>{formatType(category.type)}</span>
                          </div>
                          <div className="transaction-actions">
                            <button
                              className="ghost-action compact"
                              type="button"
                              onClick={() => startEditingCategory(category)}
                            >
                              Edit
                            </button>
                            <button
                              className="ghost-action compact"
                              type="button"
                              onClick={() => archiveCategory(category.id)}
                            >
                              Hide
                            </button>
                          </div>
                        </>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="category-list-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Hidden</p>
                  <h2>{hiddenCategories.length} retired categories</h2>
                </div>
              </div>
              {hiddenCategories.length > 0 ? (
                <div className="category-list">
                  {hiddenCategories.map((category) => (
                    <article className="category-row muted" key={category.id}>
                      <span
                        className="category-color"
                        style={{ background: category.color }}
                        aria-hidden="true"
                      />
                      <div>
                        <strong>{category.name}</strong>
                        <span>{formatType(category.type)}</span>
                      </div>
                      <button
                        className="ghost-action compact"
                        type="button"
                        onClick={() => restoreCategory(category.id)}
                      >
                        Restore
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="muted-copy">No hidden categories.</p>
              )}
            </section>
          </div>
        </section>
      ) : null}

      {activeTab === "subscriptions" ? (
        <section className="subscriptions-workspace">
          <div className="subscriptions-layout">
            <section className="subscription-editor-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Subscriptions</p>
                  <h2>Create renewal</h2>
                </div>
              </div>
              <div className="subscription-form-grid">
                <label>
                  Name
                  <input
                    value={subscriptionForm.name}
                    onChange={(event) =>
                      updateSubscriptionForm("name", event.target.value)
                    }
                  />
                </label>
                <label>
                  Amount
                  <input
                    min="0"
                    step="0.01"
                    type="number"
                    value={subscriptionForm.amount}
                    onChange={(event) =>
                      updateSubscriptionForm("amount", event.target.value)
                    }
                  />
                </label>
                <label>
                  Next renewal
                  <input
                    type="date"
                    value={subscriptionForm.nextRenewalDate}
                    onChange={(event) =>
                      updateSubscriptionForm("nextRenewalDate", event.target.value)
                    }
                  />
                </label>
                <label>
                  Category
                  <select
                    value={subscriptionForm.categoryId}
                    onChange={(event) =>
                      handleCategorySelectChange(event, (id) =>
                        updateSubscriptionForm("categoryId", id)
                      )
                    }
                  >
                    <option value="">Uncategorized</option>
                    {visibleCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                    <option value="__create__">+ Add new category…</option>
                  </select>
                </label>
                <label>
                  Cadence
                  <select
                    value={subscriptionForm.cadence}
                    onChange={(event) =>
                      updateSubscriptionForm("cadence", event.target.value)
                    }
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </label>
                <label>
                  Remind days before
                  <input
                    min="0"
                    step="1"
                    type="number"
                    value={subscriptionForm.reminderDaysBefore}
                    onChange={(event) =>
                      updateSubscriptionForm(
                        "reminderDaysBefore",
                        event.target.value
                      )
                    }
                  />
                </label>
                <label>
                  Status
                  <select
                    value={subscriptionForm.status}
                    onChange={(event) =>
                      updateSubscriptionForm("status", event.target.value)
                    }
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
                <label className="subscription-notes-field">
                  Notes
                  <textarea
                    value={subscriptionForm.notes}
                    onChange={(event) =>
                      updateSubscriptionForm("notes", event.target.value)
                    }
                  />
                </label>
                <button
                  className="primary-action"
                  type="button"
                  onClick={createCustomSubscription}
                  disabled={!isSubscriptionFormValid(subscriptionForm)}
                >
                  Add subscription
                </button>
              </div>
            </section>

            <section className="subscription-list-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Renewals</p>
                  <h2>{subscriptions.length} saved subscriptions</h2>
                </div>
              </div>
              {sortedSubscriptions.length > 0 ? (
                <div className="subscription-list">
                  {sortedSubscriptions.map((subscription) => {
                    const isEditingSubscription =
                      editingSubscriptionId === subscription.id;
                    const isConfirmingDelete =
                      confirmingSubscriptionDeleteId === subscription.id;

                    return (
                      <article className="subscription-row" key={subscription.id}>
                        {isEditingSubscription ? (
                          <>
                            <div className="subscription-form-grid inline">
                              <label>
                                Name
                                <input
                                  value={editingSubscriptionForm.name}
                                  onChange={(event) =>
                                    updateEditingSubscriptionForm(
                                      "name",
                                      event.target.value
                                    )
                                  }
                                />
                              </label>
                              <label>
                                Amount
                                <input
                                  min="0"
                                  step="0.01"
                                  type="number"
                                  value={editingSubscriptionForm.amount}
                                  onChange={(event) =>
                                    updateEditingSubscriptionForm(
                                      "amount",
                                      event.target.value
                                    )
                                  }
                                />
                              </label>
                              <label>
                                Next renewal
                                <input
                                  type="date"
                                  value={editingSubscriptionForm.nextRenewalDate}
                                  onChange={(event) =>
                                    updateEditingSubscriptionForm(
                                      "nextRenewalDate",
                                      event.target.value
                                    )
                                  }
                                />
                              </label>
                              <label>
                                Category
                                <select
                                  value={editingSubscriptionForm.categoryId}
                                  onChange={(event) =>
                                    handleCategorySelectChange(event, (id) =>
                                      updateEditingSubscriptionForm(
                                        "categoryId",
                                        id
                                      )
                                    )
                                  }
                                >
                                  <option value="">Uncategorized</option>
                                  {getSelectableCategories(
                                    subscription.categoryId
                                  ).map((category) => (
                                    <option key={category.id} value={category.id}>
                                      {category.name}
                                    </option>
                                  ))}
                                  <option value="__create__">+ Add new category…</option>
                                </select>
                              </label>
                              <label>
                                Cadence
                                <select
                                  value={editingSubscriptionForm.cadence}
                                  onChange={(event) =>
                                    updateEditingSubscriptionForm(
                                      "cadence",
                                      event.target.value
                                    )
                                  }
                                >
                                  <option value="weekly">Weekly</option>
                                  <option value="monthly">Monthly</option>
                                  <option value="yearly">Yearly</option>
                                </select>
                              </label>
                              <label>
                                Remind days before
                                <input
                                  min="0"
                                  step="1"
                                  type="number"
                                  value={editingSubscriptionForm.reminderDaysBefore}
                                  onChange={(event) =>
                                    updateEditingSubscriptionForm(
                                      "reminderDaysBefore",
                                      event.target.value
                                    )
                                  }
                                />
                              </label>
                              <label>
                                Status
                                <select
                                  value={editingSubscriptionForm.status}
                                  onChange={(event) =>
                                    updateEditingSubscriptionForm(
                                      "status",
                                      event.target.value
                                    )
                                  }
                                >
                                  <option value="active">Active</option>
                                  <option value="paused">Paused</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                              </label>
                              <label className="subscription-notes-field">
                                Notes
                                <textarea
                                  value={editingSubscriptionForm.notes}
                                  onChange={(event) =>
                                    updateEditingSubscriptionForm(
                                      "notes",
                                      event.target.value
                                    )
                                  }
                                />
                              </label>
                            </div>
                            <div className="transaction-actions">
                              <button
                                className="primary-action compact"
                                type="button"
                                onClick={() => saveSubscriptionEdit(subscription.id)}
                              >
                                Save
                              </button>
                              <button
                                className="ghost-action compact"
                                type="button"
                                onClick={cancelEditingSubscription}
                              >
                                Cancel
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <strong>{subscription.name}</strong>
                              <span>
                                {categoryById.get(subscription.categoryId)?.name ||
                                  "Uncategorized"}
                              </span>
                            </div>
                            <div>{formatMoney(subscription.amount)}</div>
                            <div>{formatType(subscription.cadence || "monthly")}</div>
                            <div>{subscription.nextRenewalDate}</div>
                            <div>{formatType(subscription.status || "active")}</div>
                            <div className="transaction-actions">
                              <button
                                className="icon-action"
                                type="button"
                                aria-label={`Edit ${subscription.name}`}
                                onClick={() => startEditingSubscription(subscription)}
                              >
                                <FaEdit aria-hidden="true" />
                              </button>
                              <button
                                className={`icon-action danger ${
                                  isConfirmingDelete ? "confirming" : ""
                                }`}
                                type="button"
                                aria-label={
                                  isConfirmingDelete
                                    ? `Confirm delete ${subscription.name}`
                                    : `Delete ${subscription.name}`
                                }
                                onClick={() => deleteSubscription(subscription.id)}
                              >
                                <FaTrash aria-hidden="true" />
                              </button>
                            </div>
                            {isConfirmingDelete ? (
                              <p className="delete-confirmation">
                                Select delete again to remove this subscription.
                              </p>
                            ) : null}
                          </>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-review">
                  Add a subscription to see upcoming renewals in Reports.
                </div>
              )}
            </section>
          </div>
        </section>
      ) : null}

      {activeTab === "reports" ? (
        <section className="reports-workspace">
          <div className="report-controls">
            <select
              className="month-select"
              aria-label="Select report month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
            >
              <option value={ALL_MONTHS}>All months</option>
              {[selectedMonth, ...monthOptions]
                .filter((month) => month && month !== ALL_MONTHS)
                .filter((month, index, months) => months.indexOf(month) === index)
                .map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
            </select>
            <label className="self-transfer-toggle">
              <input
                checked={includeSelfTransfers}
                type="checkbox"
                onChange={(event) => setIncludeSelfTransfers(event.target.checked)}
              />
              Include self-transfers
            </label>
          </div>

          <div className="report-grid">
            <section className="report-main">
              <p className="eyebrow">Monthly report</p>
              <h2>{selectedMonth === ALL_MONTHS ? "All months" : selectedMonth}</h2>
              <div className="cashflow-bars" aria-label="Monthly cashflow chart">
                <div
                  style={{
                    height: getBarHeight(monthSummary.income, maxCashflowValue),
                  }}
                >
                  <span>{formatMoney(monthSummary.income)}</span>
                  Income
                </div>
                <div
                  style={{
                    height: getBarHeight(monthSummary.expenses, maxCashflowValue),
                  }}
                >
                  <span>{formatMoney(monthSummary.expenses)}</span>
                  Spending
                </div>
                <div
                  style={{
                    height: getBarHeight(
                      monthSummary.selfTransfers,
                      maxCashflowValue
                    ),
                  }}
                >
                  <span>{formatMoney(monthSummary.selfTransfers)}</span>
                  Self-transfer
                </div>
              </div>
            </section>

            <aside className="report-side">
              <section>
                <p className="eyebrow">Category spending</p>
                {sortedCategorySpending.length > 0 ? (
                  sortedCategorySpending.map(([categoryId, total]) => (
                    <div className="report-list-row" key={categoryId}>
                      <span>
                        {categoryById.get(categoryId)?.name || "Uncategorized"}
                      </span>
                      <strong>{formatMoney(total)}</strong>
                    </div>
                  ))
                ) : (
                  <p className="muted-copy">No spending yet for this month.</p>
                )}
              </section>

              <section>
                <p className="eyebrow">Upcoming subscriptions</p>
                {upcomingSubscriptions.length > 0 ? (
                  upcomingSubscriptions.map((subscription) => (
                    <div className="report-list-row" key={subscription.id}>
                      <span>
                        {subscription.name}
                        <small>
                          {categoryById.get(subscription.categoryId)?.name ||
                            "Uncategorized"}{" "}
                          - {subscription.nextRenewalDate}
                        </small>
                      </span>
                      <strong>
                        {formatMoney(subscription.amount)} /{" "}
                        {formatType(subscription.cadence)}
                      </strong>
                    </div>
                  ))
                ) : (
                  <p className="muted-copy">No subscriptions due soon.</p>
                )}
              </section>
            </aside>
          </div>
        </section>
      ) : null}
    </main>
  );
}
