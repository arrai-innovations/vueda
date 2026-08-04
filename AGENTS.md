# VUEDA Monorepo Agent Guide

This is a monorepo. Start here, then read the package guide for the area
you’re working in:

- Server guide: `server/AGENTS.md`
- Client guide: `client/AGENTS.md`
- Docs tooling guide: `docs-tooling/AGENTS.md`
- Copier templates guide: `templates/AGENTS.md`

## Package Managers

This repo uses two workspace managers, both rooted here:

- **Python**: [uv](https://docs.astral.sh/uv/) workspace (`pyproject.toml`). Members: `server/`, `docs-tooling/`. `just bootstrap` runs `uv sync --all-groups --all-packages` to set up all virtual environments. Use `uv run --no-sync` in member packages after bootstrap.
- **JS**: [pnpm](https://pnpm.io/) workspace (`pnpm-workspace.yaml`). Members: `client/`, `docs/`, `docs-tooling/`, `server/`. `just bootstrap` runs `pnpm install` from the root. Lefthook, ESLint, Prettier, and commitlint live in the root package and are available to all members.

## Common Commands (root)

- Bootstrap: `just bootstrap`
- Checks (read-only): `just check`
- Fix (auto-format): `just fix`
- Tests: `just test`
- Coverage: `just coverage`

### Command naming pattern

`test` and `coverage` follow a `<verb>-<package>` pattern: `<verb>` runs all
packages in parallel; `<verb>-<package>` runs one package. For packages that
contain both a JS and a Python component (`docs-tooling`), a further
`<verb>-<package>-js` / `<verb>-<package>-py` split exists.

`check` and `fix` split by tool rather than package: `<verb>-<tool>`.

Packages: `server`, `client`, `docs-tooling` (and its sub-targets `docs-tooling-js`, `docs-tooling-py`).

`test` and `coverage` sub-targets:

| Verb | server | client | docs-tooling-js | docs-tooling-py |
|------|--------|--------|-----------------|-----------------|
| `test` | `test-server` | `test-client` | `test-docs-tooling-js` | `test-docs-tooling-py` |
| `coverage` | `coverage-server` | `coverage-client` | `coverage-docs-tooling-js` | `coverage-docs-tooling-py` |

`check` and `fix` sub-targets:

| Recipe | Runs |
|--------|------|
| `check-ruff` | `ruff check` (server + docs-tooling) |
| `check-eslint` | `eslint` check (client) |
| `check-prettier` | `prettier` check (client) |
| `fix-ruff` | `ruff check --fix` + `ruff format` |
| `fix-eslint` | `eslint --fix` (client) |
| `fix-prettier` | `prettier --write` (client) |

So, for example, `just test-client`, `just coverage-server`,
`just coverage-docs-tooling-py`, and `just check-eslint` are all valid commands.

All per-package `test` and `coverage` recipes accept extra arguments, which are
forwarded to the underlying test runner (vitest or pytest). Paths must be
relative to the package directory, not the repo root.

```bash
just test-server -k test_login
just test-server tests/test_auth.py
just test-client tests/unit/lib/views/ViewWorkflowTransition.spec.js
just coverage-server --cov-report=html
just test-docs-tooling-py -x --lf
```

## Security Audits

- Python audit: run from the repo root so `pysentry-rs` uses the root
  `uv.lock` workspace resolution:

  ```bash
  uvx pysentry-rs . --config server/pyproject.toml --compact --color never
  ```

  Do not run `uvx pysentry-rs .` from `server/`; that audits direct
  `pyproject.toml` lower bounds and can report false positives that are
  already fixed in `uv.lock`.

- JS audit: run from the repo root:

  ```bash
  pnpm audit
  ```

  Audit ignores and transitive remediation overrides live in
  `pnpm-workspace.yaml`.

## Commit Message Style

We use a custom commitlint configuration based on [Conventional Commits](https://www.conventionalcommits.org/).
Valid types:

```text
build, ci, chore, content, docs, feat, fix, perf, refactor, remove, revert, style, test, wip
```

Example:

```text
fix(UserSerializer): correct password validation logic
```

Scope should reference the affected filename (sans extension), module, or concern.

## Lefthook (Git Hooks)

Configuration lives in `lefthook.yml`. When editing hook commands:

- **No `rg` (ripgrep).** The CI image does not have it. Use `grep` if you
  need shell-level filtering, but prefer lefthook's built-in filtering first.
- **Use lefthook's staged-file features** instead of manual
  `git diff --name-only --cached | grep` pipelines:
  - `glob:` filters staged files by pattern (e.g., `"*.py"`, `"*.{js,ts}"`)
  - `root:` sets the working directory and strips the prefix from file paths
  - `exclude:` removes files by glob list or regex string
  - `{staged_files}` interpolates the filtered file list into `run:`
  - `stage_fixed: true` re-stages files after the command modifies them
- Lefthook skips the command automatically when no files match, so
  `if [ -n "$files" ]` guards are unnecessary.

## Documentation Language Guardrails

- Prefer plain language over jargon unless the term is required by the API or domain model.
- On first use of required jargon, define it in one sentence.
- Prefer concrete phrasing (for example, "visible actions" or "route guard blocks navigation") over abstract terms.
- If wording could be misread as authorization behavior, explicitly distinguish UI behavior from server enforcement.
- Optimize for skimmability: short paragraphs, explicit subject/verb structure, and avoid stacked clauses.
- Use "example.com" for email addresses that appear in documentation.

## Test Conventions

- Use "domain.invalid" for email addresses.
- Use "+1800555[0100-0199] for phone numbers.
