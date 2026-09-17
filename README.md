# VUEDA

<a href="https://vueda.dev">
    <img src="docs/public/assets/logo-text-solid.png" alt="VUEDA: Vue.js User Experience for Django Administration" width="420">
</a>

[![npm alpha](https://img.shields.io/npm/v/@arrai-innovations/vueda/alpha)](https://www.npmjs.com/package/@arrai-innovations/vueda/v/alpha) [![PyPI](https://img.shields.io/pypi/v/vueda)](https://pypi.org/project/vueda/)

**Build business applications with Django and Vue.**

[vueda.dev](https://vueda.dev) · [Documentation](https://vueda.dev/v3/) · [Start building](https://vueda.dev/v3/tutorials/start-building.html) · [Changelog](https://vueda.dev/v3/reference/changelog/)

VUEDA turns your Django models, serializers, and viewsets into Vue forms, lists,
and detail screens. Add workflows, enforce permissions on the server, and track
changes, with control over your application's views and appearance.

[![Widget Warehouse inventory application built with VUEDA](docs/public/assets/homepage-list-preview.png)](https://vueda.dev)

_Widget Warehouse, an example VUEDA application._

## What you can build

VUEDA is for Django teams building custom business applications: inventory
systems, approval processes, and tools for managing business records.

- **Forms and views from server definitions.** Generate routes, forms, lists,
  and detail screens from information the server provides about your models.
- **Workflows and business actions.** Define states, transitions, and the
  permissions needed to move records through a process.
- **Access control and audit history.** Enforce model and object permissions on
  the server and inspect the changes made to records.
- **An interface you can customize.** Configure fields and columns, supply
  custom Vue views and widgets, and adapt the theme to your application.

## How it works

The [server package](server/README.md) extends Django REST framework with base
classes for models, serializers, and viewsets. Registering them exposes metadata:
information about fields, actions, and permissions. The
[client package](client/README.md) uses that metadata to build application screens.

Once the application is connected, standard model screens need no separate
per-model frontend code. You write the business logic and customize the screens
where your application needs something different. The server remains responsible
for authorization; hiding a control in the client does not grant or deny access.

VUEDA uses Django REST framework, PostgreSQL, and Vue 3. See the
[architecture overview](https://vueda.dev/v3/core-concepts/architecture-overview.html)
for the framework's conventions and extension points.

## Start an application

Follow [Start Building](https://vueda.dev/v3/tutorials/start-building.html) to
scaffold a project, connect the Django server and Vue client, and expose an
inventory model from end to end. The [Copier templates](templates/README.md)
provide the starting project structure.

The v3 series is currently a prerelease. Both packages are available from public
registries; no registry credentials are needed. The tutorial and templates select
the v3 releases.

| Package                                                                                    | Role                                                                    |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| [vueda](https://pypi.org/project/vueda/)                                                   | Django models, REST APIs, metadata, permissions, workflows, and history |
| [@arrai-innovations/vueda](https://www.npmjs.com/package/@arrai-innovations/vueda/v/alpha) | Vue components, forms, views, routing, and themes                       |

## Develop VUEDA

These instructions set up the framework repository. To build your own
application, use the tutorial above.

Install [uv](https://docs.astral.sh/uv/getting-started/installation/),
[pnpm](https://pnpm.io/installation), and
[just](https://github.com/casey/just#installation). The starter projects use
Python 3.11+ and Node.js 22+; server tests also need PostgreSQL.

```console
git clone https://github.com/arrai-innovations/vueda.git
cd vueda
just bootstrap
```

Bootstrap installs both workspaces and the Lefthook Git hooks.

| Command                                 | Purpose                                        |
| --------------------------------------- | ---------------------------------------------- |
| `just check`                            | Run lint and formatting checks                 |
| `just fix`                              | Apply lint and formatting fixes                |
| `just test`                             | Run all package tests                          |
| `just test-client` / `just test-server` | Run one package's tests                        |
| `just coverage`                         | Collect test coverage                          |
| `just docs`                             | Generate API documentation and start VitePress |

Test commands accept runner arguments, with paths relative to the package:

```console
just test-client tests/unit/lib/views/ViewActionRouter.spec.js
just test-server -k test_login
```

### Server test database

Use a PostgreSQL role that can create test databases. For example, create a local
role with a password:

```console
createuser --username postgres --pwprompt --createdb vueda
```

Put your connection details in `server/config.local.toml`, which overrides
`server/config.toml`:

```toml
DATABASE_URL = "postgresql://vueda:your-password@localhost/vueda"
```

Some tests also use `TEST_POSTGRES_DB`, the connection string for the PostgreSQL
maintenance database. Set it in the same file if the default local `postgres`
connection does not work in your environment.

### Repository layout

| Directory                               | Contents                      |
| --------------------------------------- | ----------------------------- |
| [server/](server/README.md)             | Django server package         |
| [client/](client/README.md)             | Vue client package            |
| [templates/](templates/README.md)       | Application starter templates |
| [docs/](docs/README.md)                 | VitePress documentation       |
| [docs-tooling/](docs-tooling/README.md) | API documentation generation  |

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening an issue or pull request.
Documentation annotation conventions live in the
[client contract](docs-tooling/briefings/client-annotations.md) and
[server contract](docs-tooling/briefings/server-annotations.md).

### Releases

Packages are published independently using `server-vX.Y.Z` and `client-vX.Y.Z`
tags. When changing the server's major version, update the dependency constraints
in both starter templates' `server/pyproject.toml.jinja` files.

**Server:** ![Tests](https://vueda.dev/artifacts/main/server-pytest.svg) ![Coverage](https://vueda.dev/artifacts/main/server-coverage.svg)

**Client:** ![Tests](https://vueda.dev/artifacts/main/client-test.svg) [![Coverage](https://vueda.dev/artifacts/main/client-test.coverage.svg)](https://vueda.dev/artifacts/main/coverage_client-test/)

## License

Built by [Arrai Innovations](https://arrai.com). Both the [server](server/LICENSE)
and [client](client/LICENSE) are released under the BSD 3-Clause license.
