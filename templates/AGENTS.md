# Templates Agent Guide

Use this guide when working on files under `templates/`.

## Template Variants

- `implementor-monorepo`: Minimal template with direct `uv`/`pnpm` workflows.
- `implementor-monorepo-dx`: DX-focused template adding `just`, `lefthook`, and `ruff`.

## Keeping Templates in Sync

The two templates share most of their server and client scaffolding. The DX
template adds developer tooling on top; it should not diverge in application
logic, configuration values, or dependency lists (beyond its own tooling deps).

**Standing requirement:** when you change a file that exists in both templates,
apply the equivalent change to the other template in the same commit or PR.

### Expected Differences (DX only)

These files or patterns are intentionally DX-specific and do not need syncing:

- `justfile`, `lefthook.yml`, `ruff.toml` (and `.ruff_cache/`)
- `ruff` in `pyproject.toml.jinja` dev dependencies
- `noqa` comments required by the DX template's ruff rules (e.g. `RUF012` on
  mutable class-level lists in migrations)
- Import style in generated migrations (DX uses combined imports; minimal uses
  single-line imports matching the vueda server convention)
- Inline guidance comments in the minimal template (e.g. `# VUEDA core`,
  `# Add your app URLs here.`) that the DX template omits

### Must Stay in Sync

Everything else, in particular:

- `config.toml.jinja`, `config.local.toml.jinja`
- `config/settings/base.py.jinja` (logic and settings values; comment wording
  may differ for `noqa` but the actual config must match)
- `pyproject.toml.jinja` runtime dependencies (the `dependencies` list, not
  `[dependency-groups]`)
- `config/urls.py.jinja` (URL routing structure)
- `{{ python_package }}/` application code and models

### How to Verify

```bash
diff -rq templates/implementor-monorepo/server templates/implementor-monorepo-dx/server
```

Review each difference and confirm it falls into the "Expected Differences"
list above. New unexplained differences indicate drift that should be fixed.
