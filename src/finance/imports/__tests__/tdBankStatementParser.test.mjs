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

test("parses TD point-of-sale rows from other withdrawals", () => {
  const statementText = `
Page: 1 of 6
Statement Period: Jan 04 2025-Feb 03 2025
Primary Account #: xxx-xxx8531
Account Product Label: TD Convenience Checking

Daily Account Activity
Other Withdrawals
POSTING DATE DESCRIPTION AMOUNT
01/06 DEBIT POS AP, *****123456789, AUT
010425 DDA PURCHASE AP
GROCERY STORE CITY * ST
63.76
01/06 DEBIT POS AP, *****987654321, AUT
010425 DDA PURCHASE AP
FUEL STATION CITY * ST
40.07
Subtotal: 103.83

How to Balance your Account
This section is informational and should not become a transaction.
`;
  const result = parseTdBankStatementText(statementText);

  assert.equal(result.transactions.length, 2);
  assert.equal(result.transactions[0].date, "2025-01-06");
  assert.equal(result.transactions[0].amount, -63.76);
  assert.equal(
    result.transactions[0].rawNarration,
    "DEBIT POS AP, *****123456789, AUT 010425 DDA PURCHASE AP GROCERY STORE CITY * ST"
  );
  assert.equal(result.transactions[1].amount, -40.07);
  assert.deepEqual(result.reconciliation, [
    {
      section: "Other Withdrawals",
      parsedTotal: 103.83,
      expectedTotal: 103.83,
      difference: 0,
      status: "matched",
    },
  ]);
});

test("parses continued TD activity sections without mixing in page headers", () => {
  const statementText = `
Page: 1 of 5
Statement Period: Jan 04 2025-Feb 03 2025
Primary Account #: xxx-xxx8531

DAILY ACCOUNT ACTIVITY
Electronic Payments
POSTING DATE DESCRIPTION AMOUNT
01/06 DBCRD PUR AP, *****123456789, AUT 010325 VISA DDA PUR AP
MARKET ONE CITY * ST
3.00

How to Balance your Account
This statement help text should not become a transaction.

Call 1-800-747-7000 for 24-hour Bank-by-Phone services or connect to example.com
xxxxxx
Bank Deposits FDIC Insured | TD Bank, N.A. | Equal Housing Lender
STATEMENT OF ACCOUNT
Page: 3 of 5
Statement Period: Jan 04 2025-Feb 03 2025
Primary Account #: xxx-xxx8531
DAILY ACCOUNT ACTIVITY
Electronic Payments (continued)
POSTING DATE DESCRIPTION AMOUNT
01/06 TD ZELLE SENT, 500400E0FPA5 Zelle SAMPLE PERSON 100.00
01/08 DEBIT POS AP, *****123456789, AUT 010825 DDA PURCHASE AP
GROCERY STORE CITY * ST
33.25

Call 1-800-747-7000 for 24-hour Bank-by-Phone services or connect to example.com
xxxxxx
Bank Deposits FDIC Insured | TD Bank, N.A. | Equal Housing Lender
STATEMENT OF ACCOUNT
Page: 4 of 5
Statement Period: Jan 04 2025-Feb 03 2025
Primary Account #: xxx-xxx8531
DAILY ACCOUNT ACTIVITY
Electronic Payments (continued)
POSTING DATE DESCRIPTION AMOUNT
01/09 ELECTRONIC PMT-WEB, PAYPAL INST XFER SAMPLE 49.95
Subtotal: 186.20
`;
  const result = parseTdBankStatementText(statementText);
  const groceryTransaction = result.transactions.find((transaction) =>
    transaction.rawNarration.includes("GROCERY STORE")
  );
  const zelleTransaction = result.transactions.find((transaction) =>
    transaction.rawNarration.includes("TD ZELLE SENT")
  );
  const paypalTransaction = result.transactions.find((transaction) =>
    transaction.rawNarration.includes("PAYPAL")
  );

  assert.equal(result.transactions.length, 4);
  assert.equal(groceryTransaction.amount, -33.25);
  assert.equal(
    groceryTransaction.rawNarration,
    "DEBIT POS AP, *****123456789, AUT 010825 DDA PURCHASE AP GROCERY STORE CITY * ST"
  );
  assert.equal(zelleTransaction.type, "transfer_to_other");
  assert.equal(paypalTransaction.needsReview, true);
  assert.deepEqual(result.reconciliation, [
    {
      section: "Electronic Payments",
      parsedTotal: 186.2,
      expectedTotal: 186.2,
      difference: 0,
      status: "matched",
    },
  ]);
});

