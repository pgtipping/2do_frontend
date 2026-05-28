import assert from "node:assert/strict";
import { test } from "node:test";

import {
  findSuspectedDuplicateClusters,
  getRemovalIdsForClusters,
} from "../duplicateDetection.js";

test("groups two saves of the exact same transaction", () => {
  const transactions = [
    {
      id: "tx_a",
      date: "2025-03-02",
      amount: -42.91,
      rawNarration: "DBCRD PUR AP WALMART COM 8009256278 800 966 6546 * AR",
    },
    {
      id: "tx_b",
      date: "2025-03-02",
      amount: -42.91,
      rawNarration: "DBCRD PUR AP WALMART COM 8009256278 800 966 6546 * AR",
    },
  ];

  const clusters = findSuspectedDuplicateClusters(transactions);

  assert.equal(clusters.length, 1);
  assert.equal(clusters[0].transactions.length, 2);
  assert.deepEqual(
    clusters[0].transactions.map((transaction) => transaction.id),
    ["tx_a", "tx_b"]
  );
});

test("catches duplicates the fingerprint guard missed because narration drifted", () => {
  // Same real-world charge saved twice, but the second save had a
  // different AUT code in the narration so the exact fingerprint
  // differed and both rows landed in storage.
  const transactions = [
    {
      id: "tx_old",
      date: "2025-03-02",
      amount: -42.91,
      rawNarration:
        "DBCRD PUR AP, *****31261027731, AUT 020325 VISA DDA PUR AP WALMART COM 800 966 6546 * AR",
    },
    {
      id: "tx_new",
      date: "2025-03-02",
      amount: -42.91,
      rawNarration:
        "DBCRD PUR AP, *****31261027731, AUT 999999 VISA DDA PUR AP WALMART COM 800 966 6546 * AR",
    },
  ];

  const clusters = findSuspectedDuplicateClusters(transactions);

  assert.equal(clusters.length, 1, "expected one cluster despite narration drift");
  assert.equal(clusters[0].transactions.length, 2);
});

test("does not group same-date same-amount transactions at different merchants", () => {
  const transactions = [
    {
      id: "tx_walmart",
      date: "2025-03-02",
      amount: -42.91,
      rawNarration: "DBCRD PUR AP WALMART COM 800 966 6546 * AR",
    },
    {
      id: "tx_target",
      date: "2025-03-02",
      amount: -42.91,
      rawNarration: "DBCRD PUR AP TARGET COM 800 591 3869 * MN",
    },
  ];

  const clusters = findSuspectedDuplicateClusters(transactions);

  assert.equal(clusters.length, 0, "Walmart and Target are not duplicates");
});

test("does not group same merchant same day at different amounts", () => {
  const transactions = [
    {
      id: "tx_morning_coffee",
      date: "2025-03-02",
      amount: -4.75,
      rawNarration: "DBCRD PUR AP STARBUCKS 12345 * NY",
    },
    {
      id: "tx_afternoon_coffee",
      date: "2025-03-02",
      amount: -7.25,
      rawNarration: "DBCRD PUR AP STARBUCKS 12345 * NY",
    },
  ];

  const clusters = findSuspectedDuplicateClusters(transactions);

  assert.equal(clusters.length, 0, "different amounts are not duplicates");
});

test("does not group same merchant same amount on different dates", () => {
  const transactions = [
    {
      id: "tx_march",
      date: "2025-03-02",
      amount: -42.91,
      rawNarration: "DBCRD PUR AP WALMART COM 800 966 6546 * AR",
    },
    {
      id: "tx_april",
      date: "2025-04-02",
      amount: -42.91,
      rawNarration: "DBCRD PUR AP WALMART COM 800 966 6546 * AR",
    },
  ];

  const clusters = findSuspectedDuplicateClusters(transactions);

  assert.equal(clusters.length, 0, "different dates are not duplicates");
});

