# VUEDA Monorepo Agent Guide

This is a monorepo. Start here, then read the package guide for the area
you’re working in:

- Server guide: `server/AGENTS.md`
- Client guide: `client/AGENTS.md`
- Docs tooling guide: `docs-tooling/AGENTS.md`
- Docs (vitepress) guide: `docs/AGENTS.md`

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
