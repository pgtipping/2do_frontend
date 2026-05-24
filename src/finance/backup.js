const BACKUP_KIND = "personal_finance_backup";

function escapeCsvValue(value) {
  const text = value == null ? "" : String(value);
  const shouldQuote = /[",\n]/.test(text);
  const escaped = text.replaceAll('"', '""');

  return shouldQuote ? `"${escaped}"` : escaped;
}

export function createJsonBackup(data, { exportedAt = new Date().toISOString() } = {}) {
  return {
    kind: BACKUP_KIND,
    exportedAt,
    schemaVersion: data.schemaVersion,
    data,
  };
}

export function restoreJsonBackup(backup) {
  if (!backup || backup.kind !== BACKUP_KIND || !backup.data) {
    throw new Error("Unsupported backup file.");
  }

  return backup.data;
}

export function exportTransactionsCsv(transactions) {
  const columns = [
    "date",
    "description",
    "merchant",
    "amount",
    "type",
    "categoryId",
    "source",
    "rawNarration",
  ];
  const header = columns.join(",");
  const rows = transactions.map((transaction) =>
    columns.map((column) => escapeCsvValue(transaction[column])).join(",")
  );

  return [header, ...rows].join("\n");
}
