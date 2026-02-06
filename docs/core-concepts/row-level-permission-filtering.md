---
title: Row-Level Permission Filtering
type: explanation
audience: implementor
status: brainstorming
---

# Row-Level Permission Filtering

## One-Sentence Summary

Row-level permission filtering prevents users from seeing or aggregating rows they are not allowed to access.

## What This Concept Should Explain

- Queryset-level versus instance-level permission decisions
- How filtering interacts with pagination and aggregates
- Expected behavior when a user has zero visible rows
## How It Connects to Implementation

- ListRowLevelViewSetMixin filtering flow
- BaseRowLevelPermissions hooks for model-specific logic
- Client assumptions for list counts and empty-state rendering
## Common Pitfalls (Brainstorm)

- Performing row checks only on detail endpoints
- Computing totals before row filters are applied
- Leaking unauthorized records through related expands
