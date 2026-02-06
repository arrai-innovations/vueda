---
title: Control Action Availability in the UI
type: how-to
audience: implementor
status: brainstorming
---

# Control Action Availability in the UI

## When to Use This

Use this when action visibility should align with metadata, groups, and current object state.

## Goal

Show users only meaningful actions while keeping server authorization as final authority.

## Prerequisites

- Action metadata is available from model-info/object payloads
- Group data is available in user store
- Workflow transitions are configured where relevant
## Planned Steps (Brainstorm)

- Define server-side action permissions and availability signals
- Apply client filtering based on actions config and user groups
- Merge workflow transitions with standard actions in routing
- Handle missing or revoked actions with safe fallbacks
- Test direct URL access to unauthorized actions
## Verification (Brainstorm)

- Visible actions match expected permissions and state
- Unauthorized action calls are blocked by server
- Action-router handles unknown actions gracefully
