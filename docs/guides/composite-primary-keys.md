---
title: Work with Composite Primary Keys
type: how-to
audience: implementor
status: draft
---

# Work with Composite Primary Keys

This guide covers using Django's composite primary key feature in VUEDA. A composite primary key identifies each row using the combined values of two or more fields instead of a single generated `id`. VUEDA adds support for composite primary keys in serializers, viewsets, and filtersets so they work within the standard model-info contract.

For how Django defines composite primary key models, see the [Django documentation](https://docs.djangoproject.com/en/dev/topics/composite-primary-key/). This guide assumes familiarity with VUEDA's standard serializer, viewset, and filterset patterns. If you have not set up a basic CRUDL surface yet, read [Create a CRUDL Surface for a New Model](./create-crudl-surface) first.

## Goal and Preconditions

The objective is a working CRUDL surface for a model that uses a composite primary key, including correct URL routing, serialization, and filtering.

Before you begin:

Django requires the composite primary key field on the model to be named `pk`. Any other name is not valid.

The model must be registered with both a serializer and a viewset.

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

Because `OrderLine` has no `id` field, `formatted_name` must either use a lookup expression pointing to another field or implement `get_formatted_name()`. Setting `formatted_name = None` without providing one of these alternatives will cause choice endpoints to fail.

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

When targeting a specific `OrderLine`, the composite key values appear in the URL as a json string. Either of these two work:

```
GET /api/orderlines/["1","42"]/
```

```
GET /api/orderlines/[1,42]/
```

`VuedaViewSet` detects the composite primary key on the model and converts the json `pk` URL segment into a list, before passing the result to the ORM. No extra viewset configuration is needed.

## Using `reverse()` with Composite PKs

Django's `reverse()` function cannot take a composite primary key's `pk` directly, because it is a list. Passing it directly to `reverse()` will raise an error.

Convert `.pk` to a comma-separated string before passing it to `reverse()`:

```python
from django.urls import reverse

order_line = OrderLine.objects.get(pk=[1, 42])
url = reverse("orderline-detail", args=[json.dumps(order_line.pk)])
```

## Defining the FilterSet

`VuedaFilterSet` adds a default `id` filter. Because composite primary key models have no `id` field, using `VuedaFilterSet` as the base will cause errors. Use `VuedaCompositePrimaryKeyFilterSet` instead:

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

You can declare a filter for each field that makes up the composite key, and for any other model fields that need filtering. `VuedaCompositePrimaryKeyFilterSet` provides no default filters, so every filter you need must be declared explicitly.

## Relevant Implementation Surface

- Python:
    - {@api py:class:vueda.core.serializers.VuedaSerializer}
    - {@api py:class:vueda.core.serializers.fields.CompositePrimaryKeyField}
    - {@api py:class:vueda.core.viewsets.VuedaViewSet}
    - {@api py:function:vueda.core.viewsets.VuedaViewSet.get_object}
    - {@api py:class:vueda.core.filters.VuedaCompositePrimaryKeyFilterSet}
