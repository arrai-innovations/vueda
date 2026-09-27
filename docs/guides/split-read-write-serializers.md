---
title: Split Read/Write Serializers Safely
type: how-to
audience: integrator
status: draft
---

# Split Read/Write Serializers Safely

This guide sets up one viewset that serializes `list` and `retrieve` with a read serializer, and `create`, `update`, and `partial_update` with a write serializer. Use the split when reads need computed or nested data that writes do not accept, or when write validation needs other fields. The steps keep the default views working, including the redirect after a save.

## Before You Start

The model needs a {@term Canonical Registration} with a viewset. {@term Model Info} builds its field and expand sections from the {@term Canonical Serializer} only, as [Canonical Registration and Model Discovery](../core-concepts/canonical-registration-and-discovery.md#viewset-presence-and-metadata-completeness) describes. Per-action serializers do not change model info. So every view's default {@term View Field Lists} and default `expand` come from the serializer you register, whichever action serves the request.

That page also describes what a model registered with {@api py:function:vueda.info.registration.register_serializer} lacks. With no viewset, model info lists no actions, and the client blocks every route for the model.

## Register the Canonical Serializer

Register the serializer whose fields the forms should show. This is usually the write serializer, because the create and update forms submit the fields that model info lists. Pass the viewset to {@api py:function:vueda.info.registration.register}:

```python
from django.apps import AppConfig


class MyAppConfig(AppConfig):
    name = "myapp"

    def ready(self):
        from vueda.info.registration import register

        from .serializers import MyWriteSerializer
        from .viewsets import MyViewSet

        register(MyWriteSerializer, MyViewSet)
```

## Map Actions to Serializers

Add {@api py:class:vueda.core.viewsets.PerActionSerializerMixin} to the viewset. Set an `<action>_serializer_class` attribute for each action:

```python
from vueda.core.viewsets import PerActionSerializerMixin
from vueda.core.viewsets import VuedaViewSet


class MyViewSet(PerActionSerializerMixin, VuedaViewSet):
    serializer_class = MyWriteSerializer
    list_serializer_class = MyReadSerializer
    retrieve_serializer_class = MyReadSerializer
    create_serializer_class = MyWriteSerializer
    update_serializer_class = MyWriteSerializer
    partial_update_serializer_class = MyWriteSerializer
```

The mixin returns the class that the current action's attribute names. An action with no attribute uses [`serializer_class`]{@api ext:drf:rest_framework.generics.GenericAPIView.serializer_class}.

- {@api py:class:vueda.core.viewsets.VuedaViewSet} does not include the mixin, so add it yourself.
- List the mixin before `VuedaViewSet`. After it, DRF's [`get_serializer_class`]{@api ext:drf:rest_framework.generics.GenericAPIView.get_serializer_class} answers first, and the mixin never runs.
- Set `partial_update_serializer_class` as well as `update_serializer_class`. A PATCH request runs the `partial_update` action. Without its own attribute, that action uses `serializer_class`.

## Match the Fields Each View Requests

The default views send canonical field names in the `f` query parameter and canonical expand names in `e`. Each action's serializer must answer those names. [Field and Expand Semantics](../core-concepts/field-and-expand-semantics.md) describes how `f`, `e`, and `om` behave on reads and writes.

**Reads.** `list` and `retrieve` check `f` and `e` against the read serializer. A canonical field or expand that the read serializer lacks fails the request with `400`. {@api vue:component:ViewUpdate} loads its object with `retrieve`, so the update view fails the same way. Declare every canonical field and expand on the read serializer.

A `list` request accepts no expand until the viewset sets `permit_list_expands`. [Use Expand and Sparse Field Controls](./expand-and-fields-controls.md) gives the steps.

**Writes.** A create or update save sends the view's `fetchFields` and the pk in `f`. Writes do not check `f`. A field the write serializer lacks is missing from the save response, and no error reports it ([#395](https://github.com/arrai-innovations/vueda/issues/395)). Declare every fetched field on the write serializer, or narrow the view's `fetchFields`.

A save also sends in `e` each configured expand whose form value is set. The write serializer rejects an expand it does not declare with `400`, once the body passes field validation.

**The pk.** {@api vue:component:ViewCreate} redirects to the update view by default. That redirect, and a redirect to the read view, take the pk from the save response. Include the pk in the write serializer's `Meta.fields`.

To narrow what one view requests, set its `fetchFields` prop, such as [`fetchFields`]{@api vue:component:ViewUpdate:prop:fetchFields} on `ViewUpdate`. A per-view config set with {@api js:method:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig.setConfig} works too. The update view uses one `fetchFields` list for its retrieve and its save, so both serializers must declare those fields.

## Check the Split

1. Request the model's model info, and confirm its fields and expands match the canonical serializer.
2. Open the list, read, and update views. Each loads with no `400`.
3. Create an object. The save redirects to the update view.
4. In the browser's network panel, check that each save response holds every field named in its `f` parameter.
5. Send a PUT and a PATCH for one object. Both run the write serializer's validation.
