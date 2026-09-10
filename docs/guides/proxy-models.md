---
title: Expose a Proxy Model as a Separate CRUDL Surface
type: how-to
audience: integrator
status: draft
---

# Expose a Proxy Model as a Separate CRUDL Surface

This guide covers creating a Django proxy model on top of a `VuedaModel` and wiring it as a fully independent CRUDL surface with its own serializer, viewset, filterset, permissions, and model-info registration.

A proxy model shares the underlying database table with its concrete parent but has its own `ContentType`, its own permission codenames, and its own Python class. Use one when you need to expose the same data to different audiences under different access controls, or when you want a subset view of a model's rows with distinct API routing, without duplicating the database table.

This guide assumes you already have a concrete model using `VuedaModel`. If you have not set up the base model yet, see [Create a CRUDL Surface for a New Model](./create-crudl-surface).

## How History Tracking Works for Proxy Models

Django proxy models share the concrete parent's database table, so they share history too. VUEDA records history with pghistory triggers, and a trigger fires on the shared table. Saving through a proxy of `Distributor` writes the same `DistributorEvent` row that saving through `Distributor` writes. The `history-list` endpoint on a proxy returns the events recorded against the concrete model's row.

A proxy gets no event model of its own. Django sends `class_prepared` for a proxy, but VUEDA's feature-policy dispatcher returns before the contributors run. A second `pghistory.track` call against the same table would build a duplicate event table and a duplicate set of triggers.

::: warning
Declare the `History` section of `class Vueda` on the concrete model, not on the proxy. A proxy takes the concrete model's policy, so excluding a field or disabling history has to happen there.
:::

## Defining the Proxy Model

Subclass the concrete model with `proxy = True`. No additional field definitions are needed because a proxy adds no columns:

```python
from .models import Distributor


class DistributorProxy(Distributor):
    class Meta(Distributor.Meta):
        proxy = True
        verbose_name = "distributor proxy"
        verbose_name_plural = "distributor proxies"
```

Inherit `Meta` from the parent to carry over any ordering or constraints that should apply to both models.

## Migration

Generate and run the migration for the proxy model. Django creates a `CreateModel` migration with an empty `fields` list and `"proxy": True` in options:

```python
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("myapp", "0003_distributor"),
    ]

    operations = [
        migrations.CreateModel(
            name="DistributorProxy",
            fields=[],
            options={
                "verbose_name": "distributor proxy",
                "verbose_name_plural": "distributor proxies",
                "proxy": True,
                "indexes": [],
                "constraints": [],
            },
            bases=("myapp.distributor",),
        ),
    ]
```

Running this migration creates the `ContentType` record for the proxy model and registers the five default Django model permissions (`add_`, `change_`, `delete_`, `view_`, `list_`). VUEDA permission codenames (for example `read_distributorproxy`, `list_distributorproxy`) are created separately when a group migration runs.

## Defining the Serializer

Use `VuedaSerializer` and point `Meta.model` at the proxy class. The field list can be identical to the parent's serializer or a subset:

```python
from vueda.core.serializers import VuedaSerializer
from .models import DistributorProxy


class DistributorProxySerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = DistributorProxy
        fields = [
            "id",
            "name",
            "description",
        ] + VuedaSerializer.Meta.fields
```

`VuedaSerializer.Meta.fields` appends `formatted_name`, `available_actions`, and `object_revision`.

## Defining the FilterSet

Use `VuedaFilterSet` as the base. `VuedaFilterSet` automatically adds a hidden `id` filter. Declare any field-level filters explicitly:

```python
from django_filters import rest_framework
from vueda.core.filters import VuedaFilterSet
from .models import DistributorProxy


class DistributorProxyFilterSet(VuedaFilterSet):
    name = rest_framework.CharFilter(field_name="name", lookup_expr="exact")
    name_icontains = rest_framework.CharFilter(
        field_name="name", label="Name (contains)", lookup_expr="icontains"
    )

    class Meta:
        model = DistributorProxy
        fields = ["name"]
```

## Defining the ViewSet

Point the viewset at the proxy model and proxy serializer. Override `get_allowed_extra_actions` if the proxy needs different action visibility than the parent:

```python
from vueda.core.viewsets import VuedaViewSet
from .filtersets import DistributorProxyFilterSet
from .models import DistributorProxy
from .serializers import DistributorProxySerializer


class DistributorProxyViewSet(VuedaViewSet):
    queryset = DistributorProxy.objects.all()
    serializer_class = DistributorProxySerializer
    filterset_class = DistributorProxyFilterSet
    ordering_fields = ["name"]
    ordering = ["name"]
```

## Routing

Register the viewset with `VuedaRouter`. The basename is derived from `queryset.model._meta.label_lower`, which for a proxy named `DistributorProxy` in the `myapp` app is `myapp.distributorproxy`. URL names follow the same pattern: `myapp.distributorproxy-list` and `myapp.distributorproxy-detail`.

```python
from vueda.core.routers import VuedaRouter
from .viewsets import DistributorProxyViewSet

router = VuedaRouter()
router.register("distributor_proxies", DistributorProxyViewSet)
```

## Registration

Register the proxy separately from the concrete parent. Both registrations coexist — the proxy gets its own model-info entry, its own action metadata, and its own filter and ordering metadata:

```python
from vueda.info.registration import register
from .serializers import DistributorProxySerializer
from .viewsets import DistributorProxyViewSet


class MyAppConfig(AppConfig):
    def ready(self):
        register(DistributorProxySerializer, DistributorProxyViewSet)
```

Registering the proxy does not affect the parent model's registration. Each registration is independent.

## Permissions

Proxy model permissions use the proxy model's own `ContentType`. The permission codenames are derived from the proxy's class name (for example `read_distributorproxy`, not `read_distributor`). Assign permissions to groups using the proxy's `ContentType`:

```python
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth.models import Permission, Group

content_type = ContentType.objects.get(app_label="myapp", model="distributorproxy")
read_perm = Permission.objects.get(content_type=content_type, codename="read_distributorproxy")
```

::: info
Events do not have their own `ContentType`. The `history-list` endpoint on a proxy reads the concrete model's event table, and each event's `model` names the concrete model (for example `myapp.Distributor`), not the proxy.
:::

## Relevant Implementation Surface

- Python:
    - {@api py:class:vueda.core.models.VuedaModel}
    - {@api py:function:vueda.history.apps.track_model}
    - {@api py:class:vueda.core.filters.VuedaFilterSet}
    - {@api py:class:vueda.core.serializers.VuedaSerializer}
    - {@api py:class:vueda.core.viewsets.VuedaViewSet}
    - {@api py:function:vueda.info.registration.register}
