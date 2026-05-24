import { createImportBatch, createTransaction } from "../domain.js";

function hasReconciliationIssue(reconciliation = []) {
  return reconciliation.some((item) => item.status !== "matched");
}

function getReviewReasons(parsedTransaction, reconciliationIssue) {
  const reasons = [];

  if (parsedTransaction.needsReview) {
    reasons.push("Parser marked this row for review.");
  }

  if (parsedTransaction.confidence === "low") {
    reasons.push("Low confidence classification.");
  }

  if (reconciliationIssue) {
    reasons.push("Statement totals do not match parsed rows.");
  }

  return reasons;
}

export function createReviewedImportDraft({
  accountId,
  fileName,
  parsedStatement,
  now,
  createId,
}) {
  const reconciliationIssue = hasReconciliationIssue(
    parsedStatement.reconciliation
  );
  const rows = parsedStatement.transactions.map((parsedTransaction) => {
    const reviewReasons = getReviewReasons(parsedTransaction, reconciliationIssue);
    const transaction = createTransaction({
      createId,
      now,
      accountId,
      date: parsedTransaction.date,
      description: parsedTransaction.description,
      merchant: parsedTransaction.merchant,
      amount: parsedTransaction.amount,
      type: parsedTransaction.type,
      counterpartyType: parsedTransaction.counterpartyType,
      categoryId: null,
      source: parsedTransaction.source,
      rawNarration: parsedTransaction.rawNarration,
      importFingerprint: parsedTransaction.importFingerprint,
    });

    return {
      id: createId("review"),
      status: reviewReasons.length > 0 ? "needs_review" : "ready",
      confidence: parsedTransaction.confidence,
      categorySuggestion: parsedTransaction.categorySuggestion || null,
      reviewReasons,
      transaction,
    };
  });

  return {
    importBatch: createImportBatch({
      createId,
      now,
      source: "td_bank_pdf",
      fileName,
      rowCount: rows.length,
    }),
    reconciliation: parsedStatement.reconciliation,
    rows,
  };
}
