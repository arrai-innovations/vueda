# Copier Templates

This directory contains starter templates for implementor VUEDA monorepos.

## Available Templates

- `implementor-monorepo`: minimal setup with direct `uv`/`pnpm` workflows.
- `implementor-monorepo-dx`: DX-focused setup with repository automation via `just`.

## Prerequisites

- [Copier](https://copier.readthedocs.io/)
- [uv](https://docs.astral.sh/uv/)
- [pnpm](https://pnpm.io/)
- Python 3.11+
- Node.js 22+

## Usage

Run Copier from the repository root where this `templates/` directory exists:

```bash
copier copy templates/implementor-monorepo <destination-dir>
# or
copier copy templates/implementor-monorepo-dx <destination-dir>
```

Copier will prompt for values defined in each template's `copier.yml`.

## Next Steps After Generation

### `implementor-monorepo`

```bash
cd <destination-dir>
uv sync --all-packages
pnpm install
```

Create `server/config.local.toml` and set at least `SECRET_KEY`.

### `implementor-monorepo-dx`

```bash
cd <destination-dir>
just bootstrap
```

Create `server/config.local.toml` and set at least `SECRET_KEY`.

## Template-Specific Docs

Each generated project includes its own `README.md` with run commands.
