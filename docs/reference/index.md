---
audience: integrator
status: draft
type: index
---

# Reference

Reference pages list facts for lookup: permission codenames, theme keys and tokens, component visual contracts, and the terms that the docs use. These pages assume you know Django, Django REST framework, and Vue ([What you need to know](../tutorials/start-building#what-you-need-to-know)).

## Core Reference

- [Configuration Surface](configuration.md): Supported settings and integration knobs for server and client.
- [Permissions](permissions.md): Permission codenames, the codename each request requires, row-level hook signatures, status codes for refused requests, and permission mapping values.
- [Theming](theming.md): The theme keys and CSS tokens of the default theme, and how to choose between the two.
- [Components](components/): The {@term Visual Contract} of each component in the default theme, with links to its theme keys and tokens.
- [Glossary](glossary.md): Definitions of the VUEDA terms used across the guides, concepts, and generated API docs.
- [Changelog](changelog/): Integrator-facing changes, with one page for each package.

## API Reference

docs-tooling generates these pages from the source code, so they are the definitive interface reference.

- [JavaScript API]{@api js:index}
- [Python API]{@api py:index}
- [REST API]{@api rest:index}
- [Vue Components API]{@api vue:index}
