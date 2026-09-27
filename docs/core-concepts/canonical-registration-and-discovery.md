---
title: Canonical Registration and Model Discovery
type: explanation
audience: integrator
status: draft
---

# Canonical Registration and Model Discovery

{@term Canonical Registration} decides which models VUEDA knows about. The server publishes {@term Model Info} only for registered models, and the client builds routes, forms, and views only from model info. A model with a serializer, a viewset, a router entry, and rows in the database stays invisible to the client until it is registered.

VUEDA does not scan installed apps or introspect the ORM to find models. Registration is an explicit call in your application code, usually in `AppConfig.ready()`.

This page describes the registration states, what each state puts in model info, when to register, and what fails when registration is missing or wrong.

## Registration States and Transitions

A model is in one of three states:

- **Unregistered.** The model has no model info and no choices endpoints. The client cannot build anything for it.
- **Serializer-only.** {@api py:function:vueda.info.registration.register_serializer} records the model's {@term Canonical Serializer} with no viewset. This is {@term Serializer-Only Registration}. The model gets field, expand, and permission metadata and working choices endpoints, and no actions.
- **Fully registered.** {@api py:function:vueda.info.registration.register} records the canonical serializer together with its {@term Canonical Viewset}. The model gets every model info section, and the client can build a full {@term CRUD} surface for it.

Registration reads only the serializer's `Meta.model`. The serializer does not need to inherit `VuedaSerializer`. A serializer with no `Meta.model` raises {@api ext:django:django.core.exceptions.ImproperlyConfigured}. [Customize Model Info Field and Expand Metadata](../guides/customize-model-info-metadata.md#serializers-that-do-not-inherit-vuedaserializer) describes what a serializer outside `VuedaSerializer` needs for its expand metadata.

Each model has one registration. A second `register` or `register_serializer` call for the same model raises {@api ext:python:ValueError} with the message `<app_label>.<model> is already registered.`, even when it passes the same serializer. Because registration runs in `ready()`, the error stops startup. The only transitions are from unregistered to serializer-only and from unregistered to fully registered. To move a model from serializer-only to fully registered, change the call.

Call `register` with both arguments. Called with only a serializer, `register` registers nothing and returns a class decorator for a viewset. Serializer-only registration is `register_serializer`. The `register` docstring describes the decorator form.

A Django [proxy model]{@api ext:django:django.db.models.Options.proxy} gives the same data a second surface, such as one with other permissions or actions. A proxy has its own {@term Content Type} and permission codenames, so it registers in its own right and gets its own model info and system checks. [Expose a Proxy Model as a Separate CRUD Surface](../guides/proxy-models.md) walks through it.

## Viewset Presence and Metadata Completeness

