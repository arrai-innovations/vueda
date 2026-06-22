# Agent Guidelines: `@arrai-innovations/vueda`

This directory contains **`@arrai-innovations/vueda`**, a Vue 3 component library built with **Vite**. Consuming projects use an alias `@vueda` that resolves directly to the `lib/` source directory. This allows customization developers to import uncompiled components and composables. The library source (`lib/`) is **plain JavaScript** (no TypeScript). There are no `.ts` files. Type information is expressed through JSDoc annotations.

---

## Local Development

To get started:

- Install dependencies with:

    ```bash
    pnpm install
    ```

- Run tests: `just test-client` (accepts extra vitest args, paths relative to `client/`)

    **Testing scope:** this is a component library with no standalone dev app. "Test" means Vitest unit tests -- do not attempt to start a Vite dev server or verify components by rendering them in a browser. Unit tests are the only automated verification available. If something cannot be confirmed by a unit test, say so explicitly rather than trying to serve or scrape rendered output.


    ```bash
    just test-client
    just test-client tests/unit/lib/views/ViewWorkflowTransition.spec.js
    ```

- View coverage: `just coverage-client` (accepts extra vitest args)

    ```bash
    just coverage-client
    ```

- This project uses **Vite** as its development server and bundler.

---

## Package Scripts

Scripts defined in `package.json`:

- **test** - `npx --no-install vitest run`

- **coverage** - `npm test -- run --coverage`

- **lint** - `pnpm -C .. exec eslint --no-warn-ignored --cache client`

- **format** - `pnpm -C .. exec prettier --check client`

- **eslint** - `pnpm -C .. exec eslint --no-warn-ignored --cache --fix client`

- **prettier** - `pnpm -C .. exec prettier --write client`

---

## Commit Message Style

