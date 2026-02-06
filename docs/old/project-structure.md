# Project Structure

<!-- todo:
Goal: This is how VUEDA projects are meant to look
This is where:
- Monorepo rationale lives
- Namespaced Django apps explanation lives
- “We do not use django-admin startproject” lives
- Client initialization philosophy lives
- This document reads like a style guide, not a tutorial.
-->

This document outlines the recommended project structure for applications built using VUEDA. Adhering to this structure
helps maintain consistency, scalability, and ease of maintenance across VUEDA projects.

If you already have an existing Django or Vue project, this guide is still useful as a reference for how VUEDA expects
projects to be structured, but it does not attempt to provide conversion steps.

## Repository Layout

A recommended VUEDA project is organised in a git monorepo, with client and server folders, as below. Following this
quick start guide will result in this layout:

```bash
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

