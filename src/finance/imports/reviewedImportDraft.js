import { createImportBatch, createTransaction } from "../domain.js";
import {
  findCategoryById,
  findCategoryRuleForTransaction,
} from "../categoryRules.js";

function pluralize(count, noun) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

// Builds the user-facing confirmation shown after "Save Selected": a headline,
// an optional detail line (duplicates skipped / rows still needing a category),
// and a tone for styling. Pure so the copy and its edge cases are testable.
export function summarizeReviewedImportSave({
  createdTransactionCount = 0,
  duplicateTransactionCount = 0,
  remainingCount = 0,
} = {}) {
  let headline;
  let tone;
  const details = [];

  if (createdTransactionCount > 0) {
    headline = `Saved ${pluralize(
      createdTransactionCount,
      "transaction"
    )} to your ledger.`;
    tone = "success";

    // Only worth calling out duplicates when something new did land — when
    // nothing landed, the headline below already explains the duplicates.
    if (duplicateTransactionCount > 0) {
      details.push(`Skipped ${pluralize(duplicateTransactionCount, "duplicate")}.`);
    }
  } else if (duplicateTransactionCount > 0) {
    const alreadySaved =
      duplicateTransactionCount === 1
        ? "that row was"
        : `all ${duplicateTransactionCount} rows were`;
    headline = `No new transactions — ${alreadySaved} already in your ledger.`;
    tone = "neutral";
  } else {
    headline = "Nothing saved.";
    tone = "neutral";
  }

  if (remainingCount > 0) {
    const verb = remainingCount === 1 ? "needs" : "need";
    details.push(
      `${pluralize(remainingCount, "row")} still ${verb} a category, kept below.`
    );
  }

  return {
    tone,
    headline,
    detail: details.join(" ") || null,
  };
}

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
  categories = [],
  categoryRules = [],
  now,
  createId,
}) {
  const reconciliationIssue = hasReconciliationIssue(
    parsedStatement.reconciliation
  );
  const rows = parsedStatement.transactions.map((parsedTransaction) => {
    const reviewReasons = getReviewReasons(parsedTransaction, reconciliationIssue);
    const learnedRule = findCategoryRuleForTransaction(
      categoryRules,
      parsedTransaction
    );
    const learnedCategory = findCategoryById(
      categories,
      learnedRule?.categoryId
    );
    const parserCategory =
      categories.find(
        (category) =>
          category.name.toLowerCase() ===
          String(parsedTransaction.categorySuggestion || "").toLowerCase()
      ) || null;
    const appliedCategory = learnedCategory || parserCategory;
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
      categoryId: appliedCategory?.id || null,
      source: parsedTransaction.source,
      rawNarration: parsedTransaction.rawNarration,
      importFingerprint: parsedTransaction.importFingerprint,
    });

    return {
      id: createId("review"),
      status: reviewReasons.length > 0 ? "needs_review" : "ready",
      confidence: parsedTransaction.confidence,
      categorySuggestion:
        learnedCategory?.name || parsedTransaction.categorySuggestion || null,
      categorySource: learnedCategory ? "learned" : parserCategory ? "parser" : null,
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
