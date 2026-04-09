# Agent Guidelines: `@arrai-innovations/vueda`

This directory contains **`@arrai-innovations/vueda`**, a Vue 3 component library built with **Vite**. Consuming projects use an alias `@vueda` that resolves directly to the `lib/` source directory. This allows customization developers to import uncompiled components and composables.

---

## Local Development

To get started:

- Install dependencies with:

    ```bash
    pnpm install
    ```

- Run tests: `just test-client` (accepts extra vitest args, paths relative to `client/`)

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

- **test** - `pnpx --no-install vitest`

- **coverage** - `pnpm -C client test -- run --coverage`

- **docs** - (placeholder for future JSDoc generation)

- **eslint** - `pnpm -C client eslint --fix .`

- **prettier** - `pnpm -C client prettier --write .`

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

## API Documentation Annotations

The docs pipeline (`docs-tooling/`) picks up two custom annotations from `client/lib/` source files. Use them when adding or updating components.

### Component description (Vue SFCs)

Every Vue SFC in `client/lib/` should have a JSDoc block that describes what the component does. Place it **after** the imports and **immediately before `defineOptions()`**. vue-docgen-api reads the description from the JSDoc that directly precedes `defineOptions()` — a JSDoc placed before the imports will be silently ignored.

Always include `defineOptions()` even when you have no options to set; it provides the required anchor for the description comment.

```vue
<script setup>
import { ... } from "...";

/**
 * One to three sentences describing what this component does.
 */
defineOptions({
    inheritAttrs: false, // only when needed
});
```

Prop descriptions use inline JSDoc above each key inside `defineProps({...})`:

```js
const props = defineProps({
    /** The field name. */
    name: { type: String, required: true },
});
```

### `@vueda-spread` on shared prop/emit constants (JS files)

When a composable exports a constant that components spread into `props` or `emits`, mark it with `@vueda-spread props` or `@vueda-spread emits` in its JSDoc block. The normalizer injects those entries into every component that spreads the constant.

```js
/**
 * Props shared by all field components.
 *
 * @vueda-spread props
 */
export const FIELD_PROPS = {
    /** The field name. */
    name: { type: String, required: true },
};
```

Add a JSDoc line comment (`/** ... */`) above each prop or emit entry. Those comments become the member descriptions in the rendered API reference.

### `<!-- @slot ... -->` for dynamic slots (Vue SFC templates)

vue-docgen-api cannot statically read dynamic slot names (`:name="someExpression"`). Place an HTML comment immediately before any such `<slot>` element.

**Bare form** (no fallbacks):

```html
<!-- @slot filter-clear-button Replaces the clear button inside the filter form. -->
<slot :name="resolvedSlotNames.clearButton.name" />
```

**Bracket form** (with fallback slot names):

```html
<!-- @slot [filter-clear-button, filter-clear-button(filterName)] Replaces the clear button inside the filter form. -->
<slot :name="resolvedSlotNames.clearButton.name" />
```

The first name in the bracket list is the canonical slot name; remaining names are fallbacks accepted by the same outlet. An empty bracket list `[]` is a parse error. The bracket form also works on static slots when you want to document fallbacks alongside an already-named slot.

Use the consumer-facing API name, not the internal expression. For static slot names (`name="foo"`) with no fallbacks, vue-docgen picks up the name automatically and no annotation is needed.

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

---

## Coverage Limitations

Running less than the full suite with coverage is **not recommended**, due to how coverage is collected by `istanbul` and `v8`.

Spec files that dynamically import components (e.g. for mocking) may not produce reliable coverage output in isolation. Coverage for a single file is often misleading. Always run the full suite for coverage:

```bash
pnpm -C client run coverage
```
