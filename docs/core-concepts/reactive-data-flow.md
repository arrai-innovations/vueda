---
title: Reactive Data Flow (Stores + Composables)
type: explanation
audience: implementor
status: brainstorming
---

# Reactive Data Flow (Stores + Composables)

## One-Sentence Summary

VUEDA client uses stores and composables to coordinate metadata, object data, and view state in a predictable reactive graph.

## What This Concept Should Explain

- Responsibilities of stores versus composables
- How loading/error states propagate through composed hooks
- Where memoization and caching boundaries exist
## How It Connects to Implementation

- storeModelInfo, storeModelConfig, storeWorkflow usage patterns
- useModelConfig/useFilteredActions/useWorkflowTransitions dependencies
- Route-driven recomputation and state reuse
## Common Pitfalls (Brainstorm)

- Creating reactive effects outside component scopes
- Duplicating network fetches by bypassing shared stores
- Tightly coupling components to raw API calls
