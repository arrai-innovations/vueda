---
title: Permission Model (CRUDL + Object + State)
type: explanation
audience: implementor
status: brainstorming
---

# Permission Model (CRUDL + Object + State)

## One-Sentence Summary

VUEDA permission evaluation layers model-level CRUDL checks, object-level checks, row-level filters, and optional workflow-state overlays.

## What This Concept Should Explain

- Base permission requirements for each action
- How object and queryset checks refine access decisions
- How workflow state permissions grant or deny behavior contextually
## How It Connects to Implementation

- ObjectPermissions behavior and perms_map logic
- BaseRowLevelPermissions hooks used by list filtering
- Workflow permission models and transition permission checks
## Common Pitfalls (Brainstorm)

- Relying on only one permission layer and ignoring others
- Assuming list visibility implies detail/update access
- Forgetting to test permissions across state transitions
