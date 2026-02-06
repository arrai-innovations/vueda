---
title: Why VUEDA Does Not Use Django Permissions on the Client
type: explanation
audience: implementor
status: brainstorming
---

# Why VUEDA Does Not Use Django Permissions on the Client

## One-Sentence Summary

VUEDA avoids reproducing Django permission logic in the client because that duplicates policy, drifts over time, and weakens security guarantees.

## What This Concept Should Explain

- Why permission policy should have one authoritative implementation
- How client metadata and group hints still improve UX
- Which anti-patterns appear when frontend mirrors backend auth logic
## How It Connects to Implementation

- Server-side has_perm and permission class enforcement
- Client consumption of available actions and workflow transitions
- Reference guidance for mapping permissions without policy duplication
## Common Pitfalls (Brainstorm)

- Building full Django-permission emulation in Vue code
- Using UI checks as a substitute for server checks
- Assuming group membership alone determines safe actions
