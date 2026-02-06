---
title: Map Django and VUEDA Permission Names
type: how-to
audience: implementor
status: brainstorming
---

# Map Django and VUEDA Permission Names

## When to Use This

Use this when integrating VUEDA into projects that already use Django add/change/view codenames.

## Goal

Configure permission naming so VUEDA actions and existing permission data remain compatible.

## Prerequisites

- You know whether project is greenfield or legacy
- Settings load order is under control
- Permission data migration plan is available
## Planned Steps (Brainstorm)

- Choose mapping direction for new vs existing projects
- Set PERMISSION_NAMES_MAPPING in settings
- Ensure Django patching/import order happens after mapping definition
- Regenerate or reconcile permissions as needed
- Verify has_perm behavior and API authorization outcomes
## Verification (Brainstorm)

- Permission checks resolve to expected codenames
- No action is accidentally opened or blocked by wrong mapping
- Tests cover list/read/create/update/delete checks
