# Client Annotation Contract

This briefing is the authoritative contract for the annotations that the docs-tooling pipeline reads from `client/lib/` source files. The extractors live in `docs-tooling/js/extractors/`; the renderers that produce the rendered Markdown pages live in `docs-tooling/js/renderers/`. If you want a component, prop, slot, theme key, or token to appear in the generated docs, you must follow these conventions.

This briefing is `@`-imported into `client/AGENTS.md` and `docs-tooling/AGENTS.md`, and linked from `client/README.md`. It is the single source of truth; update it here when the extractors change.

## Component description (Vue SFCs)

Every Vue SFC in `client/lib/` should have a JSDoc block that describes what the component does. Place it **after** the imports and **immediately before `defineOptions()`**. vue-docgen-api reads the description from the JSDoc that directly precedes `defineOptions()`. A JSDoc placed before the imports is silently ignored.

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

## `@vueda-spread` on shared prop/emit constants (JS files)

When a composable exports a constant that components spread into `props` or `emits`, mark it with `@vueda-spread props` or `@vueda-spread emits` in its JSDoc block. The vue-docgen normalizer injects those entries into every component that spreads the constant.

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

## `<!-- @slot ... -->` for dynamic slots (Vue SFC templates)

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

## Theme key annotations (`lib/theme/vueda-tailwind/<family>/index.js`)

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
