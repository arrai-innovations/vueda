---
title: Canonical Registration and Model Discovery
type: explanation
audience: implementor
status: draft
---

# Canonical Registration and Model Discovery

Registration is the boundary for discoverability in VUEDA. If a model is not registered, it does not exist to the metadata API or the client. There is no automatic discovery from installed apps, no ORM introspection, no implicit scanning of serializer definitions. Registration is the single, explicit act that makes a model visible to the framework.

Everything downstream depends on this boundary. Client routes, form generation, permission gating, and action availability: all of it requires the model to be present in the registry. This page explains what registration is as a state model, what each registration state controls, and where the boundary is enforced.

## Registration Is the Discoverability Gate

Registration is the only mechanism by which a model becomes visible to VUEDA's metadata API. A registered model appears in model-info responses. A model that is not registered does not, regardless of whether it has a serializer, a viewset, migrations, or data in the database. None of those things alone makes a model discoverable.

This is the system's architectural spine. The metadata universe is exactly the set of registered models. The client cannot discover models that the server has not registered, and the server will not advertise models that have not been explicitly enrolled. There is no configuration file that lists models, no decorator that auto-registers them, and no startup scan that finds them. Registration is a deliberate call made in the application code.

## Registration States and Transitions

A model exists in exactly one of three registration states:

**Unregistered**: the model is invisible to model-info and the client. It may have a Django model class, migrations, database tables, and even serializers or viewsets defined in code, but none of that matters until registration occurs.

**Serializer-only**: the model is visible in model-info with field schema and permission metadata, but without action, filter, or ordering metadata. This state exists to support metadata consumers that only need field shapes; for example, when the client needs to resolve field types for a related model referenced through an expand, but that related model does not need its own CRUD surface.

**Fully registered** (serializer + viewset): the model is visible with complete metadata, including fields, actions, filters, ordering, and permissions. This is the state required for the client to generate a functional UI surface for the model, with routes, forms, and views.

Only certain transitions between states are valid:

- Unregistered to serializer-only, via `register_serializer`.
- Unregistered to fully registered, via `register`.
- Serializer-only to fully registered, via `register` (upgrading the existing entry).
- Fully registered to anything else is **illegal**. Attempting to register a different canonical serializer for an already-registered model fails at startup.

The canonical serializer is unique per model. Two Django apps cannot register different serializers for the same model. The system enforces this as a startup constraint: the error surfaces immediately when the application boots, not at runtime when a request happens to hit the conflict.

## Viewset Presence and Metadata Completeness

The distinction between serializer-only and full registration is architecturally significant because it determines which sections of the metadata response exist.

Serializer-only registration produces a model-info entry containing field schema (types, constraints, read-only markers, choice indicators) and permission codenames. This is enough for metadata consumers that need to understand the shape of a model's data, like resolving field types for related-model choice lookups, but it is not enough to generate a CRUD surface. Without a viewset, there are no actions to advertise, no filter definitions to expose, and no ordering capabilities to declare.

Full registration produces the complete metadata surface. Actions (CRUD plus any extra actions defined on the viewset), filter definitions, and ordering capabilities are all derived from the viewset. The serializer alone cannot express these; they depend on viewset configuration, permission checks, and router integration that only exist when a viewset is present.

In practice, this means that if a model appears in model-info but the client cannot generate routes or forms for it, the first thing to check is whether the model was registered with a viewset or only with a serializer.

## Registration Timing

Registration must occur after Django's app registry is ready. The registration functions resolve content types internally, which requires the app registry, content type framework, and all dependent models to be fully initialized.

Performing registration at import time or module scope risks content-type resolution errors and ordering-dependent import failures. The established pattern is to register in `AppConfig.ready()`, which guarantees that all prerequisites are satisfied:

```python
class MyAppConfig(AppConfig):
    def ready(self):
        from vueda.info.registration import register
        from .models import MyModel
        from .serializers import MyModelSerializer
        from .viewsets import MyModelViewSet

        register(MyModel, MyModelSerializer, MyModelViewSet)
```

This pattern is consistent across VUEDA's own modules: `vueda.vdq`, `vueda.user`, and `vueda.release` all register their models in `ready()`.

## How Model-Info Uses the Registry

The model-info viewset does not perform ORM introspection or scan installed apps. Its list and `detail` endpoints are derived exclusively from the set of registered models. If the registry is empty, model-info returns an empty list. If a specific model is requested that is not in the registry, model-info returns a 404.

That 404 is indistinguishable from a request for a nonexistent URL. There is no special "unregistered" status code or error message. From the perspective of any API consumer, an unregistered model simply does not exist. The metadata response includes which sections are present and which fields and actions are advertised; this is determined entirely by the registration state described above.

## Client Discovery and the Trust Boundary

The client fully trusts the registration boundary. It does not probe for models beyond what model-info advertises, does not attempt to construct routes for models it has not seen in metadata, and does not retry failed lookups on its own.

When the client requests metadata for a model and receives a 404, it caches that failure. This prevents retry storms: if a model is not registered, repeated navigation attempts to that model do not result in additional server requests. However, it also means that if a model is registered on the server after the client has already cached a 404 for it, the client must be reloaded to discover the newly registered model.

The client does not distinguish between "unregistered" and "nonexistent." Both produce the same opaque failure: navigation to that model is blocked, and no forms or views are generated. From the client's perspective, a model either has metadata or it does not, and the reason for its absence is not surfaced.

The client also requires a detectable primary key field in the metadata for any registered model. If the canonical serializer does not include a field that the client can identify as the PK, client-side normalization fails regardless of the server-side registration state.

## Failure Modes

**Serializer-only registration without a viewset** leaves the model visible in model-info but without action, filter, or ordering metadata. The client can see the model's fields, but cannot generate CRUD routes or forms for it. This can produce confusing behaviour: the model appears to exist, but nothing functional can be done with it, and it is usually the result of an incomplete registration rather than intentional design.

**Registration at import time** can cause content-type resolution failures or ordering-dependent import errors. These surface as startup crashes that may be difficult to diagnose because the error messages reference content types or models that appear to be correctly defined. The fix is always to move registration into `AppConfig.ready()`.

**Duplicate canonical serializers** fail at startup. If two apps each attempt to register a different serializer as the canonical serializer for the same model, the second registration call raises an error. The canonical serializer must be unique across the entire project.

**Cached 404 errors on the client** block discovery of models that are registered after the client has loaded. There is no automatic cache invalidation for this case; a page reload is required.

**Registry accessor mutations** have no effect. The registry's accessor functions return defensive copies. Code that retrieves a registration entry and modifies it will not change the actual registry state. The registry is effectively immutable after startup.

## Relevant Implementation Surface

- Python:
  - `{@api py:module:vueda.info.registration}`
  - `{@api py:function:vueda.info.registration.register}`
  - `{@api py:function:vueda.info.registration.register_serializer}`
  - `{@api py:function:vueda.info.registration.get_registration}`
  - `{@api py:function:vueda.info.registration.get_all_registrations}`
  - `{@api py:function:vueda.info.registration.get_registered_content_types}`
  - `{@api py:class:vueda.info.viewsets.ModelInfoViewSet}`
- REST:
  - `{@api rest:endpoint:GET:/vueda.info/model_info/}`
  - `{@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}`
- JavaScript:
  - `{@api js:module:@arrai-innovations/vueda.stores/storeModelInfo}`
