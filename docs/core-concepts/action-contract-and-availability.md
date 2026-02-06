---
title: Action Contract and Availability
type: explanation
audience: implementor
status: brainstorming
---

# Action Contract and Availability

## One-Sentence Summary

The action contract defines how extra operations are declared, advertised, and executed with consistent client routing.

## What This Concept Should Explain

- Difference between built-in CRUD actions and extra actions
- How action metadata signals detail, bulk, methods, and confirmation behavior
- How availability changes by object state or permissions
## How It Connects to Implementation

- Server action decorator options including bulk and dry-run
- Model-info action metadata generation
- Action-router resolution and filtered-action composable behavior
## Common Pitfalls (Brainstorm)

- Adding actions without exposing metadata needed by client
- Assuming action exists for all objects regardless of state
- Failing to handle unknown or revoked actions gracefully
