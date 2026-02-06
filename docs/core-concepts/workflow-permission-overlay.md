---
title: Workflow as a Permission Overlay
type: explanation
audience: implementor
status: brainstorming
---

# Workflow as a Permission Overlay

## One-Sentence Summary

Workflow overlay augments baseline permissions by making allowed operations dependent on object state and transition rules.

## What This Concept Should Explain

- How workflows, states, transitions, and permissions relate
- Why overlay model is safer than replacing base permissions
- How transition execution and state changes affect action availability
## How It Connects to Implementation

- Workflow models for state and transition permissions
- Permission classes that short-circuit or refine checks
- Client workflow store fetching transitions and applying them in action views
## Common Pitfalls (Brainstorm)

- Treating workflow as purely visual status with no auth impact
- Bypassing transition permission checks in custom actions
- Ignoring migration and history implications of workflow edits
