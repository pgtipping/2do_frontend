# Next Steps

## 2026-05-26 19:05:00 - Active resumption path

Recommended next step: add JSON restore import, not only JSON export.

Why this is next:

- Subscription create/edit/delete is implemented locally.
- Reports now shows real upcoming renewals from saved subscriptions.
- Finance tests, production build, `git diff --check`, and Playwright browser smoke test passed for the subscription work.
- JSON backup export exists, but restore import is still not exposed in the app UI.

Build in this order:

1. Add JSON restore import, not only JSON export.
2. Improve README with current MVP behavior and screenshots.
3. Consider a transaction search/filter pass for the Ledger.

Current reminder:

- The project has no separate backend in MVP.
- Do not add authentication or bank sync UI yet.
- Keep future bank sync compatibility in data fields.
