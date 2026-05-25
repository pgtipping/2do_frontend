import React, { useEffect, useMemo, useState } from "react";
import {
  FaChartPie,
  FaCheck,
  FaDownload,
  FaExclamationTriangle,
  FaFileImport,
  FaListUl,
} from "react-icons/fa";
import { createDefaultCategories } from "../defaultCategories";
import { createFinanceRepository } from "../storage/localFinanceStore";
import { extractTextFromPdfFile } from "../imports/pdfTextExtractor";
import { parseTdBankStatementText } from "../imports/tdBankStatementParser";
import { createReviewedImportDraft } from "../imports/reviewedImportDraft";
import {
  calculateCategorySpending,
  calculateMonthlySummary,
  getUpcomingSubscriptions,
} from "../reports";
import { createJsonBackup, exportTransactionsCsv } from "../backup";
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

export default function FinanceImportScreen() {
  const [activeTab, setActiveTab] = useState("import");
  const [statementText, setStatementText] = useState(SAMPLE_STATEMENT_TEXT);
  const [draft, setDraft] = useState(null);
  const [saveResult, setSaveResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [pdfStatus, setPdfStatus] = useState("");
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [financeData, setFinanceData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("2025-01");
  const [includeSelfTransfers, setIncludeSelfTransfers] = useState(false);
  const defaultCategories = useMemo(() => createDefaultCategories(), []);
  const repository = useMemo(() => createFinanceRepository(), []);
  const categories =
    financeData?.categories?.length > 0 ? financeData.categories : defaultCategories;
  const transactions = financeData?.transactions || [];
  const subscriptions = financeData?.subscriptions || [];
  const categoryRules = financeData?.categoryRules || [];

  const loadFinanceData = async () => {
    const data = await repository.loadData();
    const hydratedData = {
      ...data,
      categories: data.categories.length > 0 ? data.categories : defaultCategories,
    };
    const months = Array.from(
      new Set(hydratedData.transactions.map((transaction) => getMonthKey(transaction.date)))
    ).sort();

    setFinanceData(hydratedData);

    if (months.length > 0 && !months.includes(selectedMonth)) {
      setSelectedMonth(months[months.length - 1]);
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
      setSelectedRows(new Set(nextDraft.rows.map((row) => row.id)));
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
      } else {
        nextRows.add(rowId);
      }

      return nextRows;
    });
  };

  const updateRowCategory = (rowId, categoryId) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      rows: currentDraft.rows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              transaction: {
                ...row.transaction,
                categoryId: categoryId || null,
              },
            }
          : row
      ),
    }));
  };

  const saveSelectedRows = async () => {
    if (!draft) {
      return;
    }

    const selectedDraft = {
      ...draft,
      rows: draft.rows.filter((row) => selectedRows.has(row.id)),
    };
    const result = await repository.saveReviewedImport(selectedDraft);

    setSaveResult(result);
    await loadFinanceData();
    setActiveTab("ledger");
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

  const readyCount = draft?.rows.filter((row) => row.status === "ready").length || 0;
  const reviewCount =
    draft?.rows.filter((row) => row.status === "needs_review").length || 0;
  const selectedCount = selectedRows.size;
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
    .filter((transaction) => getMonthKey(transaction.date) === selectedMonth)
    .sort((first, second) => second.date.localeCompare(first.date));
  const categoryById = new Map(
    categories.map((category) => [category.id, category])
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
        </div>
      </section>

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
              <button
                className="ghost-action"
                type="button"
                onClick={() => setStatementText("")}
              >
                Clear
              </button>
            </div>
          </div>
          <textarea
            aria-label="TD Bank statement text"
            value={statementText}
            onChange={(event) => setStatementText(event.target.value)}
            spellCheck="false"
          />
          {pdfStatus ? <p className="pdf-status">{pdfStatus}</p> : null}
          {errorMessage ? <p className="error-message">{errorMessage}</p> : null}
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

          <div className="import-metrics" aria-label="Import metrics">
            <div>
              <span>{readyCount}</span>
              Ready
            </div>
            <div>
              <span>{reviewCount}</span>
              Review
            </div>
            <div>
              <span>{selectedCount}</span>
              Selected
            </div>
          </div>

          {draft ? (
            <div className="review-table">
              {draft.rows.map((row) => (
                <article className="review-row" key={row.id}>
                  <label className="row-select">
                    <input
                      checked={selectedRows.has(row.id)}
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
                        updateRowCategory(row.id, event.target.value)
                      }
                    >
                      <option value="">Uncategorized</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {row.categorySource === "learned" ? (
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
              ))}
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

          {saveResult ? (
            <p className="save-result">
              Saved {saveResult.createdTransactionCount} new transactions.
              Skipped {saveResult.duplicateTransactionCount} duplicates.
            </p>
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
              <h2>{selectedMonth} transactions</h2>
            </div>
            <select
              className="month-select"
              aria-label="Select ledger month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
            >
              {[selectedMonth, ...monthOptions]
                .filter((month, index, months) => months.indexOf(month) === index)
                .map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
            </select>
          </div>

          {monthTransactions.length > 0 ? (
            <div className="transaction-table">
              {monthTransactions.map((transaction) => (
                <article className="transaction-row" key={transaction.id}>
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
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-review">
              Save an import to start filling the ledger.
            </div>
          )}
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
              {[selectedMonth, ...monthOptions]
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
              <h2>{selectedMonth}</h2>
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
                      <span>{subscription.name}</span>
                      <strong>{subscription.daysUntilRenewal} days</strong>
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
