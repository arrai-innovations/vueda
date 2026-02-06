---
title: Design Principles
type: explanation
audience: implementor
status: draft
---

# Design Principles

This is the short list of defaults that most other documentation assumes.

## Server-Side Principles

- Base-class centralization (extend via mixins, not one-off overrides).
- Strict input hygiene (unknown fields/query params rejected by default).
- Explicit expand/sparse controls (declared and validated).
- Transaction safety by default (atomic writes).
- Row-level permission filtering in viewsets.

## Client-Side Principles

- Composition-first APIs (composables/helpers over inheritance).
- State-first contracts (stable state shape + explicit transitions).
- Safe reactivity boundaries (cleanup and predictable reactivity).
- Cancellable async flows (avoid duplicate in-flight work).

