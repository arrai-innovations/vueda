---
title: Expose a Proxy Model as a Separate CRUDL Surface
type: how-to
audience: implementor
status: draft
---

# Expose a Proxy Model as a Separate CRUDL Surface

This guide covers creating a Django proxy model on top of a `VuedaHistoryModel` and wiring it as a fully independent CRUDL surface with its own serializer, viewset, filterset, permissions, and model-info registration.

A proxy model shares the underlying database table with its concrete parent but has its own `ContentType`, its own permission codenames, and its own Python class. Use one when you need to expose the same data to different audiences under different access controls, or when you want a subset view of a model's rows with distinct API routing, without duplicating the database table.

This guide assumes you already have a concrete model using `VuedaHistoryModel`. If you have not set up the base model yet, see [Create a CRUDL Surface for a New Model](./create-crudl-surface).

## How History Tracking Works for Proxy Models

Django proxy models share the concrete parent's database table, so they share history records too. When you save a proxy instance, the save is recorded in the parent's historical table (for example, a proxy of `Distributor` writes to `HistoricalDistributor`). The `history`, `first_history_entry`, and `last_history_entry` expands all resolve to the parent's historical model.

This sharing is possible because VUEDA uses `ProxyAwareHistoricalRecords` in `VuedaHistoryModel` instead of vanilla `HistoricalRecords`. With the default `inherit=True` option, django-simple-history would create a separate `HistoricalXxxProxy` model for each proxy class and try to add a `history_records` reverse accessor to the proxy. Because the proxy inherits that accessor from the concrete parent, Django raises a reverse accessor clash at startup. `ProxyAwareHistoricalRecords` intercepts proxy models in `finalize()`, skips creating the duplicate historical model, and instead does three things:

1. **Connects save and delete signals** so that saves and deletions on proxy instances are recorded in the parent's existing historical table.
2. **Sets `proxy_class.history` to the parent's history descriptor** using `setattr`. Without this, calling `proxy_instance.history.all()` or `proxy_instance.history.values()` returns no results because the inherited descriptor has no association with the proxy model.
3. **Sets `proxy_class._meta.simple_history_manager_attribute`** so that django-simple-history's pre-delete field reloading and utility functions can locate the history manager by name on the proxy.

::: warning
Do not assign `history = HistoricalRecords(...)` or `history = None` directly on a proxy model class. Assigning `None` or any non-descriptor value has no effect (the parent's history descriptor is inherited via the MRO). Assigning a new `HistoricalRecords` instance will conflict with the parent's inherited registration and raise `MultipleRegistrationsError` at startup.
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

Use `VuedaHistorySerializer` and point `Meta.model` at the proxy class. The field list can be identical to the parent's serializer or a subset:

```python
from vueda.history.serializers import VuedaHistorySerializer
from .models import DistributorProxy


class DistributorProxySerializer(VuedaHistorySerializer):
    class Meta(VuedaHistorySerializer.Meta):
        model = DistributorProxy
        fields = [
            "id",
            "name",
            "description",
        ] + VuedaHistorySerializer.Meta.fields
```

`VuedaHistorySerializer.Meta.fields` appends `formatted_name`, `available_actions`, `current_history_id`, and the history expandable fields.

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
from vueda.history.viewsets import VuedaHistoryViewSet
from .filtersets import DistributorProxyFilterSet
from .models import DistributorProxy
from .serializers import DistributorProxySerializer


class DistributorProxyViewSet(VuedaHistoryViewSet):
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
History records do not have their own `ContentType`. The history expand (`first_history_entry`, `history`, `last_history_entry`) returns records from the parent's historical model. The `app_label` and `model` values in the expand metadata will reflect the parent's historical model name (for example `historicaldistributor`), not the proxy.
:::

## Relevant Implementation Surface

- Python:
    - {@api py:class:vueda.history.models.ProxyAwareHistoricalRecords}
    - {@api py:class:vueda.history.models.VuedaHistoryModel}
    - {@api py:class:vueda.core.filters.VuedaFilterSet}
    - {@api py:class:vueda.core.serializers.VuedaHistorySerializer}
    - {@api py:class:vueda.core.viewsets.VuedaHistoryViewSet}
    - {@api py:function:vueda.info.registration.register}
