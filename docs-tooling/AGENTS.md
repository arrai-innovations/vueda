# VUEDA Docs Tooling Guide

This package contains internal tooling that extracts, normalizes, and renders API docs into the VitePress site in `docs/`.

## Commands

- All tests: `just test-docs-tooling`
- JS tests (single run): `pnpm -C docs-tooling test`
- JS tests (watch): `pnpm -C docs-tooling test:watch`
- Python tests: `cd docs-tooling && uv run --group test --no-sync pytest`
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

## Commit Message Style

We use a custom commitlint configuration based on [Conventional Commits](https://www.conventionalcommits.org/). It is customized to have the following valid types:

```
build, ci, chore, content, docs, feat, fix, perf, refactor, remove, revert, style, test, wip
```

**Example**:

```
fix(cli): correct normalize output routing
```

The scope should reference the affected filename (sans extension), module, or concern.
