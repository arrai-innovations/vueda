---
title: VDQ and Background Work Model
type: explanation
audience: implementor
status: brainstorming
---

# VDQ and Background Work Model

## One-Sentence Summary

VDQ provides a queue-backed model for deferred work with workflow-aware state transitions, retries, and operational visibility.

## What This Concept Should Explain

- Queue item lifecycle and done-state semantics
- How dispatch handlers interact with business models and transitions
- How retry/cancel behaviors should be designed
## How It Connects to Implementation

- VDQ models, schedulers, tasks, and handlers
- Workflow integration for queue item transitions
- Client/admin surfaces for observing queue status
## Common Pitfalls (Brainstorm)

- Running non-idempotent tasks without safeguards
- Retrying tasks without clear backoff and cancellation behavior
- Ignoring attachment cleanup and result auditing