test("does flag legitimate same-merchant-same-day same-amount charges (user must dismiss)", () => {
  // Two real $7.49 coffees at the same shop on the same day will
  // group as a suspected cluster. That is the intended behavior —
  // the UI shows the cluster, the user decides nothing should be
  // removed.
  const transactions = [
    {
      id: "tx_morning",
      date: "2025-03-02",
      amount: -7.49,
      rawNarration: "DBCRD PUR AP STARBUCKS 12345 * NY",
    },
    {
      id: "tx_afternoon",
      date: "2025-03-02",
      amount: -7.49,
      rawNarration: "DBCRD PUR AP STARBUCKS 12345 * NY",
    },
  ];

  const clusters = findSuspectedDuplicateClusters(transactions);

  assert.equal(clusters.length, 1, "looser matching flags this for human review");
});

test("sorts clusters most-recent first", () => {
  const transactions = [
    {
      id: "tx_jan_a",
      date: "2025-01-15",
      amount: -10,
      rawNarration: "AMAZON",
    },
    {
      id: "tx_jan_b",
      date: "2025-01-15",
      amount: -10,
      rawNarration: "AMAZON",
    },
    {
      id: "tx_mar_a",
      date: "2025-03-15",
      amount: -20,
      rawNarration: "NETFLIX",
    },
    {
      id: "tx_mar_b",
      date: "2025-03-15",
      amount: -20,
      rawNarration: "NETFLIX",
    },
  ];

  const clusters = findSuspectedDuplicateClusters(transactions);

  assert.equal(clusters.length, 2);
  assert.equal(clusters[0].transactions[0].date, "2025-03-15");
  assert.equal(clusters[1].transactions[0].date, "2025-01-15");
});

test("skips rows with no narration", () => {
  const transactions = [
    {
      id: "tx_blank_a",
      date: "2025-03-02",
      amount: -10,
      rawNarration: "",
    },
    {
      id: "tx_blank_b",
      date: "2025-03-02",
      amount: -10,
      rawNarration: "",
    },
  ];

  const clusters = findSuspectedDuplicateClusters(transactions);

  assert.equal(clusters.length, 0, "blank narration cannot anchor a cluster");
});

test("getRemovalIdsForClusters returns only the IDs the user selected", () => {
  const clusters = [
    {
      key: "k1",
      transactions: [
        { id: "tx_a", date: "2025-03-02", amount: -10, rawNarration: "AMAZON" },
        { id: "tx_b", date: "2025-03-02", amount: -10, rawNarration: "AMAZON" },
      ],
    },
    {
      key: "k2",
      transactions: [
        { id: "tx_c", date: "2025-03-15", amount: -20, rawNarration: "NETFLIX" },
        { id: "tx_d", date: "2025-03-15", amount: -20, rawNarration: "NETFLIX" },
      ],
    },
  ];

  const removedIdsByCluster = new Map();
  removedIdsByCluster.set("k1", new Set(["tx_b"]));
  removedIdsByCluster.set("k2", new Set());

  const removalIds = getRemovalIdsForClusters(clusters, removedIdsByCluster);

  assert.deepEqual(removalIds, ["tx_b"]);
});

test("transfer rows with opposite signs at same merchant still cluster", () => {
  // A user might have a transfer recorded twice — once as a debit
  // and once as a credit with the same amount. We match on absolute
  // amount so these still cluster.
  const transactions = [
    {
      id: "tx_debit",
      date: "2025-03-02",
      amount: -500,
      rawNarration: "TD ZELLE SENT JUSTUS GEORGE",
    },
    {
      id: "tx_credit",
      date: "2025-03-02",
      amount: 500,
      rawNarration: "TD ZELLE SENT JUSTUS GEORGE",
    },
  ];

  const clusters = findSuspectedDuplicateClusters(transactions);

  assert.equal(clusters.length, 1);
});

test("handles peer-to-peer reference codes that drift between saves", () => {
  // Same Zelle transfer saved twice with different per-transfer
  // reference codes — the category-rule normalizer strips those.
  const transactions = [
    {
      id: "tx_zelle_a",
      date: "2025-03-02",
      amount: -75,
      rawNarration: "TD ZELLE SENT, 503500P0LARU Zelle JUSTUS GEORGE",
    },
    {
      id: "tx_zelle_b",
      date: "2025-03-02",
      amount: -75,
      rawNarration: "TD ZELLE SENT, 612400X8WQZB Zelle JUSTUS GEORGE",
    },
  ];

  const clusters = findSuspectedDuplicateClusters(transactions);

  assert.equal(clusters.length, 1, "reference codes should not block matching");
});