The viewset decides which model info sections have content. [Server-Client Metadata Contract](./server-client-metadata-contract.md#metadata-sections) describes each section.

| Section            | Serializer-only                                           | Fully registered                                                                       |
| ------------------ | --------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Fields and expands | From the serializer                                       | From the serializer                                                                    |
| Permissions        | The model's permission codenames                          | The model's permission codenames                                                       |
| Actions            | Empty                                                     | Built-in and extra actions the viewset offers the user                                 |
| Filtering          | Empty                                                     | From the viewset's `filterset_class`                                                   |
| Column totals      | Empty                                                     | From the viewset's `column_totals`                                                     |
| Ordering           | The model's `Meta.ordering` as the default, if it has one | The viewset's ordering fields; its `ordering`, or else `Meta.ordering`, as the default |

With no actions, the client's route guard blocks every route for a serializer-only model. [Server-Client Metadata Contract](./server-client-metadata-contract.md#failure-modes-and-recovery) describes the toast the user sees.

Serializer-only registration suits a child model that is edited inline with its parent and loaded through the parent's [expand]{@term Expand}. The inline form's field metadata comes from the parent's expand descriptor, built from the serializer in the parent's `Meta.expandable_fields`. The child's own registration provides the [choices endpoints](./server-client-metadata-contract.md#choices-endpoints) for its relation fields. Those endpoints return `404` for an unregistered model, so without the registration the inline relation fields load no options.

A model that needs its own routes, actions, filters, or column totals needs a viewset.

## Registration Timing

Register in [`AppConfig.ready()`]{@api ext:django:django.apps.AppConfig.ready}:

```python
from django.apps import AppConfig


class MyAppConfig(AppConfig):
    name = "myapp"

    def ready(self):
        from vueda.info.registration import register
        from vueda.info.registration import register_serializer

        from .serializers import InlineChildSerializer
        from .serializers import MyModelSerializer
        from .viewsets import MyModelViewSet

        register(MyModelSerializer, MyModelViewSet)
        register_serializer(InlineChildSerializer)
```

The imports go inside `ready()`. Serializer and viewset modules import your models, and importing models from an `apps` module at module scope raises {@api ext:django:django.core.exceptions.AppRegistryNotReady}.

A call at module scope in another module runs only if something imports that module, so the model may be missing from model info with no error. The system checks also read the registry when they run. A model registered later, such as during a request, is never checked.

VUEDA's own apps follow this pattern: `vueda.vdq`, `vueda.user`, and `vueda.release` register their models in `ready()`.

## How Model Info Uses the Registry

{@api py:class:vueda.info.viewsets.ModelInfoViewSet} lists only registered models. Its list endpoint ({@api rest:endpoint:GET:/vueda.info/model_info/}) returns one entry per registered model. Its detail endpoint ({@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}) raises {@api ext:django:django.http.Http404} for a model that is not registered, which DRF returns as a JSON `404`. The choices endpoints return the same `404`.

A URL that matches no route never reaches these views. Django answers it with its [`handler404`]{@api ext:django:django.conf.urls.handler404}, an HTML page by default. To get a JSON `404` there too, set `handler404 = "vueda.core.exceptions.page_not_found"` in your root URLconf ({@api py:function:vueda.core.exceptions.page_not_found}).

Registration also feeds VUEDA's system checks. The `vueda_info` checks validate each registration's serializer and viewset, and the serializer checks start from every registered serializer. One check applies only to serializer-only registration: {@api py:function:vueda.core.checks.check_exclude_fields_serializer_usage} reports `vueda_core.E009` when a serializer registered with `register_serializer` inherits `ExcludeFieldsSerializerMixin`. That mixin needs a view in the serializer context, which a serializer-only registration never has ([#162](https://github.com/arrai-innovations/vueda/issues/162)).

To read the registry from your own code, {@api py:function:vueda.info.registration.get_registration} and {@api py:function:vueda.info.registration.get_all_registrations} return deep copies, so changing the result does not change the registry. {@api py:function:vueda.info.registration.get_serializer_for_model} returns the registered serializer class itself. {@api py:function:vueda.info.registration.get_registered_content_types} returns the content type primary keys of all registered models.

## Client Discovery

The client learns about a model only by requesting its model info, which the route guard does for each route's model. It treats every model info failure the same way. An unregistered model, a nonexistent model, a server error, and a network failure all produce a "Model Not Found" toast and a redirect, as [Server-Client Metadata Contract](./server-client-metadata-contract.md#failure-modes-and-recovery) describes.

The client caches the failure per model and sends no further request for it. A model registered after the client cached its failure stays blocked until the cache clears. [Reactive Data Flow](./reactive-data-flow.md#when-caches-clear) describes when that happens.

## Failure Modes

**`register` called with only a serializer and not applied as a decorator.** The call registers nothing and raises no error. The model is missing from model info. Use `register_serializer` for a serializer-only model, or pass the viewset to `register`.

**Serializer-only registration where a CRUD surface is needed.** The model has model info but no actions, so the route guard blocks its routes. Register it with a viewset.

**Duplicate registration.** The second call raises `ValueError` during `ready()`, and the server does not start. Remove one of the calls. For a second surface over the same data, register a proxy model.

**Serializer or viewset imports at module scope in `apps.py`.** Startup fails with `AppRegistryNotReady`. Move the imports into `ready()`.

**Registration outside `ready()`.** The model can be missing from model info with no error, and the system checks do not see it. Move the call into `ready()`.

**Model registered after the client cached a failure.** The client keeps showing "Model Not Found" for that model until its caches clear.
