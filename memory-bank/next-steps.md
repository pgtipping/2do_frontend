# Next Steps

## 2026-05-28 03:27:00 - Active resumption path

Recommended next step: have the user refresh their browser tab, confirm the Import review rows no longer overlap or get cut off, then decide whether to commit and push the bundled QA fixes.

Why this is next:

- Full feature QA passed after fixing category default preservation and mobile tab readability.
- Real PDF upload QA found and fixed upload status placement so the status appears above the statement text box.
- Real TD PDF parsing now handles continued electronic-payment sections after statement boilerplate and avoids page header text inside transaction rows.
- Real TD PDF parsing now ignores daily balance summary rows after activity subtotals.
- Real TD PDF reconciliation now combines repeated same-name section subtotals before marking rows for review.
- Import review rows now have explicit layout slots so warning rows stay readable at the built-in browser width.
- Import review rows no longer get vertically compressed by the review table's `max-height`, so warning reasons text no longer leaks past the row into the reconciliation strip below.
- TD DBCRD card transactions no longer drop the merchant tail line, so review rows show `EMF K LOVE`, `RHODE ISLAND ENE`, `WALMART COM`, etc. instead of identical generic `DBCRD PUR AP ... VISA DDA PUR AP` text.
- Category dropdowns (Import review row, Ledger edit, Subscription create, Subscription edit) now expose `+ Add new category…` inline, so labeling a transaction with a new category (e.g. Parking) no longer requires switching tabs.
- Ledger view defaults to "All months" so one-statement imports show every saved transaction with correct totals; per-calendar-month drill-down still available from the dropdown.
- Multi-PDF / multi-statement upload is the next requested feature so multiple statements can be combined in one Ledger view.
- Subscription create/edit/delete is implemented locally.
- Reports now shows real upcoming renewals from saved subscriptions.
- Finance tests, production build, `git diff --check`, and focused parser checks passed for the current app.
- JSON backup export exists, but restore import is still not exposed in the app UI.

Build in this order:

1. Have the user refresh the built-in browser tab and confirm the Import review row layout looks correct (no overlap, no cut-off content).
2. Commit and push the QA fixes if approved.
3. Add JSON restore import, not only JSON export.
4. Improve README with current MVP behavior and screenshots.
5. Consider a transaction search/filter pass for the Ledger.

Current reminder:

- The project has no separate backend in MVP.
- Do not add authentication or bank sync UI yet.
- Keep future bank sync compatibility in data fields.
