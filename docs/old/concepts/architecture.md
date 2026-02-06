---
title: Architecture
type: explanation
audience: implementor
status: draft
---

# Architecture

VUEDA is a server-side & client-side framework for building custom, Django-admin-like interfaces.

## Components

- **VUEDA Server**: Django + Django REST Framework APIs, authentication/permissions, and domain logic.
- **VUEDA Client**: Vue 3 component library that consumes the VUEDA Server contract.

## High-Level Data Flow

```mermaid
flowchart LR
    Client[VUEDA Client / Vue 3 Component Library]

    subgraph DjangoApp[Shared Django Application]
        Domain[Models & Business Logic]
    end

    Web[DRF / Django Web Process]
    Worker[Celery Worker Process]
    
    DB[(PostgreSQL)]
    Cache[(Redis)]
    Broker[(Celery)]
    
    Client -->|REST API| Web
    
    Web --> Domain
    Worker --> Domain
    
    Web --> DB
    Worker --> DB
    
    Web --> Cache
    Worker --> Cache
    
    Web -->|Enqueue tasks| Broker
    Broker --> Worker
```

## Next

- [Design Principles](design-principles.md)
- [Server-Client Contract](server-client-contract.md)

