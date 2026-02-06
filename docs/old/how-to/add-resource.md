---
title: Add a Resource End-to-End
type: how-to
audience: implementor
status: stub
---

# Add a Resource End-to-End

## Goal

Take a new domain concept (a Django model) and expose it through the VUEDA server and client so it’s listable/editable in the UI.

## Outline (To Be Authored)

- Server:
- Model
- Serializer (and read/write split, if needed)
- ViewSet (row-level filtering, action serializers, bulk semantics)
- Routing
- Schema regeneration (drf-spectacular)
- Client:
- Model/resource registration
- List + form wiring (components/composables)
- Permissions-driven UI affordances (what is safe to assume)

## References

- REST schema: `/api/rest/`
- Python API: `/api/py/`
- Vue components: `/api/vue/`
- JS composables/utilities: `/api/js/`

