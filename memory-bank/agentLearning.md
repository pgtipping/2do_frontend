# Agent Learning

## 2026-05-25 18:06:50 - Windows local tooling pattern

On this machine, `npm` may not be available in PowerShell, and some Node launchers can be blocked.

Use the bundled Codex Node executable directly for reliable checks:

- Finance tests: run bundled Node with `--test` against the finance test files.
- Build: run bundled Node with `.\node_modules\vite\bin\vite.js build`.

This avoids the blocked `npm` and app-store Node path issues seen during setup.

## 2026-05-25 18:06:50 - Visual companion fallback

The Superpowers visual companion server had path and Node resolution problems on this Windows workspace.

Working fallback:

- Use Playwright directly against the local Vite app for real UI checks.
- For design comparisons, a temporary static HTML mockup can be created under ignored folders, but remove it before commit.

Do not commit `.superpowers/` or `.playwright-mcp/`.

## 2026-05-25 19:47:26 - Playwright profile conflict fallback

The Playwright MCP browser can fail with a profile-in-use error:

- `Browser is already in use for ... mcp-chrome-...`

When this happens, do not claim browser verification passed.

Record the blocker, rely only on completed tests/build checks, and rerun browser verification later with a clean Playwright browser profile.
