# VUEDA Monorepo

![VUEDA logo - vueda - vue.js user experience for django administration](/docs/assets/logo-text.png)

Links:
- [Server docs](./server/README.md)
- [Client docs](./client/README.md)

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
component library. The server package (`vueda` on our private PyPI) provides DRF
views, serializers, workflow, and permission helpers. The client package
(`@arrai-innovations/vueda` on npm) provides Vue components, composables, and
routing helpers that consume the API and render forms, lists, and detail views
dynamically.

See the package‑specific docs for details:
- [VUEDA Server](./server/README.md)
- [VUEDA Client](./client/README.md)

## Repository Layout

```
/
  server/   # Django + DRF package (VUEDA Server)
  client/   # Vue 3 component library (VUEDA Client)
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