We use a custom commitlint configuration based on [Conventional Commits](https://www.conventionalcommits.org/). It is customized to have the following valid types:

```text
build, ci, chore, content, docs, feat, fix, perf, refactor, remove, revert, style, test, wip
```

**Example**:

```text
fix(WidgetSearchableSelect): correct options grouping
```

The scope should reference the affected filename (sans extension), module, or concern.

---

## Changelog

Public client changelog entries belong in `docs/reference/changelog/client.md`.
Before adding or editing entries, consult
`../docs/reference/changelog/README.md` for the shared authoring convention.

Add entries for changes that affect integrators: public components, composables,
routes, stores, theme behavior, build integration, dependency expectations,
documented behavior, and migration notes.

For each release tag, use the following format:

```md
## vX.Y.Z (2025-MM-DD)

### Breaking Changes

### Features

### Fixes

- **File Name or Component Name**:
    - individual notes
    - _actions that consuming developers of the library should take_
```

When making changes, suggest changelog entries if they impact consuming
applications or public components.

**If there is no current unreleased section**, start a new one using the next version number and set the date to `unreleased`. For example:

```markdown
## v2.0.0-beta.1 (unreleased)

### Breaking Changes

- **ActionForm**:
    - The `handleActionCompletion` prop has been removed. Redirection after action completion now uses the model config's `defaultView`, which prefers `update`, `read`, then `list` in that order.
      _If your use case required a custom post-action redirect, update the model config accordingly._

### Features

### Fixes

```

---

## API Documentation Annotations

The docs-tooling pipeline reads several annotation conventions from `client/lib/` source files. The authoritative contract lives in the docs-tooling package next to the extractors that enforce it:

When editing source annotations that affect generated API docs, consult
`../docs-tooling/briefings/client-annotations.md`.

---

## JSDoc Type Style

When writing TypeScript types in JSDoc contexts, prefer literal syntax over utility generics.

**Arrays:** Use bracket syntax instead of `Array<T>`. For complex element types (function signatures, unions), wrap the element type in parentheses:

```js
/** @type {string[]} */
/** @type {(() => void)[]} */
/** @type {(string | number)[]} */
```

**Objects:** Use index signature syntax instead of `Record<K, V>`:

```js
/** @type {{ [key: string]: Foo }} */
```

---

## Composable and Utility JSDoc

The rules above cover Vue SFCs. The following additional conventions apply to all `.js` files under `lib/use/` and `lib/utils/`.

### Module header

Every file opens with a `@module` tag matching its import path, followed by a `@description`:

```js
/**
 * @module use/useField
 * @description Provides reactive field context including value tracking, validation, and error management.
 */
```

### Typedefs

Define a `@typedef` for every non-trivial object or options bag that crosses a function boundary. Use `@property` entries for each member. Mark optional properties with brackets:

```js
/**
 * @typedef {object} TextValidationOptions
 * @property {number} [maxLength] - Maximum character count.
 * @property {number} [minLength] - Minimum character count.
 * @property {string} [patternRegex] - Regex the value must match after the field is touched.
 */
```

Group properties with plain-text section headers when the typedef has more than ~8 members:

```js
/**
 * @typedef {object} FieldContextRawState
 *
 * Identification and metadata.
 * @property {import('vue').ComputedRef<string>} name - The field name.
 * ...
 *
 * Validation state.
 * @property {import('vue').ComputedRef<boolean>} required - Whether the field is required.
 * ...
 */
```

### Reactive return types

Composables that return reactive state should document the unwrapped shape using the three-tier pattern established by `useField`:

1. `*RawState` typedef with `ComputedRef<T>` / `Ref<T>` property types (the shape before `reactive()` wrapping).
2. `*State` typedef as `import('vue').UnwrapNestedRefs<*RawState>` (the shape consumers interact with).
3. `*Context` typedef combining `state` with any methods.

When a composable does not return state (only produces side effects like registering watches), document `@returns {void}` explicitly.

### Function signatures

Every exported function has `@param` and `@returns` tags. Use inline import paths for Vue and internal types:

```js
/**
 * Registers reactive text validation watches on a field context.
 *
 * @param {import('@vueda/use/useField.js').FieldContext} fieldContext - The field context to validate against.
 * @param {TextValidationOptions} options - Constraint configuration.
 * @returns {void}
 */
export function useTextValidation(fieldContext, options) { ... }
```

### Provide/inject annotations

Annotate `provide()` calls with `/** @type {TypeName} */` on the context object. Annotate `inject()` calls with the expected type including null:

```js
/** @type {import('@vueda/use/useField.js').FieldContext|null} */
const fieldContext = inject(FieldContextSymbol, null);
```

### Private/unexported functions

Private helpers do not appear in generated API docs, but they benefit from `@param`/`@returns` type annotations for IDE inference (autocomplete, hover tooltips, inline errors). Prose descriptions are optional; bare types are enough:

```js
/**
 * @param {string|Date} raw
 * @returns {import('luxon').DateTime|null}
 */
function parseToDate(raw) { ... }
```

Complete type annotations also position the codebase for future `.d.ts` generation from JSDoc.

---


## Test Structure and Isolation

- Use `scopedIt(...)` from `@tests/unit/utils.js` in place of `it(...)` for all tests involving Vue components, reactivity, lifecycle hooks, or injections. This runs tests in a fresh `effectScope()` to prevent state leakage.

- Wrap all test files in a root `describe("<source file path>", ...)` block (e.g. `describe("lib/components/ActionForm.vue", ...)`) to clearly associate tests with their source. This improves readability, traceability in CI, and allows behavioral grouping inside without losing context.

- Group related tests with `describe(...)` blocks that reflect **behavioral responsibilities**, not implementation details (e.g. `"Confirm flow"` or `"Rendering with slots"`).

---

## Test Execution

For fast feedback during development, run only the spec file you are currently working on:

```bash
pnpm -C client test run tests/unit/lib/components/MyComponent.spec.js
```

Multiple files or a glob may be passed if the feature spans more than one spec.

Run the full suite before marking a task complete or opening a PR:

```bash
pnpm -C client test run
```

### Terse output

For a compact summary, use `--reporter=dot` (one character per test) or `--reporter=basic` (one line per file):

```bash
pnpm -C client test run --reporter=dot
pnpm -C client test run tests/unit/lib/components/MyComponent.spec.js --reporter=basic
```

To stop on the first failure, add `--bail=1`:

```bash
pnpm -C client test run --bail=1 --reporter=dot
```

### Piping caution

**Do not pipe test output through `head` or `tail`.** Vitest spawns multiple worker processes; when `head`/`tail` exits early and sends SIGPIPE, the workers may not terminate cleanly and will continue consuming memory in the background. Running the suite again before those workers die compounds the problem and can OOM the system.

To capture output for later inspection, redirect to a file instead:

```bash
pnpm -C client test run > /tmp/test-out.txt 2>&1
grep "FAIL\|×" /tmp/test-out.txt
```

---

## Coverage Limitations

Running less than the full suite with coverage is **not recommended**, due to how coverage is collected by `istanbul` and `v8`.

Spec files that dynamically import components (e.g. for mocking) may not produce reliable coverage output in isolation. Coverage for a single file is often misleading. Always run the full suite for coverage:

```bash
pnpm -C client run coverage
```
