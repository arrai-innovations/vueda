# VUEDA Monorepo Agent Guide

This is a monorepo. Start here, then read the package guide for the area
you’re working in:

- Server guide: `server/AGENTS.md`
- Client guide: `client/AGENTS.md`
- Docs tooling guide: `docs-tooling/AGENTS.md`

## Common Commands (root)

- Bootstrap: `just bootstrap`
- Checks (read‑only): `just check`
- Fix (auto‑format): `just fix`
- Tests: `just test`

## Commit Message Style

We use a custom commitlint configuration based on [Conventional Commits](https://www.conventionalcommits.org/).
Valid types:

```
build, ci, chore, content, docs, feat, fix, perf, refactor, remove, revert, style, test, wip
```

Example:

```
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