test("ignores TD daily balance summary rows after activity subtotals", () => {
  const statementText = `
Page: 5 of 5
Statement Period: Feb 04 2025-Mar 03 2025
Primary Account #: xxx-xxx8531

DAILY ACCOUNT ACTIVITY
Deposits
POSTING DATE DESCRIPTION AMOUNT
02/14 MOBILE DEPOSIT 2,000.00
Subtotal: 2,000.00

DAILY BALANCE SUMMARY
DATE BALANCE DATE BALANCE
02/14 3,654.25 02/27 3,102.26
02/18 3,372.46 03/03 3,102.26

Call 1-800-747-7000 for 24-hour Bank-by-Phone services or connect to example.com
STATEMENT OF ACCOUNT
Page: 5 of 5
We're committed to keeping you informed about upcoming account changes.
`;
  const result = parseTdBankStatementText(statementText);

  assert.equal(result.transactions.length, 1);
  assert.equal(result.transactions[0].date, "2025-02-14");
  assert.equal(result.transactions[0].amount, 2000);
  assert.equal(result.transactions[0].rawNarration, "MOBILE DEPOSIT");
  assert.deepEqual(result.reconciliation, [
    {
      section: "Deposits",
      parsedTotal: 2000,
      expectedTotal: 2000,
      difference: 0,
      status: "matched",
    },
  ]);
});

test("keeps merchant tail line after single-line DBCRD card transactions (real PDF format)", () => {
  const statementText = `
Page: 1 of 5
Statement Period: Feb 04 2025-Mar 03 2025
Primary Account #: xxx-xxx8531

DAILY ACCOUNT ACTIVITY
Electronic Payments
POSTING DATE DESCRIPTION AMOUNT
02/05 DBCRD PUR AP, *****31261027731, AUT 020425 VISA DDA PUR AP 15.00
EMF K LOVE 800 525 5683 * CA
02/05 DBCRD PUR AP, *****31261027731, AUT 020425 VISA DDA PUR AP 85.00
RHODE ISLAND ENE 855 743 1101 * RI
02/06 DBCRD PUR AP, *****31261027731, AUT 020625 VISA DDA PUR AP 62.14
WALMART COM 8009256278 800 966 6546 * AR
Subtotal: 162.14
`;
  const result = parseTdBankStatementText(statementText);

  assert.equal(result.transactions.length, 3);
  assert.ok(
    result.transactions[0].rawNarration.includes("EMF K LOVE"),
    `expected first transaction narration to include EMF K LOVE, got: ${result.transactions[0].rawNarration}`
  );
  assert.equal(result.transactions[0].amount, -15);
  assert.ok(
    result.transactions[1].rawNarration.includes("RHODE ISLAND ENE"),
    `expected second transaction narration to include RHODE ISLAND ENE, got: ${result.transactions[1].rawNarration}`
  );
  assert.equal(result.transactions[1].amount, -85);
  assert.ok(
    result.transactions[2].rawNarration.includes("WALMART COM"),
    `expected third transaction narration to include WALMART COM, got: ${result.transactions[2].rawNarration}`
  );
  assert.equal(result.transactions[2].amount, -62.14);
});

