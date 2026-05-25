# Memory Bank Index

## Purpose

This memory bank records project-specific state for `pgtipping/2do_frontend`, now being repurposed as a personal finance app.

## Core Files

- `.Cascaderules` - validated project rules and startup order.
- `activeContext.md` - current project state and latest working context.
- `progress.md` - completed milestones and verification results.
- `decisions.md` - accepted project and technical decisions.
- `next-steps.md` - ordered resumption path for the next session.
- `agentLearning.md` - reusable implementation lessons from this project.

## Selection Heuristics

After reading the core files, choose extra context this way:

- Read `docs/personal-finance-app-plan.md` when changing product scope, data model, import behavior, reports, backups, or subscriptions.
- Read recent commits when deciding whether a planned item has already been shipped.
- Read tests in `src/finance/**/__tests__` before changing finance logic.
- Read `src/finance/components/FinanceImportScreen.jsx` and `.css` before changing the current user interface.

## Topic Files

No separate topic files exist yet. Add one only when a subject becomes large enough that the core files are no longer easy to scan.
