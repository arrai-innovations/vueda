---
title: Server-Client Contract
type: explanation
audience: implementor
status: draft
---

# Server-Client Contract

VUEDA establishes a clear contract between the server and client through RESTful APIs and shared conventions.

## Primary Key (PK) Discipline

- **Client-side**: PKs are treated as strings (JS object keys + Vue reactivity ergonomics).
- **Server-side**: PKs remain integers (Django conventions).
- **Contract goal**: standardize API responses to always return PKs as strings, while accepting string or integer input.

## What This Page Should Eventually Define

- Response “envelope” conventions (metadata alongside data).
- Error shapes (validation payloads, non-field errors).
- Permissions / action availability signals.
- Backward-compat expectations and versioning.

