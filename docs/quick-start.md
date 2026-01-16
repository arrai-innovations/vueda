# VUEDA Quick Start Guide

This guide documents the **supported, opinionated starting point** for a
VUEDA-based project. It uses a **monorepo**,**uv** for Python, and **pnpm** for Node
(matching the VUEDA monorepo workflow). It focuses on the minimum install + configuration steps
needed to get a VUEDA API server and a VUEDA client appication talking to each other.

If you already have an existing Django or Vue project, this guide is still
useful as a reference for how VUEDA expects projects to be structured, but it
does not attempt to provide conversion steps.

## Prerequisites

- [Python 3.11+](https://www.python.org/downloads/)
- [Node.js 20+](https://nodejs.org/en/download/)
- [`uv`](https://docs.astral.sh/uv/)
- [`pnpm`](https://pnpm.io/)
- [`just`](https://just.systems/man/en/introduction.html)
- A [PostgreSQL](https://www.postgresql.org/) database
- Access to the private package registries ([private PyPI](http://pypi.arrai.dev/) for `vueda`, npm for
  `@arrai-innovations/vueda`) <!-- todo: remove when public -->

## Repository Layout

The project is organized as a monorepo with a Django server and a Vue.js client:

```
your-project/
├── server/ # Django + DRF API using vueda (Python)
│ ├── config/ # Django settings, urls, ASGI/WGI entrypoints
│ ├── tests/ # pytest-based test suite
│ ├── your_project/ # namespace package for all Django apps
│ ├── manage.py # Django management entrypoint
│ └── pyproject.toml
├── client/ # Vue app using @arrai-innovations/vueda (Node)
│ ├── src/ # application source (components, views, router, composables)
│ ├── public/ # static assets
│ ├── tests/ # vitest-based test suite
│ ├── index.html # vite entrypoint
│ ├── package.json # (p)npm project definition
│ └── vite.config.js
├── pyproject.toml # uv workspace root
├── pnpm-workspace.yaml # pnpm workspace definition
└── Justfile # common development commands
```

### Server

All Django apps live under a single, project-namespaced package
(`your_project/`). This avoids top-level app sprawl and makes imports,
permissions, and routing easier to reason about at scale.

The `config/` package contains all Django configuration (settings, urls,
ASGI/WGI entrypoints). Project code should not live there.

### Client

The Vue app follows a conventional Vite layout. VUEDA-specific setup lives
in small, explicit initialization modules (for example, model and theme
setup) rather than being hidden in `main.js`.

## Create the Monorepo

1. Initialize the repo:

   ```console
   $ mkdir your-project
   $ cd your-project
   ```

2. Create a uv workspace at the repo root:

   ```console
   $ uv init --bare
   $ uv add --dev "md-toc"
   ```

   Prepend the workspace configuration to the top of the generated `pyproject.toml`:

   ```toml
   [tool.uv.workspace]
   members = ["server"]
   ...
   ```

3. Add a pnpm workspace file (`pnpm-workspace.yaml`) at the repo root:

   ```yaml
   packages:
     - client
     - server
   ```

4. Start a `Justfile` for common convenience commands at the repo root:

   ```make
   bootstrap:
     pnpm install
     uv sync --all-groups --all-packages
     pnpm exec lefthook install
   ```
   
   Run the bootstrap command to install dependencies, setup environments, and
   configure git hooks:

   ```console
   $ just bootstrap
   ```

## Server Setup (Django + VUEDA Server)

1. Create the Django project skeleton in `server/`:

   ```console
   $ mkdir server
   $ cd server
   $ uv init --bare
   $ uv add vueda
   $ uv sync
   $ mkdir -p config settings apps
   ```

2. Configure your private PyPI index (required to resolve `vueda`):

   Add credentials to your environment:

   ```console
   $ export UV_INDEX_ARRAI_USERNAME=your-username
   $ export UV_INDEX_ARRAI_PASSWORD=your-password
   ```

   Then in `server/pyproject.toml`, add:

   ```toml
   [[tool.uv.index]]
   name = "arrai"
   url = "https://pypi.arrai.dev/simple/"
   explicit = true

   [tool.uv.sources]
   vueda = { index = "arrai" }
   ```

3. Add your Django project files (settings, urls, wsgi/asgi).

   We do **not** use `django-admin startproject` because it doesn't match our
   preferred layout. Create the project files by hand to match the layout we
   standardize on (config package + namespaced apps).

   At a minimum, you need:

   - `manage.py`
   - `config/__init__.py`
   - `config/urls.py`
   - `config/wsgi.py` (or `config/asgi.py`)
   - settings module(s) under `settings/` (single file or split per environment)

4. Update Django settings:

   - Add `vueda` to `INSTALLED_APPS`.
   - Add the history middleware (even if you do not otherwise use
     `django-simple-history`).
   - Import the permission patch at the end of settings.

   Example (snippets):

   ```py
   INSTALLED_APPS = [
       # ...
       "vueda",
   ]
   ```

   ```py
   MIDDLEWARE = [
       # ...
       "simple_history.middleware.HistoryRequestMiddleware",
   ]
   ```

   ```py
   from vueda.core import patch_django  # noqa: F401
   ```

5. Add VUEDA URLs:

   ```py
   from django.urls import include
   from django.urls import path

   urlpatterns = [
       # ...
       path("api/vueda/", include("vueda.urls")),
   ]
   ```

6. Apply migrations and create a user:

   ```console
   $ uv run python manage.py migrate
   $ uv run python manage.py createsuperuser
   ```

## Client Setup (Vue + VUEDA Client)

1. Create the Vue app skeleton in `client/`:

   ```console
   $ cd ../
   $ cd client
   $ mkdir -p src public tests
   ```

   We do **not** use `pnpm create vue@latest` because it doesn't match our
   preferred client layout. Create the project files by hand to match the
   layout we standardize on, then add dependencies with `pnpm`.

2. Install the VUEDA client package:

   ```console
   $ pnpm add @arrai-innovations/vueda
   ```

3. Install required peer dependencies.

   VUEDA Client declares several peer dependencies (Vue, PrimeVue, Pinia, etc.).
   Use the peer dependency list from `@arrai-innovations/vueda` and install any
   missing packages for your app.

4. Point VUEDA Client to your API base URL.

   At minimum, you will need to supply the API base URL and auth behavior in
   your app configuration. The exact setup depends on how you organize your
   Vue app and router, so start with a thin config and expand as you build
   your models and views.

## Run Locally

From the repo root:

```console
$ uv run --project server python server/manage.py runserver
$ pnpm -C client run dev
```

You should now have a running Django API and a Vue frontend. The VUEDA client
components will consume the VUEDA API endpoints under `/api/vueda/`.

## Tooling Notes (ruff, eslint, prettier, md-toc)

These are recommended, but not strictly required to get started.

- **ruff**: used by VUEDA Server for linting and formatting.
- **eslint + prettier**: used by VUEDA Client.
- **md-toc**: used in the monorepo to keep Markdown TOCs updated.

If you want to match VUEDA’s setup quickly, copy the tooling configs from the
VUEDA monorepo and wire them into your `Justfile` or package scripts.

## CI Notes (CircleCI Orbs)

The VUEDA monorepo does not require CircleCI orbs to run locally. If you need CI,
start with your team’s standard CircleCI template and add jobs for:

- `uv sync` + `ruff` + `pytest` in `server/`
- `pnpm install` + `eslint` + `prettier` + `vitest` in `client/`

If you want exact orbs, use the VUEDA CI config as a reference once you locate it.
