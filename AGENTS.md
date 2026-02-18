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

## Documentation Language Guardrails

- Prefer plain language over jargon unless the term is required by the API or domain model.
- On first use of required jargon, define it in one sentence.
- Prefer concrete phrasing (for example, "visible actions" or "route guard blocks navigation") over abstract terms.
- If wording could be misread as authorization behavior, explicitly distinguish UI behavior from server enforcement.
- Optimize for skimmability: short paragraphs, explicit subject/verb structure, and avoid stacked clauses.
