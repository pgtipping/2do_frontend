# Next Steps

## 2026-05-26 18:04:00 - Active resumption path

Recommended next step: push the local commits when approved, then add subscription create/edit/delete.

Why this is next:

- Ledger edit/delete is committed locally.
- Category management is committed locally.
- Finance tests, production build, `git diff --check`, and Playwright browser smoke test pass.
- Subscription management is the next product gap after category cleanup.

Build in this order:

1. Push the local commits when approved.
2. Add subscription create/edit/delete.
3. Show real upcoming renewals in Reports from saved subscriptions.
4. Add focused tests for subscription behavior.
5. Re-run finance tests, production build, and browser checks.

After subscription management:

1. Add JSON restore import, not only JSON export.
2. Improve README with current MVP behavior and screenshots.
3. Consider a transaction search/filter pass for the Ledger.

Current reminder:

- The project has no separate backend in MVP.
- Do not add authentication or bank sync UI yet.
- Keep future bank sync compatibility in data fields.