test("still drops page-break boilerplate that does not look like a merchant tail", () => {
  const statementText = `
Page: 1 of 5
Statement Period: Feb 04 2025-Mar 03 2025
Primary Account #: xxx-xxx8531

DAILY ACCOUNT ACTIVITY
Electronic Payments
POSTING DATE DESCRIPTION AMOUNT
02/05 DBCRD PUR AP, *****12345678, AUT 020525 VISA DDA PUR AP 10.00

Call 1-800-747-7000 for 24-hour Bank-by-Phone services or connect to example.com
xxxxxx
Bank Deposits FDIC Insured | TD Bank, N.A. | Equal Housing Lender
STATEMENT OF ACCOUNT
Page: 2 of 5
Statement Period: Feb 04 2025-Mar 03 2025
Primary Account #: xxx-xxx8531
DAILY ACCOUNT ACTIVITY
Electronic Payments (continued)
POSTING DATE DESCRIPTION AMOUNT
02/06 DBCRD PUR AP, *****12345678, AUT 020625 VISA DDA PUR AP 20.00
ANOTHER MERCHANT 555 555 5555 * NY
Subtotal: 30.00
`;
  const result = parseTdBankStatementText(statementText);

  assert.equal(result.transactions.length, 2);
  assert.ok(
    !result.transactions[0].rawNarration.includes("Call 1-800"),
    `expected first transaction narration to drop page-break boilerplate, got: ${result.transactions[0].rawNarration}`
  );
  assert.ok(
    !result.transactions[0].rawNarration.includes("STATEMENT OF ACCOUNT"),
    `expected first transaction narration to drop STATEMENT OF ACCOUNT header, got: ${result.transactions[0].rawNarration}`
  );
  assert.equal(result.transactions[0].amount, -10);
  assert.ok(
    result.transactions[1].rawNarration.includes("ANOTHER MERCHANT"),
    `expected second transaction narration to include ANOTHER MERCHANT, got: ${result.transactions[1].rawNarration}`
  );
  assert.equal(result.transactions[1].amount, -20);
});

test("aggregates repeated TD activity section totals before reconciliation", () => {
  const statementText = `
Page: 1 of 5
Statement Period: Feb 04 2025-Mar 03 2025
Primary Account #: xxx-xxx8531

DAILY ACCOUNT ACTIVITY
Deposits
POSTING DATE DESCRIPTION AMOUNT
02/14 MOBILE DEPOSIT 2,000.00
Subtotal: 2,000.00

DAILY ACCOUNT ACTIVITY
Deposits
POSTING DATE DESCRIPTION AMOUNT
02/26 MOBILE DEPOSIT 3,000.00
Subtotal: 3,000.00

DAILY ACCOUNT ACTIVITY
Electronic Payments
POSTING DATE DESCRIPTION AMOUNT
02/04 TD ZELLE SENT, 503500P0LARU Zelle SAMPLE PERSON 100.00
Subtotal: 100.00
`;
  const result = parseTdBankStatementText(statementText);
  const zelleTransaction = result.transactions.find((transaction) =>
    transaction.rawNarration.includes("TD ZELLE SENT")
  );

  assert.equal(result.transactions.length, 3);
  assert.equal(zelleTransaction.type, "transfer_to_other");
  assert.deepEqual(result.reconciliation, [
    {
      section: "Deposits",
      parsedTotal: 5000,
      expectedTotal: 5000,
      difference: 0,
      status: "matched",
    },
    {
      section: "Electronic Payments",
      parsedTotal: 100,
      expectedTotal: 100,
      difference: 0,
      status: "matched",
    },
  ]);
});

test("flags PayPal transfer deposits for review (income vs refund is ambiguous)", () => {
  const statementText = `
Page: 1 of 1
Statement Period: Mar 04 2025-Apr 03 2025
Primary Account #: xxx-xxx8531
Account Product Label: TD Convenience Checking

Daily Account Activity
Electronic Deposits
POSTING DATE DESCRIPTION AMOUNT
03/15 ACH DEPOSIT, PAYPAL TRANSFER ****785060586 120.00
Subtotal: 120.00

How to Balance your Account
This section is informational and should not become a transaction.
`;
  const result = parseTdBankStatementText(statementText);
  const paypal = result.transactions.find((transaction) =>
    transaction.rawNarration.replace(/\s+/g, "").toUpperCase().includes("PAYPALTRANSFER")
  );

  assert.ok(paypal, "expected the PayPal transfer deposit to be parsed");
  assert.equal(paypal.amount, 120);
  assert.equal(paypal.type, "income");
  assert.equal(paypal.needsReview, true);
  assert.equal(paypal.confidence, "low");
});
