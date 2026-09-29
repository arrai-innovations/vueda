---
title: Set Up CRUD for a Composite Primary Key Model
type: how-to
audience: integrator
status: draft
---

# Set Up CRUD for a Composite Primary Key Model

This guide sets up the model, serializer, filterset, viewset, and routes for a model whose rows are identified by a {@term Composite Primary Key}. It also shows how that key appears in API responses and detail URLs.

It assumes you have built a CRUD surface for an ordinary model. [Create a CRUD Surface for a New Model](./create-crud-surface) covers the parts that do not change here. For how Django defines these models, see [Django: `CompositePrimaryKey`]{@api ext:django:django.db.models.CompositePrimaryKey}.

## Define the Model

Declare the key on a field named `pk`, which Django requires. Pass the names of the columns that together identify a row. Turn history off: VUEDA records history for each {@term VUEDA Model} by default, and pghistory cannot track a composite key.

```python
from django.db import models
from vueda.core.models import VuedaModel


class Order(VuedaModel):
    name = models.CharField(max_length=50)
    order_date = models.DateTimeField(auto_now_add=True)


class Product(VuedaModel):
    name = models.CharField(max_length=255)


class OrderLine(VuedaModel):
    pk = models.CompositePrimaryKey("order_id", "product_id")
    order = models.ForeignKey(Order, on_delete=models.PROTECT)
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.IntegerField(default=0)

    formatted_name = None
    formatted_name_lookup_expression = "product__formatted_name"

    class Vueda:
        class History:
            enabled = False
            reason = "pghistory cannot track a composite primary key."

    class Meta(VuedaModel.Meta):
        default_related_name = "order_lines"
```

A composite-key model that leaves history on fails the `vueda_core.E013` system check at startup. The [`History` section]{@api py:property:vueda.history.apps.HISTORY_SECTION} lists the history options.

`OrderLine` has no `name` field, so the default {@term Formatted Name} has no column to copy. The example sets `formatted_name = None` and points [`formatted_name_lookup_expression`]{@api py:property:vueda.core.models.FormattedNameBaseModel.formatted_name_lookup_expression} at the product's name. [Create a CRUD Surface](./create-crud-surface#the-formatted-name-contract) describes the other ways to supply a formatted name.

## Define the Serializer

List `pk` in the serializer's `Meta.fields`:

```python
from vueda.core.serializers import VuedaSerializer
from .models import OrderLine


class OrderLineSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = OrderLine
        fields = [
            "pk",
            "order",
            "product",
            "quantity",
        ] + VuedaSerializer.Meta.fields
```

{@api py:class:vueda.core.serializers.VuedaSerializer} maps the key to {@api py:class:vueda.core.serializers.fields.CompositePrimaryKeyField}. The field sends the key as a JSON list string that holds each column's value as a string, for example `"[\"1\", \"42\"]"`.

## Define the FilterSet

Build the filterset on {@api py:class:vueda.core.filters.VuedaCompositePrimaryKeyFilterSet}. It has no `id` filter, because the model has no `id` field. Declare a filter for each key column that you want clients to filter by:

```python
from django_filters import rest_framework
from vueda.core.filters import VuedaCompositePrimaryKeyFilterSet
from .models import OrderLine


class OrderLineFilterSet(VuedaCompositePrimaryKeyFilterSet):
    order = rest_framework.NumberFilter(field_name="order_id", lookup_expr="exact")
    product = rest_framework.NumberFilter(field_name="product_id", lookup_expr="exact")

    class Meta:
        model = OrderLine
        fields = ["quantity"]
```

On a {@term Workflow-Enabled Model}, the base filterset still adds the `workflow_state` filter.

## Define the ViewSet, Routes, and Registration

The viewset, router, and registration are the same as for any model:

```python
from vueda.core.viewsets import VuedaViewSet
from .filtersets import OrderLineFilterSet
from .models import OrderLine
from .serializers import OrderLineSerializer


class OrderLineViewSet(VuedaViewSet):
    queryset = OrderLine.objects.all()
    serializer_class = OrderLineSerializer
    filterset_class = OrderLineFilterSet
    ordering_fields = ["order", "product", "quantity"]
```

```python
from vueda.core.routers import VuedaRouter
from .viewsets import OrderLineViewSet

router = VuedaRouter()
router.register("orderline", OrderLineViewSet)

urlpatterns = router.urls
```

```python
from django.apps import AppConfig
from vueda.info import register


class MyAppConfig(AppConfig):
    name = "myapp"

    def ready(self):
        from .serializers import OrderLineSerializer
        from .viewsets import OrderLineViewSet

        register(OrderLineSerializer, OrderLineViewSet)
```

[Create a CRUD Surface](./create-crud-surface#router-and-url-wiring) shows where to mount the URL module. {@api py:class:vueda.core.routers.VuedaRouter} and {@api py:function:vueda.info.register} need no composite-key options.

Ordering metadata reports the key's fields, `order` and `product`, in place of the `pk` alias. [Filtering and Ordering Semantics](../core-concepts/filtering-and-ordering-semantics#ordering-metadata) describes that rule.

## Request a Row by Its Key

Put the key in the detail URL's pk segment as a JSON list, percent-encoded. Each value may be a string or an integer. For `OrderLine` in app `myapp`, the key `[1, 42]` gives this URL:

```text
GET /routes/myapp/orderline/%5B1,%2042%5D/
```

{@api py:function:vueda.core.viewsets.VuedaViewSet.get_object} converts the segment to the key's column values before it looks up the row. A segment that is not a JSON list, or has the wrong number of values, answers `404`. A key with no matching row answers `404` too. A string value that contains `.` or `/` does not match the default detail route.

To build the URL in Python, pass the key's JSON string to [Django: `reverse`]{@api ext:django:django.urls.reverse}. The key itself is a tuple, which `reverse` writes as `(1,%2042)`, and that URL answers `404`. The route name is the model's app label and model name, followed by `-detail`:

```python
import json
from django.urls import reverse

order_line = OrderLine.objects.get(pk=(1, 42))
url = reverse("myapp.orderline-detail", args=[json.dumps(order_line.pk)])
```

## Known Limit: List Selection Actions

When you select rows in a list and run an action on them, the client puts the selected keys in the route's `pk` query parameter, joined with `,`. The view splits that parameter on `,`. Every composite key contains a comma, so the view receives fragments of the keys. [Primary Key and Identifier Discipline](../core-concepts/pk-and-identifier-discipline) describes how identifiers travel between views. Issue [#397](https://github.com/arrai-innovations/vueda/issues/397) tracks keeping these keys intact.
