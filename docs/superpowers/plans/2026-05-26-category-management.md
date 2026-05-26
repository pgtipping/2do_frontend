# Category Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add category create, edit, hide, restore, and smart apply behavior from ledger edits.

**Architecture:** Keep category data in the existing local finance repository. Add repository helpers for category updates and matching transaction category changes. Extend the current React screen with a Categories tab and a small smart apply panel inside ledger editing.

**Tech Stack:** Vite, React, IndexedDB-backed local repository, Node test runner.

---

## Files

- Modify `src/finance/storage/localFinanceStore.js` for category updates and smart apply.
- Modify `src/finance/__tests__/financeCore.test.mjs` for repository tests.
- Modify `src/finance/components/FinanceImportScreen.jsx` for the Categories tab and ledger smart apply choice.
- Modify `src/finance/components/FinanceImportScreen.css` for layout and controls.
- Modify memory-bank files after verification.

## Tasks

### Task 1: Repository Category Behavior

- [ ] Add failing tests for category update, hide, restore, matching count, and apply-to-matches.
- [ ] Run finance tests and confirm the new tests fail because methods are missing.
- [ ] Add `updateCategory`, `archiveCategory`, `restoreCategory`, `findSimilarTransactions`, and `applyTransactionCategoryChange`.
- [ ] Run finance tests and confirm they pass.

### Task 2: Categories Tab

- [ ] Add React state for category form editing.
- [ ] Add a Categories tab button.
- [ ] Render visible and hidden category sections.
- [ ] Add create, rename, color, hide, and restore actions.
- [ ] Use active categories in new assignment dropdowns.

### Task 3: Smart Apply From Ledger

- [ ] After saving a ledger category change, detect similar transactions.
- [ ] Show the three scope choices when matches exist.
- [ ] Apply one row, matching past rows, or matching past rows plus future category rule.
- [ ] Refresh ledger and reports after the choice.

### Task 4: Verification

- [ ] Run finance tests.
- [ ] Run production build.
- [ ] Run browser smoke test for category create, smart apply, and report category totals.
- [ ] Update memory bank files.
- [ ] Commit the finished work.
