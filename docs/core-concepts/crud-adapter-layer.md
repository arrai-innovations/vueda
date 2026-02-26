---
title: CRUD Adapter Layer
status: brainstorming
audience: implementor
type: explanation
---

# CRUD Adapter Layer

Exists to document what `setupDefaultListCrud()` and `setupDefaultObjectCrud()` register, why VUEDA's composables (`useList`, `useObject`, etc.) require them, and what happens when they are absent.

## Why this page exists

The tutorial tells readers to call these two functions but does not explain the adapter architecture. This page should cover:

- The adapter registry pattern (pluggable HTTP backends for list and object operations)
- What the "default" adapters do (fetch, create, update, delete via VUEDA's `fetchHelper`)
- When a project might swap in custom adapters (e.g., GraphQL, mock/test, offline-first)
- Relationship to cancellable network operations (`docs/core-concepts/cancellable-network-operations.md` covers cancellation but not the adapter concept itself)
