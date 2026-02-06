---
title: Run Actions in the VUEDA Dispatch Queue (VDQ)
type: how-to
audience: implementor
status: brainstorming
---

# Run Actions in the VUEDA Dispatch Queue (VDQ)

## When to Use This

Use this when action execution is long-running or should happen asynchronously.

## Goal

Move eligible actions into queue-backed execution with observable status and retries.

## Prerequisites

- VDQ and worker infrastructure are configured
- Target action is idempotent or retry-safe
- Monitoring/logging for queue operations is available
## Planned Steps (Brainstorm)

- Identify action boundaries suitable for async execution
- Create and enqueue queue items with required context
- Implement task handlers and failure/retry behavior
- Expose queue status/history to operators or users
- Test cancellation, retry, and completion flows
## Verification (Brainstorm)

- Long-running work no longer blocks request cycle
- Queue item states reflect real task lifecycle
- Retries and failures are handled without data corruption
