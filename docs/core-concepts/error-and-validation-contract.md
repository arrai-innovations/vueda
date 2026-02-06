---
title: Error and Validation Contract
type: explanation
audience: implementor
status: brainstorming
---

# Error and Validation Contract

## One-Sentence Summary

The error contract standardizes how validation and request errors are returned so client forms can map issues predictably.

## What This Concept Should Explain

- Field errors versus non-field errors
- How nested validation paths should be represented
- When to return validation errors versus permission or not-found responses
## How It Connects to Implementation

- Serializer validation and VuedaValidationError behavior
- Client form context mapping for server errors
- Action and object CRUD error handling paths
## Common Pitfalls (Brainstorm)

- Returning ad-hoc error formats that client cannot parse
- Collapsing all failures into generic detail messages
- Losing nested field context in error payloads
