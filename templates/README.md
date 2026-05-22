# Copier Templates

This directory contains starter templates for integrator VUEDA monorepos.

## Available Templates

- `integrator-monorepo`: minimal setup with direct `uv`/`pnpm` workflows.
- `integrator-monorepo-dx`: DX-focused setup with repository automation via `just`.

## Prerequisites

- [Copier](https://copier.readthedocs.io/)
- [uv](https://docs.astral.sh/uv/)
- [pnpm](https://pnpm.io/)
- Python 3.11+
- Node.js 22+

## Usage

Run Copier from the repository root where this `templates/` directory exists:

```console
$ copier copy templates/integrator-monorepo <destination-dir>
```

or

```console
$ copier copy templates/integrator-monorepo-dx <destination-dir>
```

Copier will prompt for values defined in each template's `copier.yml`.

## Next Steps After Generation

### `integrator-monorepo`

```console
$ cd <destination-dir>
$ uv sync --all-packages
$ pnpm install
```

Create `server/config.local.toml` and set at least `SECRET_KEY`.

### `integrator-monorepo-dx`

```console
$ cd <destination-dir>
$ just bootstrap
```

Create `server/config.local.toml` and set at least `SECRET_KEY`.

## Template-Specific Docs

Each generated project includes its own `README.md` with run commands.
