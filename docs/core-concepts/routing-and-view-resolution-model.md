---
title: Routing and View Resolution Model
type: explanation
audience: implementor
status: brainstorming
---

# Routing and View Resolution Model

## One-Sentence Summary

Routing resolves app/model/action inputs into concrete list/detail views and action components based on metadata and workflow state.

## What This Concept Should Explain

- How CRUD route builders structure detail versus list URLs
- How action-router chooses built-in views, workflow transition view, or custom action views
- How route guards enforce auth and metadata readiness
## How It Connects to Implementation

- makeCRUDRoutes and getCRUDForTo helper behavior
- ViewActionRouter component selection logic
- Router guard flow for auth, groups, and model info
## Common Pitfalls (Brainstorm)

- Hardcoding routes that ignore metadata-driven action availability
- Assuming every action is detail-scoped
- Not handling unknown actions and fallback views
