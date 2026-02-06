---
title: Field and Expand Semantics
type: explanation
audience: implementor
status: brainstorming
---

# Field and Expand Semantics

## One-Sentence Summary

Field and expand semantics specify what data is always present versus conditionally requested in API responses.

## What This Concept Should Explain

- Difference between serializer fields, expandable fields, and sparse field selection
- How read-only, required, many, and choice attributes influence UI
- How nested expands should be bounded for performance and clarity
## How It Connects to Implementation

- Serializer expandable_fields definitions and validation behavior
- Client fetchFields/expand config and fieldDetails consumption
- Error behavior for invalid expand and fields parameters
## Common Pitfalls (Brainstorm)

- Allowing unrestricted expands that expose heavy or sensitive data
- Assuming expanded data is always writable
- Combining fields and expands inconsistently across views
