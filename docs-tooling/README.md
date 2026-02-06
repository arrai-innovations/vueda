# VUEDA Docs Tooling

Internal tooling for extracting, normalizing, and rendering API documentation into the VitePress site in `docs/`.

**Pipeline**

1. Extract raw data from source tools.
2. Normalize to the canonical schema.
3. Render Markdown bundles and write index pages.

Default outputs live in `docs-tooling/.generated/`:
- Raw extracts: `typedoc.json`, `vue-docgen.json`, `openapi.json`, `pdoc.json`
- Canonical bundles: `*.canonical.json`
- Rendered Markdown: `docs/reference/api/` (default render destination)

The root `just docs-render` command writes rendered output to `docs/reference/api/` for VitePress.

**Sources**

- TypeDoc (TypeScript) for `client/lib/`.
- vue-docgen-api (Vue SFC) for `.vue` files in `client/lib/`.
- DRF Spectacular (OpenAPI) from the server via `manage.py spectacular`.
- pdoc (Python) against the server package, using `server/doc_settings.py`.

**Structure**

- `bin/docs-tooling.js`: CLI entrypoint and task orchestrator.
- `js/extractors/`: TypeDoc + vue-docgen extractors.
- `js/normalizers/`: source-specific to canonical schema.
- `js/renderers/`: canonical schema to Markdown.
- `js/utils/`: shared helpers (slugify, path mapping, validation).
- `py/dump_pdoc.py`: pdoc model extraction for Python docs.
- `schema/canonical.schema.json`: canonical JSON schema.
- `tests/`: Vitest unit tests (JS).
- `typedoc.json`, `typedoc.tsconfig.json`: TypeDoc configuration.

**CLI**

Run from `docs-tooling/`:

- Extract:

```bash
./bin/docs-tooling.js extract --target all
```

Options:
- `--target` (`all`, `python`, `rest`, `javascript`, `components`)
- `--out-dir` (custom output dir)

- Normalize:

```bash
./bin/docs-tooling.js normalize --source all
```

Options:
- `--source` (`all`, `typedoc`, `vue-docgen`, `openapi`, `pdoc`)
- `--input` (single-source override)
- `--output` (single-source override)

- Render:

```bash
./bin/docs-tooling.js render --source all --output ../docs/reference/api
```

Options:
- `--source` (`all`, `typedoc`, `vue-docgen`, `openapi`, `pdoc`)
- `--input` (single-source override)
- `--output` (rendered Markdown dir)

**Workflow**

From repo root:

- `just docs-extract`
- `just docs-normalize`
- `just docs-render`
- `just docs-api` (extract + normalize + render)

**Install**

From repo root:

```bash
pnpm install
uv sync --all-groups --all-packages
```

If you prefer the curated bootstrap flow:

```bash
just bootstrap
```

**Tests**

JavaScript (Vitest):

```bash
pnpm -C docs-tooling test
```

Python (pytest):

```bash
cd docs-tooling && uv run --no-sync pytest
```
