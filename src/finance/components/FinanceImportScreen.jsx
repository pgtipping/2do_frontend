import React, { useMemo, useState } from "react";
import { FaCheck, FaExclamationTriangle, FaFileImport } from "react-icons/fa";
import { createDefaultCategories, findCategoryBySuggestion } from "../defaultCategories";
import { createFinanceRepository } from "../storage/localFinanceStore";
import { extractTextFromPdfFile } from "../imports/pdfTextExtractor";
import { parseTdBankStatementText } from "../imports/tdBankStatementParser";
import { createReviewedImportDraft } from "../imports/reviewedImportDraft";
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

export default function FinanceImportScreen() {
  const [statementText, setStatementText] = useState(SAMPLE_STATEMENT_TEXT);
  const [draft, setDraft] = useState(null);
  const [saveResult, setSaveResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [pdfStatus, setPdfStatus] = useState("");
  const [selectedRows, setSelectedRows] = useState(new Set());
  const categories = useMemo(() => createDefaultCategories(), []);
  const repository = useMemo(() => createFinanceRepository(), []);

  const parseStatement = () => {
    setErrorMessage("");
    setSaveResult(null);

    try {
      const parsedStatement = parseTdBankStatementText(statementText);
      const nextDraft = createReviewedImportDraft({
        accountId: "acct_td_checking",
        fileName: "td-bank-statement.txt",
        parsedStatement,
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

  const saveSelectedRows = async () => {
    if (!draft) {
      return;
    }

    const selectedDraft = {
      ...draft,
      rows: draft.rows
        .filter((row) => selectedRows.has(row.id))
        .map((row) => {
          const matchedCategory = findCategoryBySuggestion(
            categories,
            row.categorySuggestion
          );

          return {
            ...row,
            transaction: {
              ...row.transaction,
              categoryId: matchedCategory?.id || null,
            },
          };
        }),
    };
    const result = await repository.saveReviewedImport(selectedDraft);

    setSaveResult(result);
  };

  const readyCount = draft?.rows.filter((row) => row.status === "ready").length || 0;
  const reviewCount =
    draft?.rows.filter((row) => row.status === "needs_review").length || 0;
  const selectedCount = selectedRows.size;

  return (
    <main className="finance-shell">
      <section className="finance-hero">
        <div>
          <p className="finance-kicker">Personal Finance Import</p>
          <h1>Review TD Bank activity before it touches your ledger.</h1>
        </div>
        <button className="primary-action" type="button" onClick={parseStatement}>
          <FaFileImport aria-hidden="true" />
          Parse Statement
        </button>
      </section>

      <section className="import-workspace">
        <div className="statement-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Statement Text</p>
              <h2>TD Bank Source</h2>
            </div>
            <div className="source-actions">
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
                    {row.categorySuggestion || "Uncategorized"}
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
    </main>
  );
}
