// Find suspected duplicate transactions that slipped past the save-time
// fingerprint guard.
//
// The save-time guard in localFinanceStore.js uses an exact fingerprint:
//   source + date + lowercased narration + absolute amount.
// Two transactions describing the same real-world charge can drift on the
// narration string (parser version change, re-OCR'd PDF, slightly
// different reference codes) and end up with different fingerprints,
// letting both save.
//
// This module catches those drift cases by matching on a looser key:
//   date + absolute amount + normalized narration
// where "normalized narration" uses the category-rule normalizer, which
// already strips per-transaction noise (auth codes, peer-to-peer
// reference codes, 6-digit numbers, month words).
//
// The result is a list of suspected duplicate clusters. The UI must show
// these for human confirmation before deleting — looser matching means
// false positives are possible (two separate $7.49 coffees at the same
// shop on the same day would group, but they are not duplicates).

import { getCategoryRuleText } from "./categoryRules.js";

function getAbsoluteAmountKey(amount) {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return null;
  }

  return Math.abs(numericAmount).toFixed(2);
}

function getDateKey(value) {
  if (!value) {
    return null;
  }

  // Date values are saved as ISO strings ("YYYY-MM-DD"). Trim any time
  // component defensively so two rows with the same calendar day still
  // group together.
  return String(value).slice(0, 10);
}

function buildClusterKey(transaction) {
  const dateKey = getDateKey(transaction.date);
  const amountKey = getAbsoluteAmountKey(transaction.amount);
  const narrationKey = getCategoryRuleText(transaction);

  if (!dateKey || !amountKey || !narrationKey) {
    return null;
  }

  return `${dateKey}|${amountKey}|${narrationKey}`;
}

export function findSuspectedDuplicateClusters(transactions = []) {
  const groupsByKey = new Map();

  transactions.forEach((transaction) => {
    const clusterKey = buildClusterKey(transaction);

    if (!clusterKey) {
      return;
    }

    const existingGroup = groupsByKey.get(clusterKey);

    if (existingGroup) {
      existingGroup.push(transaction);
      return;
    }

    groupsByKey.set(clusterKey, [transaction]);
  });

  const clusters = [];

  groupsByKey.forEach((members, clusterKey) => {
    if (members.length < 2) {
      return;
    }

    clusters.push({
      key: clusterKey,
      transactions: members,
    });
  });

  // Most recent clusters first so the user sees the freshest suspects at
  // the top of the review panel.
  clusters.sort((firstCluster, secondCluster) => {
    const firstDate = getDateKey(firstCluster.transactions[0].date) || "";
    const secondDate = getDateKey(secondCluster.transactions[0].date) || "";

    if (firstDate === secondDate) {
      return 0;
    }

    return firstDate < secondDate ? 1 : -1;
  });

  return clusters;
}

// Convenience for the UI: which IDs to keep vs remove given a cluster
// and the user's selections. The first transaction in the cluster is
// the implicit "keeper" unless the user marked it for removal.
export function getRemovalIdsForClusters(clusters, removedIdsByCluster) {
  const removalIds = new Set();

  clusters.forEach((cluster) => {
    const removalSet = removedIdsByCluster.get(cluster.key);

    if (!removalSet || removalSet.size === 0) {
      return;
    }

    cluster.transactions.forEach((transaction) => {
      if (removalSet.has(transaction.id)) {
        removalIds.add(transaction.id);
      }
    });
  });

  return Array.from(removalIds);
}
