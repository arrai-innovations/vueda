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

### Theme key annotations (`lib/theme/vueda-tailwind/<family>/index.js`)

The theme-keys extractor (`docs-tooling/js/extractors/theme-keys.js`) walks the default-export object of each family `index.js` file and emits one entry per slot. Authors control the rendered theming pages through five conventions inside those files.

**Component key.** Each top-level key in the default export is one rendered theme entry. The key name must match the consumer-facing Vue component name so the generated `Theme entry: {@api theme-key:<Name>}` cross-link from the component's API page resolves.

```js
export default {
    Card: {
        // ...slots
    },
};
```

**Primitive prefix.** An underscore prefix marks the entry as a composition primitive (rendered with `kind: "primitive"` and an explanatory note on the page). Primitives exist to be referenced by other entries' `composes` lists; they are not consumed directly.

```js
_ButtonBase: { root: { class: "..." } },
Button: { root: { composes: ["_ButtonBase.root"], class: "..." } },
```

**Group banner.** A line comment of the form `// ---------- Title ----------` above a component key sets the group label used to bucket the family index page. The most recent banner sticks until a new one appears.

```js
// ---------- Card ----------
Card: { /* ... */ },
CardHeader: { /* ... */ },
```

**JSDoc descriptions.** A `/** ... */` block immediately above a slot key becomes the slot description in both the per-component page and the family summary table. A JSDoc block on the component key becomes the fallback description used when a slot has none.

```js
Card: {
    /** The outer card surface: border, radius, shadow, fill. */
    root: { class: "..." },
},
```

**Slot value shape.** The extractor accepts four shapes for a slot value:

- A bare string, array, or template literal at the top level is treated as the `class` and flattened into the static class list.
- An object with `class:` and optional `composes:` is the canonical form. `class:` may be a string, array (nested arrays and object keys are flattened), template literal with no expressions, or callback. `composes:` must be an array of `"Target.slot"` string literals.
- A callback (arrow or function expression) at the top level or as the `class:` value renders verbatim as the slot's callback source; no static class list is produced.
- Object-expression `class:` values can mix string entries with object entries; object keys are harvested as class names (useful for conditional class objects whose keys are known at authoring time).

Slot values that do not match these shapes are skipped silently, so a slot that fails to render usually means the value is neither a string/array/template/callback nor an object with a recognised `class:`/`composes:`.

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
