# VUEDA Docs Tooling Guide

This package contains internal tooling that extracts, normalizes, and renders API docs into the VitePress site in `docs/`.

## Commands

- All tests: `just test-docs-tooling`
- JS tests: `just test-docs-tooling-js` (accepts extra vitest args)
- Python tests: `just test-docs-tooling-py` (accepts extra pytest args)
- JS tests (watch): `pnpm -C docs-tooling test:watch`
- Docs pipeline (root): `just docs-extract`, `just docs-normalize`, `just docs-render`, `just docs-api`
- Docs pipeline (local): `cd docs-tooling && ./bin/docs-tooling.js extract|normalize|render`

## Structure

- `bin/docs-tooling.js`: CLI entrypoint and task orchestrator.
- `js/`: JavaScript extractors, normalizers, and renderers.
- `js/utils/`: shared helpers (slugify, path mapping, validation).
- `py/`: Python extractors (pdoc + DRF/OpenAPI).
- `schema/`: canonical JSON schema.
- `tests/`: Vitest and pytest coverage for tooling.
- `.generated/`: intermediate artifacts from extract/normalize steps.

## Test Execution

For fast feedback during development, run only the spec file you are currently working on:

```bash
pnpm -C docs-tooling test -- tests/js/validators/references.test.js
```

Multiple files or a glob may be passed if the change spans more than one spec.

Run the full suite before marking a task complete or opening a PR:

```bash
pnpm -C docs-tooling test
```
