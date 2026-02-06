---
title: Canonical Registration and Model Discovery
type: explanation
audience: implementor
status: brainstorming
---

# Canonical Registration and Model Discovery

## One-Sentence Summary

Canonical registration is the mechanism that tells VUEDA which serializer/viewset pair defines each model's public contract.

## What This Concept Should Explain

- How registration keys are built from app label and model
- Why registration should happen in app startup rather than import side effects
- What metadata becomes unavailable when no canonical viewset exists
## How It Connects to Implementation

- vueda.info.registration register/register_serializer APIs
- Model-info viewset lookup flow and registered content type filtering
- Client dependencies on discovered actions, fields, filtering, and expands
## Common Pitfalls (Brainstorm)

- Registering duplicate or conflicting canonical entries
- Assuming unregistered models will still appear in model-info
- Mutating registry data instead of treating it as read-only contract
