const MONTH_INDEX = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

const ACTIVITY_SECTIONS = new Set([
  "Deposits",
  "Electronic Deposits",
  "Electronic Payments",
  "Other Withdrawals",
  "Withdrawals",
  "Checks Paid",
]);

const CREDIT_SECTIONS = new Set(["Deposits", "Electronic Deposits"]);

const STOP_SECTIONS = [
  "How to Balance your Account",
  "DAILY BALANCE SUMMARY",
  "Error Resolution Notice",
  "Finance Charge",
  "Important Account Information",
];

function normalizeWhitespace(value) {
  return value.trim().replace(/\s+/g, " ");
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseMoney(value) {
  return Number(value.replace(/[$,]/g, ""));
}

function formatDate(year, monthIndex, day) {
  const month = String(monthIndex + 1).padStart(2, "0");
  const paddedDay = String(day).padStart(2, "0");

  return `${year}-${month}-${paddedDay}`;
}

function parseStatementPeriod(text) {
  const match = text.match(
    /Statement Period:\s*([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})-([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})/i
  );

  if (!match) {
    return null;
  }

  const [, startMonth, startDay, startYear, endMonth, endDay, endYear] = match;

  return {
    startDate: formatDate(
      Number(startYear),
      MONTH_INDEX[startMonth.toLowerCase()],
      Number(startDay)
    ),
    endDate: formatDate(
      Number(endYear),
      MONTH_INDEX[endMonth.toLowerCase()],
      Number(endDay)
    ),
    raw: `${startMonth} ${startDay} ${startYear}-${endMonth} ${endDay} ${endYear}`,
  };
}

function extractMetadata(text) {
  const statementPeriod = parseStatementPeriod(text);
  const page = text.match(/Page:\s*([^\n]+)/i)?.[1]?.trim() || null;
  const customerReference =
    text.match(/Cust Ref #:\s*([^\n]+)/i)?.[1]?.trim() || null;
  const primaryAccountNumber =
    text.match(/Primary Account #:\s*([^\n]+)/i)?.[1]?.trim() || null;
  const accountNumber =
    text.match(/^Account #:\s*([^\n]+)/im)?.[1]?.trim() || null;
  const accountProductLabel =
    text.match(/Account Product Label:\s*([^\n]+)/i)?.[1]?.trim() || null;

  return {
    statementPeriod,
    page,
    customerReference,
    primaryAccountNumber,
    accountNumber,
    accountProductLabel,
  };
}

function resolvePostingDate(postingDate, statementPeriod) {
  const [monthText, dayText] = postingDate.split("/");
  const month = Number(monthText);
  const day = Number(dayText);
  const startYear = Number(statementPeriod.startDate.slice(0, 4));
  const endYear = Number(statementPeriod.endDate.slice(0, 4));
  const startMonth = Number(statementPeriod.startDate.slice(5, 7));
  const year =
    startYear !== endYear && month < startMonth ? endYear : startYear;

  return formatDate(year, month - 1, day);
}

function classifyTransaction(section, narration) {
  const upperNarration = narration.toUpperCase();
  const compactNarration = upperNarration.replace(/\s+/g, "");

  if (compactNarration.includes("TDZELLESENT")) {
    return {
      type: "transfer_to_other",
      counterpartyType: "external_person",
      confidence: "high",
      needsReview: false,
    };
  }

  if (compactNarration.includes("TDZELLERECEIVED")) {
    return {
      type: "income",
      counterpartyType: "external_person",
      confidence: "high",
      needsReview: false,
    };
  }

  if (
    upperNarration.includes("TRANSFER TO SAVINGS") ||
    upperNarration.includes("TRANSFER TO CHECKING") ||
    upperNarration.includes("ACCOUNT TO ACCOUNT")
  ) {
    return {
      type: "transfer_to_self",
      counterpartyType: "self",
      confidence: "medium",
      needsReview: false,
    };
  }

  if (section === "Deposits" || section === "Electronic Deposits") {
    return {
      type: "income",
      counterpartyType: "external_account",
      confidence: "medium",
      needsReview: false,
    };
  }

  if (
    compactNarration.includes("PAYPALTRANSFER") ||
    compactNarration.includes("ELECTRONICPMT-WEB")
  ) {
    return {
      type: "expense",
      counterpartyType: "unknown",
      confidence: "low",
      needsReview: true,
    };
  }

  return {
    type: "expense",
    counterpartyType: "unknown",
    confidence: "medium",
    needsReview: false,
  };
}

function suggestCategory(narration, type) {
  const upperNarration = narration.toUpperCase();

  if (type === "income") {
    return "Income";
  }

  if (upperNarration.includes("WALMART") || upperNarration.includes("AMAZON")) {
    return "Shopping";
  }

  if (upperNarration.includes("STOP SHOP")) {
    return "Groceries";
  }

  if (upperNarration.includes("QUALITYFUEL")) {
    return "Fuel";
  }

  return null;
}

function buildFingerprint({ date, narration, signedAmount }) {
  return `td_bank_pdf:${date}:${narration.toLowerCase()}:${Math.abs(
    signedAmount
  ).toFixed(2)}`;
}

function createTransaction({ section, statementPeriod, postingDate, narration, amount }) {
  const date = resolvePostingDate(postingDate, statementPeriod);
  const classification = classifyTransaction(section, narration);
  const isDebitSection = !CREDIT_SECTIONS.has(section);
  const signedAmount = isDebitSection ? -Math.abs(amount) : Math.abs(amount);

  return {
    rawSection: section,
    date,
    description: normalizeWhitespace(narration),
    merchant: null,
    amount: signedAmount,
    type: classification.type,
    counterpartyType: classification.counterpartyType,
    categorySuggestion: suggestCategory(narration, classification.type),
    confidence: classification.confidence,
    needsReview: classification.needsReview,
    source: "td_bank_pdf",
    rawNarration: normalizeWhitespace(narration),
    importFingerprint: buildFingerprint({
      date,
      narration: normalizeWhitespace(narration),
      signedAmount,
    }),
  };
}

function isSectionHeader(line) {
  return ACTIVITY_SECTIONS.has(line);
}

function resolveSectionHeader(line) {
  const normalizedLine = line.replace(/\s+\(continued\)$/i, "");

  return isSectionHeader(normalizedLine) ? normalizedLine : null;
}

function isStopSection(line) {
  return STOP_SECTIONS.some((stopSection) => line.startsWith(stopSection));
}

function parseTransactionLine(line) {
  return line.match(/^(\d{2}\/\d{2})\s+(.+?)\s+(-?\$?[\d,]+\.\d{2})$/);
}

function parseTransactionStartLine(line) {
  return line.match(/^(\d{2}\/\d{2})\s+(.+)$/);
}

function finalizePendingRow(pendingRow) {
  const fullNarration = pendingRow.narrationLines.join(" ");
  const amountMatches = [...fullNarration.matchAll(/(-?\$?[\d,]+\.\d{2})/g)];

  if (amountMatches.length === 0) {
    return {
      ...pendingRow,
      narration: fullNarration,
      amount: 0,
    };
  }

  const lastMatch = amountMatches[amountMatches.length - 1];
  const before = fullNarration.slice(0, lastMatch.index).trim();
  const after = fullNarration.slice(lastMatch.index + lastMatch[0].length).trim();
  const narration = `${before} ${after}`.trim().replace(/\s+/g, " ");

  return {
    ...pendingRow,
    narration,
    amount: parseMoney(lastMatch[1]),
  };
}

function pendingRowHasTerminalAmount(pendingRow) {
  return /(-?\$?[\d,]+\.\d{2})$/.test(pendingRow.narrationLines.join(" "));
}

function isMerchantTailLine(line) {
  // TD POS / DBCRD merchant tail lines end with "* XX" where XX is a 2-letter
  // state or region code (e.g. "EMF K LOVE 800 525 5683 * CA"). Page-break
  // boilerplate ("STATEMENT OF ACCOUNT", "Call 1-800-...", "Page: 4 of 5")
  // never matches this signature.
  return /\*\s+[A-Z]{2}$/.test(line);
}

function parseActivity(text, statementPeriod) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const transactions = [];
  const sectionTotals = [];
  let currentSection = null;
  let pendingRow = null;

  const flushPendingRow = () => {
    if (!pendingRow) {
      return;
    }

    const finalizedRow = finalizePendingRow(pendingRow);

    transactions.push(
      createTransaction({
        section: currentSection,
        statementPeriod,
        postingDate: finalizedRow.postingDate,
        narration: finalizedRow.narration,
        amount: finalizedRow.amount,
      })
    );
    pendingRow = null;
  };

  for (const line of lines) {
    if (isStopSection(line)) {
      flushPendingRow();
      currentSection = null;
      continue;
    }

    const sectionHeader = resolveSectionHeader(line);

    if (sectionHeader) {
      flushPendingRow();
      currentSection = sectionHeader;
      continue;
    }

    if (!currentSection || line.includes("POSTING DATE")) {
      continue;
    }

    const subtotalMatch = line.match(/^Subtotal:\s*\$?([\d,]+\.\d{2})$/i);

    if (subtotalMatch) {
      flushPendingRow();
      sectionTotals.push({
        section: currentSection,
        expectedTotal: parseMoney(subtotalMatch[1]),
      });
      currentSection = null;
      continue;
    }

    const transactionMatch = parseTransactionLine(line);

    if (transactionMatch) {
      flushPendingRow();
      // Route single-line transactions through the same pending-row pipeline so
      // a merchant tail on the next line (e.g. "EMF K LOVE 800 525 5683 * CA")
      // can still be appended before the row is finalized.
      pendingRow = {
        postingDate: transactionMatch[1],
        narrationLines: [`${transactionMatch[2]} ${transactionMatch[3]}`],
        saturated: false,
      };
      continue;
    }

    const transactionStartMatch = parseTransactionStartLine(line);

    if (transactionStartMatch) {
      flushPendingRow();
      pendingRow = {
        postingDate: transactionStartMatch[1],
        narrationLines: [transactionStartMatch[2]],
        saturated: false,
      };
      continue;
    }

    if (pendingRow) {
      if (pendingRow.saturated) {
        flushPendingRow();
        continue;
      }

      if (pendingRowHasTerminalAmount(pendingRow)) {
        if (isMerchantTailLine(line)) {
          pendingRow.narrationLines.push(line);
          pendingRow.saturated = true;
          continue;
        }

        flushPendingRow();
        continue;
      }

      pendingRow.narrationLines.push(line);
    }
  }

  flushPendingRow();

  return {
    transactions,
    sectionTotals,
  };
}

function reconcileSections(transactions, sectionTotals) {
  const sectionNames = Array.from(
    new Set(sectionTotals.map((sectionTotal) => sectionTotal.section))
  );

  return sectionNames.map((sectionName) => {
    const expectedTotal = roundMoney(
      sectionTotals
        .filter((sectionTotal) => sectionTotal.section === sectionName)
        .reduce((sum, sectionTotal) => sum + sectionTotal.expectedTotal, 0)
    );
    const parsedTotal = roundMoney(
      transactions
        .filter((transaction) => transaction.rawSection === sectionName)
        .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0)
    );
    const difference = roundMoney(parsedTotal - expectedTotal);

    return {
      section: sectionName,
      parsedTotal,
      expectedTotal,
      difference,
      status: difference === 0 ? "matched" : "needs_review",
    };
  });
}

export function parseTdBankStatementText(text) {
  const metadata = extractMetadata(text);
  const parsedActivity = parseActivity(text, metadata.statementPeriod);
  const transactions = parsedActivity.transactions.map((transaction) => {
    const { rawSection, ...visibleTransaction } = transaction;
    return visibleTransaction;
  });

  return {
    metadata,
    transactions,
    reconciliation: reconcileSections(
      parsedActivity.transactions,
      parsedActivity.sectionTotals
    ),
  };
}
