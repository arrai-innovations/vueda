---
title: Cancellable Network Operations
type: explanation
audience: implementor
status: brainstorming
---

# Cancellable Network Operations

## One-Sentence Summary

Cancellable operations reduce stale updates and race conditions when users navigate quickly or trigger repeated requests.

## What This Concept Should Explain

- Which client operations support cancellation and why
- How cancellation affects loading/error lifecycle
- How to design UI that remains consistent after aborts
## How It Connects to Implementation

- Object CRUD helpers using cancellable fetch patterns
- Store-level promise reuse and cancellation behavior
- Component-level watchers that should cancel obsolete requests
## Common Pitfalls (Brainstorm)

- Using async wrappers that drop cancel capability
- Treating aborted requests as hard failures
- Updating UI state from responses tied to stale context
