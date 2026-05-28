// Tokens that change per transaction (auth codes, payment reference IDs,
// in-description month names) must be stripped before category-rule
// comparison, otherwise two charges at the same merchant in different
// months never match.
//
// Examples:
//   TD POS / DBCRD rows: "...AUT 020325 VISA DDA PUR AP..." — the 6-digit
//     auth code differs per charge.
//   TD Zelle rows: "TD ZELLE SENT, 503500P0LARU Zelle JUSTUS GEORGE" —
//     the alphanumeric reference token differs per transfer.
//   Subscription merchant text: "CURSOR USAGE JAN CURSOR COM * NY" —
//     the month abbreviation rolls over each cycle (JAN, FEB, MAR, ...).
//
// Strip all three shapes before falling through to the existing money +
// non-alphanumeric normalization.
const MONTH_TOKEN_PATTERN =
  /\b(JAN(UARY)?|FEB(RUARY)?|MAR(CH)?|APR(IL)?|MAY|JUN(E)?|JUL(Y)?|AUG(UST)?|SEP(TEMBER)?|OCT(OBER)?|NOV(EMBER)?|DEC(EMBER)?)\b/g;

function stripPerTransactionTokens(value) {
  return value
    .replace(/\bAUT\s+[A-Z0-9]+\b/g, " ")
    .replace(/\b(?=[A-Z0-9]*\d)(?=[A-Z0-9]*[A-Z])[A-Z0-9]{8,}\b/g, " ")
    .replace(/\b\d{6}\b/g, " ")
    .replace(MONTH_TOKEN_PATTERN, " ");
}

export function normalizeCategoryRuleText(value) {
  const upper = String(value || "").toUpperCase();

  return stripPerTransactionTokens(upper.replace(/\$?[\d,]+\.\d{2}/g, " "))
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function getCategoryRuleText(transaction) {
  return normalizeCategoryRuleText(
    transaction.rawNarration || transaction.description || ""
  );
}

export function findCategoryRuleForTransaction(categoryRules = [], transaction = {}) {
  const transactionText = getCategoryRuleText(transaction);

  if (!transactionText) {
    return null;
  }

  return (
    categoryRules
      .filter((rule) => !rule.archivedAt)
      .map((rule) => ({
        ...rule,
        normalizedMatchText: normalizeCategoryRuleText(rule.matchText),
      }))
      .filter((rule) => rule.normalizedMatchText)
      .sort(
        (first, second) =>
          second.normalizedMatchText.length - first.normalizedMatchText.length
      )
      .find(
        (rule) =>
          transactionText.includes(rule.normalizedMatchText) ||
          rule.normalizedMatchText.includes(transactionText)
      ) || null
  );
}

export function findCategoryById(categories = [], categoryId) {
  return categories.find((category) => category.id === categoryId) || null;
}
