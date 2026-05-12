---
title: Set Up CRUDL for a Composite Primary Key Model
type: how-to
audience: implementor
status: draft
---

# Set Up CRUDL for a Composite Primary Key Model

This guide covers using Django's composite primary key feature in VUEDA. A composite primary key identifies each row using the combined values of two or more fields instead of a single generated `id`. VUEDA adds support for composite primary keys in serializers, viewsets, and filtersets, so they work within the standard model-info contract.

For how Django defines composite primary key models, see the [Django documentation](https://docs.djangoproject.com/en/dev/topics/composite-primary-key/). This guide assumes familiarity with VUEDA's standard serializer, viewset, and filterset patterns. If you have not set up a basic CRUDL surface yet, read [Create a CRUDL Surface for a New Model](./create-crudl-surface) first.

## Goal and Preconditions

The objective is a working CRUDL surface for a model that uses a composite primary key, including correct URL routing, serialization, and filtering.

Before you begin:

Django requires the composite primary key field on the model to be named `pk`. Any other name is not valid.

## Defining the Model

Use `models.CompositePrimaryKey` on a field named `pk`, and pass the column names of the fields that together identify each row:

```python
from django.db import models
from vueda.core.models import VuedaModel


class Order(VuedaModel):
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

    class Meta(VuedaModel.Meta):
        default_related_name = "order_lines"
```

Because `OrderLine` has no `id` field, `formatted_name` must either use a lookup expression pointing to another field or implement `get_formatted_name()`. Setting `formatted_name = None` without providing one of these alternatives will cause list and retrieve endpoints to return `null` for `formatted_name`, and will cause choice endpoints to fail with a 500 error.

When `formatted_name_lookup_expression` is set, `VuedaViewSet` annotates the queryset with the expression in `get_queryset` for direct requests. When the model appears as an expanded field in another serializer, `VuedaListSerializer` applies the same annotation to the related queryset. Together, `formatted_name` returns the resolved value across all regular API responses — direct list, retrieve, and expand responses — not just from choice endpoints.

## Defining the Serializer

Use `pk` as the primary key field in the serializer's `Meta.fields`:

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

The `pk` field is sent to and received from the client as a JSON string, for example `'["1", "42"]'`. The server converts this to a list, for example `[1, 42]`, automatically.

## URL Format for Composite PKs

To request a specific OrderLine, encode the composite key as a JSON string in the pk URL segment. Individual pks can be strings or integers:

```text
GET /api/orderlines/[1,"42"]/
```

PKs and a product type:

```text
GET /api/orderlines/["1",42,"digital"]/
```

`VuedaViewSet` detects the composite primary key on the model and converts the JSON `pk` URL segment into a list, before passing the result to the ORM. No extra viewset configuration is needed.

## Using `reverse()` with Composite PKs

Serialize `.pk` to its JSON string form before passing it to `reverse()`. Passing it directly as a list will raise an error.

```python
import json
from django.urls import reverse

order_line = OrderLine.objects.get(pk=[1, 42])
url = reverse("orderline-detail", args=[json.dumps(order_line.pk)])
```

## Defining the FilterSet

Use VuedaCompositePrimaryKeyFilterSet as the base, because it declares no default filters. Every filter you need (including ones for the fields that make up the composite key) must be declared explicitly. See [Composite Primary Key Filtering](../core-concepts/filtering-and-ordering-semantics#composite-primary-key-filtering) for the underlying constraint.

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

## Relevant Implementation Surface

- Python:
    - {@api py:class:vueda.core.serializers.VuedaSerializer}
    - {@api py:class:vueda.core.serializers.VuedaListSerializer}
    - {@api py:class:vueda.core.serializers.fields.CompositePrimaryKeyField}
    - {@api py:class:vueda.core.viewsets.VuedaViewSet}
    - {@api py:function:vueda.core.viewsets.VuedaViewSet.get_object}
    - {@api py:class:vueda.core.filters.VuedaCompositePrimaryKeyFilterSet}
