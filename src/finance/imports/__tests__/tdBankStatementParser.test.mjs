import assert from "node:assert/strict";
import { test } from "node:test";

import { parseTdBankStatementText } from "../tdBankStatementParser.js";

const SAMPLE_STATEMENT_TEXT = `
Page: 1 of 6
Statement Period: Dec 04 2024-Jan 03 2025
Cust Ref #: xxxxxx8531-630-E-***
Primary Account #: xxx-xxx8531
Account #: xxx-xxx8531
Account Product Label: TD Convenience Checking

ACCOUNT SUMMARY
Beginning Balance $1,100.00
Deposits $1,250.00
Electronic Deposits $2,400.00
Electronic Payments $1,197.91
Ending Balance $3,552.09

DAILY ACCOUNT ACTIVITY
Deposits
POSTING DATE DESCRIPTION AMOUNT
12/05 MOBILE DEPOSIT 1,250.00
Subtotal: 1,250.00

Electronic Deposits
POSTING DATE DESCRIPTION AMOUNT
01/03 TD ZELLERECEIVED FROM JANE DOE 200.00
01/03 ACHDEPOSIT PAYROLL COMPANY 2,200.00
Subtotal: 2,400.00

Electronic Payments
POSTING DATE DESCRIPTION AMOUNT
12/20 TD ZELLESENT JOHN DOE
RENT PAYMENT 800.00
12/22 WALMART STORE 42.91
01/02 TRANSFER TO SAVINGS 300.00
01/02 ELECTRONICPMT-WEB CREDIT CARD 55.00
Subtotal: 1,197.91

How to Balance your Account
This section is informational and should not become a transaction.
`;

test("parses TD Bank statement metadata", () => {
  const result = parseTdBankStatementText(SAMPLE_STATEMENT_TEXT);

  assert.deepEqual(result.metadata.statementPeriod, {
    startDate: "2024-12-04",
    endDate: "2025-01-03",
    raw: "Dec 04 2024-Jan 03 2025",
  });
  assert.equal(result.metadata.page, "1 of 6");
  assert.equal(result.metadata.primaryAccountNumber, "xxx-xxx8531");
  assert.equal(result.metadata.accountProductLabel, "TD Convenience Checking");
});

test("parses activity rows and keeps multiline narration together", () => {
  const result = parseTdBankStatementText(SAMPLE_STATEMENT_TEXT);
  const zelleSent = result.transactions.find((transaction) =>
    transaction.rawNarration.includes("TD ZELLESENT")
  );

  assert.equal(result.transactions.length, 7);
  assert.equal(zelleSent.date, "2024-12-20");
  assert.equal(zelleSent.description, "TD ZELLESENT JOHN DOE RENT PAYMENT");
  assert.equal(zelleSent.amount, -800);
  assert.equal(zelleSent.type, "transfer_to_other");
  assert.equal(zelleSent.counterpartyType, "external_person");
  assert.equal(zelleSent.needsReview, false);
});

test("classifies deposits, self transfers, and uncertain payments for review", () => {
  const result = parseTdBankStatementText(SAMPLE_STATEMENT_TEXT);
  const received = result.transactions.find((transaction) =>
    transaction.rawNarration.includes("TD ZELLERECEIVED")
  );
  const selfTransfer = result.transactions.find((transaction) =>
    transaction.rawNarration.includes("TRANSFER TO SAVINGS")
  );
  const uncertainPayment = result.transactions.find((transaction) =>
    transaction.rawNarration.includes("ELECTRONICPMT-WEB")
  );

  assert.equal(received.type, "income");
  assert.equal(received.amount, 200);
  assert.equal(selfTransfer.type, "transfer_to_self");
  assert.equal(selfTransfer.amount, -300);
  assert.equal(uncertainPayment.type, "expense");
  assert.equal(uncertainPayment.needsReview, true);
  assert.equal(uncertainPayment.confidence, "low");
});

test("calculates section reconciliation from parsed rows and subtotals", () => {
  const result = parseTdBankStatementText(SAMPLE_STATEMENT_TEXT);

  assert.deepEqual(result.reconciliation, [
    {
      section: "Deposits",
      parsedTotal: 1250,
      expectedTotal: 1250,
      difference: 0,
      status: "matched",
    },
    {
      section: "Electronic Deposits",
      parsedTotal: 2400,
      expectedTotal: 2400,
      difference: 0,
      status: "matched",
    },
    {
      section: "Electronic Payments",
      parsedTotal: 1197.91,
      expectedTotal: 1197.91,
      difference: 0,
      status: "matched",
    },
  ]);
});

