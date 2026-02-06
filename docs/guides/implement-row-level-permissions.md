---
title: Implement Row-Level Permissions
type: how-to
audience: implementor
status: brainstorming
---

# Implement Row-Level Permissions

## When to Use This

Use this when access should vary per object row, not just per model action.

## Goal

Enforce per-row access in queryset and object checks without leaking inaccessible data.

## Prerequisites

- Permission rules for row access are defined
- Target models can expose RowLevelPermissions
- List endpoints use row-level filtering mixin behavior
## Planned Steps (Brainstorm)

- Implement check_queryset and check_instance logic for target model
- Integrate permission class and verify viewset behavior per action
- Confirm list responses exclude unauthorized rows
- Ensure detail endpoints reject unauthorized object access
- Add tests for mixed-authority datasets
## Verification (Brainstorm)

- Users only see permitted rows in list
- Direct access to forbidden rows is denied
- Aggregates and pagination respect row-level filtering
