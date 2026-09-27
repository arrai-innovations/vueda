---
title: Expose a Proxy Model as a Separate CRUD Surface
type: how-to
audience: integrator
status: draft
---

# Expose a Proxy Model as a Separate CRUD Surface

A Django [proxy model]{@api ext:django:django.db.models.Options.proxy} reads and writes its concrete model's database table. It has its own {@term Content Type} and permission codenames. You can give the same rows a second API surface with its own serializer, viewset, permissions, and {@term Model Info}.

This guide adds a proxy on top of an existing {@term VUEDA Model}. If you have not set up the concrete model yet, start with [Create a CRUD Surface for a New Model](./create-crud-surface).

## Defining the Proxy Model

Subclass the concrete model and set `proxy = True`. A proxy adds no columns, so it declares no fields:

```python
from .models import Distributor


class DistributorProxy(Distributor):
    class Meta(Distributor.Meta):
        proxy = True
        verbose_name = "distributor proxy"
        verbose_name_plural = "distributor proxies"
```

Inheriting the concrete model's `Meta` carries over its options, such as `ordering` and VUEDA's `default_permissions`.

Do not declare `class Vueda` on the proxy. A proxy takes the {@term Feature Policy} of its concrete model, and a declaration on the proxy fails the `vueda_core.E014` system check.

## Generating the Migration

Run `makemigrations`. Django writes a `CreateModel` operation with an empty `fields` list and `"proxy": True`:

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
                "abstract": False,
                "proxy": True,
                "default_permissions": ("create", "read", "update", "delete", "list"),
                "indexes": [],
                "constraints": [],
            },
            bases=("myapp.distributor",),
        ),
    ]
```

Run `migrate`. After the migrations apply, Django creates the proxy's content type and its five permissions: `create_`, `read_`, `update_`, `delete_`, and `list_distributorproxy`. The names come from `default_permissions` through the {@term Permission Mapping}.

## Defining the Serializer

Subclass [`VuedaSerializer`]{@api py:class:vueda.core.serializers.VuedaSerializer} and set `Meta.model` to the proxy. The field list can match the concrete model's serializer or be a subset:

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

[`VuedaSerializer.Meta.fields`]{@api py:class:vueda.core.serializers.VuedaSerializer.Meta} adds `formatted_name`, `available_actions`, and `object_revision`.

## Defining the FilterSet

Subclass [`VuedaFilterSet`]{@api py:class:vueda.core.filters.VuedaFilterSet}, which adds a hidden `id` filter. Declare the field filters the proxy needs:

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

Subclass [`VuedaViewSet`]{@api py:class:vueda.core.viewsets.VuedaViewSet} and point it at the proxy, its serializer, and its filterset:

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

    def get_allowed_extra_actions(self, request, *, instance=None):
        if request is not None and request.user.groups.filter(name="Customer").exists():
            return frozenset()
        return super().get_allowed_extra_actions(request, instance=instance)
```

`DistributorProxy.objects.all()` returns every row of the shared table. To expose a subset of rows, filter `queryset`, for example `DistributorProxy.objects.filter(name__startswith="North")`, or override [`get_queryset()`]{@api py:function:vueda.core.viewsets.VuedaViewSet.get_queryset} and call `super()`.

The [`get_allowed_extra_actions()`]{@api py:function:vueda.core.viewsets.VuedaViewSet.get_allowed_extra_actions} override is optional. It gives the proxy different extra actions from the concrete model's viewset. Here, members of the `Customer` group get none. VUEDA also calls it with `request=None` when it builds metadata without a request, so check for `None` before you read `request.user`.

## Routing

Register the viewset with [`VuedaRouter`]{@api py:class:vueda.core.routers.VuedaRouter}:

```python
from vueda.core.routers import VuedaRouter

from .viewsets import DistributorProxyViewSet

router = VuedaRouter()
router.register("distributor_proxies", DistributorProxyViewSet)
```

The router takes the basename from the queryset model's `label_lower`, here `myapp.distributorproxy`. The route names are `myapp.distributorproxy-list` and `myapp.distributorproxy-detail`.

## Registration

Call [`register()`]{@api py:function:vueda.info.registration.register} for the proxy in your app's {@api ext:django:django.apps.AppConfig.ready}:

```python
from django.apps import AppConfig


class MyAppConfig(AppConfig):
    name = "myapp"

    def ready(self):
        from vueda.info.registration import register

        from .serializers import DistributorProxySerializer
        from .viewsets import DistributorProxyViewSet

        register(DistributorProxySerializer, DistributorProxyViewSet)
```

The registry keys each registration by `app_label.model_name`, so the proxy and the concrete model register independently. The proxy gets its own model info, including its actions, filters, and ordering.

## Permissions

Permission checks on the proxy's viewset use the proxy's codenames, such as `myapp.read_distributorproxy`. A grant on the concrete model, such as `myapp.read_distributor`, does not reach the proxy. Look up the permission through the proxy's content type and add it to a group:

```python
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType

content_type = ContentType.objects.get(app_label="myapp", model="distributorproxy")
read_perm = Permission.objects.get(content_type=content_type, codename="read_distributorproxy")
Group.objects.get(name="Staff").permissions.add(read_perm)
```

To carry group grants to other environments, record them as a {@term Group Permission Migration}.

## How History Tracking Works for Proxy Models

A proxy shares its concrete model's {@term Model History}. Saving through `DistributorProxy` writes the same `DistributorEvent` rows as saving through `Distributor`. The proxy's [`history-list`]{@api py:function:vueda.core.viewsets.VuedaViewSet.history_list} endpoint returns those events, and each event's `model` names the concrete model, for example `myapp.Distributor`.

::: warning
Declare the `History` section of `class Vueda` on the concrete model. To exclude a field from history or turn history off, change the concrete model's policy, and the proxy follows it.
:::

Workflow also resolves a proxy to its concrete model, so a proxy of a {@term Workflow-Enabled Model} shares each row's {@term Object State}. [Model Feature Policy](../core-concepts/model-feature-policy.md#proxy-models) describes the rules for proxies.
