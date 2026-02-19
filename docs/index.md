---
title: About
type: index
audience: implementor
status: draft
---

# VUEDA

VUEDA is a framework for building admin-style CRUD applications on top of Django and Vue.js. The server defines models, serializers, and viewsets using VUEDA's base classes; the client discovers those definitions at runtime through a metadata API and generates routes, forms, and views from them. Standard CRUDL surfaces require no hand-wired per-model client code.

It is an opinionated alternative to `django-admin` for teams that need a modern, maintainable frontend and a predictable server contract.

## Who This Is For

This documentation is written for **implementors**: teams integrating VUEDA into a domain application. It assumes working knowledge of:

- [Python](https://www.python.org/doc/) and [Django](https://docs.djangoproject.com/)
- [Django REST framework](https://www.django-rest-framework.org/)
- [Vue.js](https://vuejs.org/guide/introduction) and [Node.js](https://nodejs.org/docs/latest/api/)
- General web development and REST API concepts ([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started))

If you are contributing to VUEDA itself rather than building on top of it, contributor documentation lives in the repository's root `AGENTS.md` and `CONTRIBUTING.md`.

## Documentation Sections

- [**Tutorials**](/tutorials/): Step-by-step walkthroughs for learning VUEDA by doing. Start here if you are new to the framework.

- [**Guides**](/guides/): Task-focused how-to recipes for implementors who already have a running project and need to accomplish a specific thing: split serializers, add workflow transitions, configure list views, integrate VDQ, and more.

- [**Core Concepts**](/core-concepts/): Explanations of how and why VUEDA works the way it does. Covers the metadata contract, permission model, routing and view resolution, reactive data flow, and other architectural invariants. Read these when you need to understand the system, not just use it.

- [**Reference**](/reference/): Authoritative lookup material: configuration surface, permission naming, glossary, changelog, and generated API docs for Python, JavaScript, REST, and Vue components.
