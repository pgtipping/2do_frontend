# Next Steps

## 2026-05-25 18:06:50 - Active resumption path

Recommended next build: add transaction editing in the Ledger.

Why this is next:

- Import labels can be chosen before saving.
- Learned labels work for future imports.
- But users still need a way to correct saved transactions after import.

Build in this order:

1. Add an edit flow for saved ledger transactions.
2. Allow editing category, transaction type, notes, merchant, and description.
3. When category changes, update or create the learned category rule for that transaction narration.
4. Add delete support with a confirmation step.
5. Add focused tests for saved transaction edit/delete behavior.
6. Re-run finance tests, production build, and browser checks.

After ledger editing:

1. Add category management for create, rename, hide/archive, and color changes.
2. Add subscription create/edit/delete and show real upcoming renewals.
3. Add JSON restore import, not only JSON export.
4. Improve README with current MVP behavior and screenshots.

Current reminder:

- The project has no separate backend in MVP.
- Do not add authentication or bank sync UI yet.
- Keep future bank sync compatibility in data fields.
