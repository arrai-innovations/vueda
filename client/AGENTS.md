# Agent Guidelines: `@arrai-innovations/vueda`

This directory contains **`@arrai-innovations/vueda`**, a Vue 3 component library built with **Vite**. Consuming projects use an alias `@vueda` that resolves directly to the `lib/` source directory. This allows customization developers to import uncompiled components and composables.

---

## Local Development

To get started:

- Install dependencies with:

    ```bash
    npm install
    ```

In the Codex environment, dependencies are already installed using `npm install --dev`.

- Run tests:

    ```bash
    npm test run
    ```

By default, npm test launches vitest in watch mode. The run argument disables watch mode for single-pass execution.

- View coverage:

    ```bash
    npm run coverage
    ```

- This project uses **Vite** as its development server and bundler.

---

## Package Scripts

Scripts defined in `package.json`:

- **test** - `npx --no-install vitest`

- **coverage** - `npm test -- run --coverage`

- **docs** - (placeholder for future JSDoc generation)

- **eslint** - `npx eslint --fix .`

- **prettier** - `npx prettier --write .`

---

## Git Hooks

Git hooks are managed by **lefthook** at the repo root. See `lefthook.yml` for the current hook behavior.

---

## Commit Message Style

We use a custom commitlint configuration based on [Conventional Commits](https://www.conventionalcommits.org/). It is customized to have the following valid types:

```
build, ci, chore, content, docs, feat, fix, perf, refactor, remove, revert, style, test, wip
```

**Example**:

```
fix(WidgetSearchableSelect): correct options grouping
```

The scope should reference the affected filename (sans extension), module, or concern.

---

## Changelog

All notable changes are recorded in `CHANGELOG.md`. For each release tag, use the following format:

```md
## vX.Y.Z (2025-MM-DD)

### Breaking Changes

### Features

### Fixes

- **File Name or Component Name**:
    - individual notes
    - _actions that consuming developers of the library should take_
```

When making changes, suggest Changelog entries if they impact consumers or public components.

**If there is no current unreleased section**, start a new one using the next version number and set the date to `unreleased`. For example:

```
## v2.0.0-beta.1 (unreleased)

### Breaking Changes

- **ActionForm**:
    - The `handleActionCompletion` prop has been removed. Redirection after action completion now uses the model config's `defaultView`, which prefers `update`, `read`, then `list` in that order.
      _If your use case required a custom post-action redirect, update the model config accordingly._

### Features

### Fixes

```

---

## Test Structure & Isolation

- Use `scopedIt(...)` from `@tests/unit/utils.js` in place of `it(...)` for all tests involving Vue components, reactivity, lifecycle hooks, or injections. This runs tests in a fresh `effectScope()` to prevent state leakage.

- Wrap all test files in a root `describe("<source file path>", ...)` block (e.g. `describe("lib/components/ActionForm.vue", ...)`) to clearly associate tests with their source. This improves readability, traceability in CI, and allows behavioral grouping inside without losing context.

- Group related tests with `describe(...)` blocks that reflect **behavioral responsibilities**, not implementation details (e.g. `"Confirm flow"` or `"Rendering with slots"`).

---

## Efficient Test Execution in Codex

**Why** - The full suite takes ~50 s in the Codex runner. Tight feedback loops keep the agent responsive while still guarding against regressions.

1. **Work in the spec you just touched.**
   Disable watch mode and run only that file:

    ```bash
    # Example: run a single spec
    npm test run tests/unit/lib/components/MyComponent.spec.js
    ```

- You may pass multiple files or a glob if the feature spans more than one.
- Avoid `npm test` (without `run`) in Codex - it enters watch mode and never exits.

2. **Run the full suite only once the feature is green**
   (e.g. before marking the task complete or opening a PR):

    ```bash
    npm test run
    ```

This keeps individual test iterations sub-second, while ensuring the library remains stable before code review or CI.

---

## Coverage Limitations

Running less than the full suite with coverage is **not recommended**, due to how coverage is collected by `istanbul` and `v8`.

In particular, spec files that dynamically import components (e.g. for mocking) may not produce reliable coverage output in isolation. This limitation is outside this project's control, but it means coverage for a single file is often misleading.

If your task involves coverage, run the full suite:

```bash
npm run coverage
```
