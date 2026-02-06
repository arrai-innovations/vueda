---
title: Add Workflow State and Transition Permissions
type: how-to
audience: implementor
status: brainstorming
---

# Add Workflow State and Transition Permissions

## When to Use This

Use this when authorization or allowed actions should depend on object lifecycle state.

## Goal

Apply state and transition permissions as an overlay on baseline CRUDL permissions.

## Prerequisites

- Workflow models and transitions exist for target resource
- Permission groups are defined
- State and transition policies are documented
## Planned Steps (Brainstorm)

- Map lifecycle states to allowed and denied operations
- Configure state permissions and transition permissions
- Verify transition availability per user/group and object state
- Confirm interaction with base model/object permissions
- Test grant and deny behavior at state boundaries
## Verification (Brainstorm)

- Transition options vary correctly by state and group
- Forbidden transitions are blocked server-side
- State changes immediately affect available actions
