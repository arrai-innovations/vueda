# VUEDA Monorepo

![VUEDA Logo - Vue.js User Experience for Django Admin](docs/public/assets/logo-text.svg)

**Server:** [![code style: ruff][]][ruff] [![code style: prettier][]][prettier] ![pytest status][] ![coverage status][] ![ruff status][] ![pip-audit status][]

**Client:** [![code style: prettier][]][prettier] ![tests][] [![coverage: status][]][coverage] ![eslint][] ![audit][]

Package READMEs:

- [Server](./server/README.md)
- [Client](./client/README.md)
- [Copier Templates](./templates/README.md)

<!--prettier-ignore-start-->
<!--TOC-->

- [VUEDA Monorepo](#vueda-monorepo)
  - [About](#about)
  - [Repository Layout](#repository-layout)
  - [Getting Started](#getting-started)
  - [Checks and Tests](#checks-and-tests)
  - [Release Tags](#release-tags)

<!--TOC-->
<!--prettier-ignore-end-->

## About

VUEDA is a two‑part system that pairs a Django REST Framework backend with a Vue.js
component library. The server package (`vueda`) provides DRF views, serializers,
workflow, and permission helpers. The client package (`@arrai-innovations/vueda`)
provides Vue components, composables, and routing helpers that consume the API
and render forms, lists, and detail views dynamically.

## Repository Layout

```
/
  server/       # Django + DRF package (vueda on PyPI)
  client/       # Vue 3 component library (@arrai-innovations/vueda on npm)
  templates/    # Copier starter templates for implementor repos
  docs/         # VitePress documentation site
  docs-tooling/ # Internal tooling for API doc extraction and rendering
```

## Getting Started

```
just bootstrap
```

## Checks and Tests

Read‑only checks:

```
just check
```

Auto‑fixing:

```
just fix
```

Tests:

```
just test
```

## Release Tags

We use tag prefixes to publish packages independently:

- `server-vX.Y.Z` publishes `vueda` (PyPI)
- `client-vX.Y.Z` publishes `@arrai-innovations/vueda` (npm)

[code style: ruff]: https://img.shields.io/badge/code%20style-ruff-000000.svg?style=for-the-badge
[ruff]: https://docs.astral.sh/ruff/formatter/#style-guide
[code style: prettier]: https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=for-the-badge
[prettier]: https://github.com/prettier/prettier
[pytest status]: https://docs.arrai.dev/vueda-server/artifacts/main/pytest.svg
[coverage status]: https://docs.arrai.dev/vueda-server/artifacts/main/pytest.coverage.svg
[ruff status]: https://docs.arrai.dev/vueda-server/artifacts/main/ruff.svg
[pip-audit status]: https://docs.arrai.dev/vueda-server/artifacts/main/pip-audit.svg
[tests]: https://docs.arrai.dev/vueda-client/artifacts/main/tests.svg
[coverage: status]: https://docs.arrai.dev/vueda-client/artifacts/main/tests.coverage.svg
[coverage]: https://docs.arrai.dev/vueda-client/artifacts/main/coverage_tests/
[eslint]: https://docs.arrai.dev/vueda-client/artifacts/main/eslint.svg
[audit]: https://docs.arrai.dev/vueda-client/artifacts/main/npm-audit.svg
