---
title: Contract-First Dynamic UI
type: explanation
audience: implementor
status: brainstorming
---

# Contract-First Dynamic UI

## One-Sentence Summary

VUEDA client behavior is generated from server metadata contracts first, then selectively overridden for product-specific UX.

## What This Concept Should Explain

- What the model-info contract contains and why
- How defaults are derived for fields, actions, filters, and ordering
- Where explicit client overrides are appropriate
## How It Connects to Implementation

- Model info store and model config store interaction
- View routing and renderer resolution based on action metadata
- Form generation and field/widget mapping from metadata
## Common Pitfalls (Brainstorm)

- Hardcoding UI assumptions that diverge from server contract
- Overriding too early instead of using defaults first
- Ignoring contract changes when backend evolves
