---
title: Authorization vs UI Semantics
type: explanation
audience: implementor
status: brainstorming
---

# Authorization vs UI Semantics

## One-Sentence Summary

VUEDA separates server authorization from client affordance decisions so security and UX can evolve independently.

## What This Concept Should Explain

- What authorization guarantees must remain server-side
- What UI semantics can safely do in client code
- How to handle cases where UI and server decision diverge
## How It Connects to Implementation

- Server permission enforcement in viewsets and actions
- Client action filtering and route guards
- Error handling paths when server rejects a user-visible action
## Common Pitfalls (Brainstorm)

- Equating hidden buttons with actual authorization
- Treating 403 responses as impossible if UI is filtered
- Encoding business security rules only in frontend logic
