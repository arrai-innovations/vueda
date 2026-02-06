---
title: Primary Key and Identifier Discipline
type: explanation
audience: implementor
status: brainstorming
---

# Primary Key and Identifier Discipline

## One-Sentence Summary

Identifier discipline keeps server and client consistent even though Python and JavaScript often represent keys differently.

## What This Concept Should Explain

- Expected identifier types across API boundaries
- How PK values behave in routes, stores, and form values
- Why consistency matters for caching and reactivity
## How It Connects to Implementation

- Model info pk metadata and object CRUD helpers
- Route builders for list/detail transitions
- Choice values and workflow object keys in client stores
## Common Pitfalls (Brainstorm)

- Mixing numeric and string keys inconsistently in client state
- Assuming route/query PK formats are interchangeable
- Breaking references when coercion rules change
