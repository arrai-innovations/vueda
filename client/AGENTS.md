# Agent Guidelines: `vueda-client`

This repository contains **`vueda-client`**, an internal Vue 3 component library built with **Vite**. Consuming projects use an alias `@vueda` that resolves directly to the `lib/` source directory. This allows customization developers to import uncompiled components and composables.

---

## Local Development

To get started:

- Install dependencies with:

    ```bash
    npm install
    ```

> In the Codex environment, dependencies are already installed using `npm install --dev`.

- Run tests:

    ```bash
    npm test run
    ```

> By default, npm test launches vitest in watch mode. The run argument disables watch mode for single-pass execution.

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

- **prepare** - `npx --no-install husky`

- **docs** - (placeholder for future JSDoc generation)

- **eslint** - `npx eslint --fix .`

- **prettier** - `npx prettier --write .`

---

## Git Hooks

This project uses **husky** with **lint-staged**. On each commit:

- `eslint` and `prettier` run on staged `.js`, `.ts`, and `.vue` files.

- `doctoc` updates Markdown tables of contents.

- `prettier` formats staged supported file types.

- `.circleci/config.yml` is validated with `circleci config validate`.

- Commit messages are checked with `commitlint`.

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

---

## Test Structure & Isolation

- Use `scopedIt(...)` from `@tests/unit/utils.js` in place of `it(...)` for all tests involving Vue components, reactivity, lifecycle hooks, or injections. This runs tests in a fresh `effectScope()` to prevent state leakage.

- Wrap all test files in a root `describe("<source file path>", ...)` block (e.g. `describe("lib/components/ActionForm.vue", ...)`) to clearly associate tests with their source. This improves readability, traceability in CI, and allows behavioral grouping inside without losing context.

- Group related tests with `describe(...)` blocks that reflect **behavioral responsibilities**, not implementation details (e.g. `"Confirm flow"` or `"Rendering with slots"`).
