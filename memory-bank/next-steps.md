# Next Steps

## 2026-05-26 03:12:02 - Active resumption path

Recommended next step: commit the Ledger edit/delete work, then add category management.

Why this is next:

- Ledger transaction edit/delete is implemented locally.
- Finance tests and production build pass.
- Codex in-app browser smoke test passed against the production `dist` build.
- Category management is the next product gap after saved transaction cleanup.

Build in this order:

1. Commit the Ledger edit/delete work.
2. Add category management for create, rename, hide/archive, and color changes.
3. Add focused tests for category management behavior.
4. Re-run finance tests, production build, and browser checks.

After category management:

1. Add subscription create/edit/delete and show real upcoming renewals.
2. Add JSON restore import, not only JSON export.
3. Improve README with current MVP behavior and screenshots.

Current reminder:

- The project has no separate backend in MVP.
- Do not add authentication or bank sync UI yet.
- Keep future bank sync compatibility in data fields.
