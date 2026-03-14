# VUEDA Docs Tooling

Internal tooling for extracting, normalizing, and rendering API documentation into the VitePress site in `docs/`.

## Pipeline

1. Extract raw data from source tools.
2. Normalize to the canonical schema.
3. Render Markdown bundles and write index pages.

Default outputs live in `docs-tooling/.generated/`:

- Raw extracts: `typedoc.json`, `vue-docgen.json`, `openapi.json`, `pdoc.json`
- Canonical bundles: `*.canonical.json`
- Rendered Markdown: `docs/reference/api/` (default render destination)

The root `just docs-render` command writes rendered output to `docs/reference/api/` for VitePress.

## Sources

- TypeDoc (TypeScript) for `client/lib/`.
- vue-docgen-api (Vue SFC) for `.vue` files in `client/lib/`.
- DRF Spectacular (OpenAPI) from the server via `manage.py spectacular`.
- pdoc (Python) against the server package, using `server/doc_settings.py`.

## Structure

- `bin/docs-tooling.js`: CLI entrypoint and task orchestrator.
- `js/extractors/`: TypeDoc + vue-docgen extractors.
- `js/normalizers/`: source-specific to canonical schema.
- `js/renderers/`: canonical schema to Markdown.
- `js/utils/`: shared helpers (slugify, path mapping, validation).
- `py/dump_pdoc.py`: pdoc model extraction for Python docs.
- `schema/canonical.schema.json`: canonical JSON schema.
- `tests/`: Vitest unit tests (JS).
- `typedoc.json`, `typedoc.tsconfig.json`: TypeDoc configuration.

## CLI

Run from `docs-tooling/`:

### Extract

```console
$ ./bin/docs-tooling.js extract --target all
```

Options:

- `--target` (`all`, `python`, `rest`, `javascript`, `components`)
- `--out-dir` (custom output dir)

### Normalize

```console
$ ./bin/docs-tooling.js normalize --source all
```

Options:

- `--source` (`all`, `typedoc`, `vue-docgen`, `openapi`, `pdoc`)
- `--input` (single-source override)
- `--output` (single-source override)

### Render

```console
$ ./bin/docs-tooling.js render --source all --output ../docs/reference/api
```

Options:

- `--source` (`all`, `typedoc`, `vue-docgen`, `openapi`, `pdoc`)
- `--input` (single-source override)
- `--output` (rendered Markdown dir)

## Workflow

From repo root:

- `just docs-extract`
- `just docs-normalize`
- `just docs-render`
- `just docs-api` (extract + normalize + render)

## Install

From repo root:

```console
$ pnpm install
$ uv sync --all-groups --all-packages
```

If you prefer the curated bootstrap flow:

```console
$ just bootstrap
```

## Source Annotations

The vue-docgen normalizer recognizes two custom annotation conventions in `client/lib/` source files.

### `@vueda-spread` (JS composables)

When a composable exports a constant that other components spread into their `props` or `emits` options, annotate its JSDoc block with `@vueda-spread props` or `@vueda-spread emits`. The normalizer reads the annotation and injects those prop or emit entries into every component that spreads the constant.

```js
/**
 * Standard props shared by all field components.
 *
 * @vueda-spread props
 */
export const FIELD_PROPS = {
    /** The field name. */
    name: { type: String, required: true },
    // ...
};
```

```js
/**
 * Standard emits shared by all field components.
 *
 * @vueda-spread emits
 */
export const FIELD_EMITS = {
    // ...
};
```

Each prop or emit entry should carry a JSDoc line comment (`/** ... */`) directly above it. The normalizer uses those comments as the member descriptions in the generated API docs.

### `<!-- @slot ... -->` (Vue SFC templates)

vue-docgen-api cannot statically resolve dynamic slot names (expressions like `:name="resolvedSlotNames.clearButton.name"`). Place an HTML comment immediately before the `<slot>` element. Two syntaxes are supported:

**Bare form** (single name, no fallbacks):

```html
<!-- @slot filter-clear-button Replaces the clear button inside the filter form. -->
<slot :name="resolvedSlotNames.clearButton.name" />
```

**Bracket form** (first name is canonical, remaining names are fallback slot names accepted by the same outlet):

```html
<!-- @slot [filter-clear-button, filter-clear-button(filterName)] Replaces the clear button inside the filter form. -->
<slot :name="resolvedSlotNames.clearButton.name" />
```

The bracket form also works on static slots when you want to document fallbacks. An empty bracket list `[]` is a parse error. Use the consumer-facing API name (kebab-case), not the internal resolver expression.

## Tests

JavaScript (Vitest):

```console
$ pnpm -C docs-tooling test
```

Python (pytest):

```console
$ cd docs-tooling && uv run --no-sync pytest
```
