# VUEDA Docs Tooling

Internal tooling for extracting, normalizing, and rendering API documentation into the VitePress site in `docs/`.

<!-- prettier-ignore-start -->
<!--TOC-->

- [VUEDA Docs Tooling](#vueda-docs-tooling)
  - [Pipeline](#pipeline)
  - [Sources](#sources)
  - [Structure](#structure)
  - [CLI](#cli)
    - [Extract](#extract)
    - [Normalize](#normalize)
    - [Render](#render)
  - [Workflow](#workflow)
  - [Install](#install)
  - [Source Annotations](#source-annotations)
  - [Theme keys and CSS tokens](#theme-keys-and-css-tokens)
    - [Theme keys](#theme-keys)
    - [CSS tokens](#css-tokens)
    - [Cross-references between sources](#cross-references-between-sources)
  - [Tests](#tests)

<!--TOC-->
<!-- prettier-ignore-end -->

## Pipeline

1. Extract raw data from source tools.
2. Normalize to the canonical schema.
3. Render Markdown bundles and write index pages.

Default outputs live in `docs-tooling/.generated/`:

- Raw extracts: `typedoc.json`, `vue-docgen.json`, `openapi.json`, `pdoc.json`, `theme-keys.json`, `css-tokens.json`
- Canonical bundles: `*.canonical.json`
- Rendered Markdown: `docs/reference/api/` for code references, and `docs/reference/theming/` for theme keys and CSS tokens

The root `just docs-render` command writes API references under `docs/reference/api/` and theming references under `docs/reference/theming/` for VitePress.

## Sources

- TypeDoc (TypeScript) for `client/lib/`.
- vue-docgen-api (Vue SFC) for `.vue` files in `client/lib/`.
- DRF Spectacular (OpenAPI) from the server via `manage.py spectacular`.
- pdoc (Python) against the server package, using `server/doc_settings.py`.
- Theme keys, parsed from `client/lib/theme/vueda-tailwind/<family>/index.js` with @babel/parser. See "Theme keys and CSS tokens" below.
- CSS tokens, parsed from `client/lib/theme/vueda-tailwind/base.css` with PostCSS. See "Theme keys and CSS tokens" below.

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

- `--target` (`all`, `python`, `rest`, `javascript`, `components`, `theme-keys`, `css-tokens`)
- `--out-dir` (custom output dir)

### Normalize

```console
$ ./bin/docs-tooling.js normalize --source all
```

Options:

- `--source` (`all`, `typedoc`, `vue-docgen`, `openapi`, `pdoc`, `theme-keys`, `css-tokens`)
- `--input` (single-source override)
- `--output` (single-source override)

### Render

```console
$ ./bin/docs-tooling.js render --source all --output ../docs/reference/api
```

Options:

- `--source` (`all`, `typedoc`, `vue-docgen`, `openapi`, `pdoc`, `theme-keys`, `css-tokens`)
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

The extractors read custom annotation conventions from `client/lib/` and `server/vueda/` source files. The authoritative contracts live next to the extractors that enforce them:

- [Client annotation contract](./briefings/client-annotations.md)
- [Server annotation contract](./briefings/server-annotations.md)

When changing an extractor, update the corresponding briefing in the same commit.

## Theme keys and CSS tokens

Theme keys and CSS tokens flow through the same extract/normalize/render pipeline as the other sources, but they read directly from the theme files instead of a third-party tool's output.

### Theme keys

- Source files: `client/lib/theme/vueda-tailwind/<family>/index.js`. The family list (`controls`, `grid`, `objects-grid`, `form`, `widgets`, `shell`, `views`, `navigation`, `display`, `feedback`) is hardcoded in the extractor.
- Raw extract: `.generated/theme-keys.json`; canonical bundle: `.generated/theme-keys.canonical.json`.
- Rendered output:
    - `docs/reference/theming/keys.md` (global index)
    - `docs/reference/theming/keys/family/<family-slug>.md` (one per family)
    - `docs/reference/theming/keys/<Component>.md` (one per component or primitive, with a per-slot detail block on each page)

Authoring conventions for theme-key source files live in the [client annotation contract](./briefings/client-annotations.md) (component name, slot JSDoc, banner comments, `composes`, primitive `_` prefix).

### CSS tokens

- Source file: `client/lib/theme/vueda-tailwind/base.css`.
- Raw extract: `.generated/css-tokens.json`; canonical bundle: `.generated/css-tokens.canonical.json`.
- Rendered output:
    - `docs/reference/theming/tokens.md` (global index)
    - `docs/reference/theming/tokens/<group-slug>.md` (one per group)

Authoring conventions for `base.css` (group banners, trailing-comment descriptions, `@theme inline` aliasing) live in the [client annotation contract](./briefings/client-annotations.md).

### Cross-references between sources

When `render` is given both `vue-docgen` and `theme-keys` (the default with `--source all`), the CLI pre-loads a theme-keys component index and passes it to the vue-docgen renderer. Component pages then emit `Theme entry: {@api theme-key:<Component>}` when a matching key exists, so authored docs and generated component pages share the same `@api` reference scheme. See the [client annotation contract](./briefings/client-annotations.md) § Cross-references between sources for the full ID surface.

## Tests

JavaScript (Vitest):

```console
$ pnpm -C docs-tooling test
```

Python (pytest):

```console
$ cd docs-tooling && uv run --no-sync pytest
```
