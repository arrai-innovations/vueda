---
title: Declare List Ordering
type: how-to
audience: integrator
status: draft
---

# Declare List Ordering

This guide sets a `list` endpoint's default order so that {@term Model Info} reports it to clients. It also covers nulls placement for sorts a client requests, and ordering or filtering by a related model's `formatted_name`. [Filtering and Ordering Semantics](../core-concepts/filtering-and-ordering-semantics.md) describes the rules these steps rely on.

## Declare the Default Order

Set `ordering` on the viewset:

```python
class QueueItemViewSet(VuedaViewSet):
    queryset = QueueItem.objects.all()
    serializer_class = QueueItemSerializer
    ordering = ["-queued"]
```

A model's `Meta.ordering` also works, and applies to every queryset the model builds. Declare the order on the viewset when you want [`nulls_ordering`](#place-nulls-in-requested-sorts) to apply to the default.

Do not call `order_by()` on the `queryset` attribute or inside `get_queryset`. Model info reads the declarations, so an ordering applied in code sorts the rows without being reported. Keep `get_queryset` for filtering, `select_related`, and annotations.

Run the system checks:

```console
python manage.py check
```

`vueda_info.E010` reports an `order_by()` on the `queryset` attribute. Its message names one of three cases:

- **The model's `Meta.ordering` disagrees.** Declare the queryset's order as the viewset's `ordering`, or remove the `order_by()` and accept the model's order.
- **No default ordering is declared.** Declare the queryset's order as the viewset's `ordering`.
- **The viewset's `ordering` disagrees.** Remove the `order_by()`, or make the two agree. The viewset's `ordering` is the one applied.

`vueda_info.E006` reports a viewset `ordering` or `ordering_fields` entry that names no field. Point it at a model field, a path through relations, or an annotation `get_queryset` adds.

`vueda_info.E005` reports ordering on a `formatted_name` that `get_formatted_name()` computes. Set `formatted_name_lookup_expression` on that model, or order by another field.

## Place Nulls in Requested Sorts

Declare [`nulls_ordering`]{@api py:property:vueda.core.viewsets.VuedaViewSet.nulls_ordering} to keep a nulls placement when a client sorts by the field with `o`. Add the field to [`nulls_ordering_flip`]{@api py:property:vueda.core.viewsets.VuedaViewSet.nulls_ordering_flip} to swap the placement for a descending sort:

```python
class InvoiceViewSet(VuedaViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer

    # Nulls first for the default order and for `o=due_date`; nulls last for `o=-due_date`.
    ordering = ["due_date"]
    ordering_fields = ["due_date", "number"]
    nulls_ordering = {"due_date": "first"}
    nulls_ordering_flip = ["due_date"]
```

Write each key as a `__`-joined path, the same way as in `ordering`. Write `ordering` terms as strings for the placement to apply to them. A term such as `F("due_date").asc(nulls_first=True)` states its own placement for the default only, and an explicit `o=due_date` loses it.

`vueda_info.E007` reports a value other than `"first"` or `"last"`, and a `nulls_ordering_flip` entry with no placement to flip.

## Make a Function or Annotation Default Visible

A default ordering on a multi-column function, such as `Concat("first_name", "last_name")`, or on an annotation sorts the rows without being reported. To report it, sort by a real column.

When the sort is field by field, declare separate terms:

```python
ordering = ["first_name", "last_name"]
```

When the value comes from other columns on the same row, store it in a {@api ext:django:django.db.models.GeneratedField} and order by that field:

```python
class Contact(VuedaModel):
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    full_name = models.GeneratedField(
        expression=Concat("first_name", Value(" "), "last_name"),
        output_field=models.CharField(max_length=301),
        db_persist=True,
    )
```

When the value needs a join or an aggregate, write a database view. Model it as an unmanaged model related to yours by a {@api ext:django:django.db.models.OneToOneField}, and order through the relation:

```python
class CustomerData(models.Model):
    customer = models.OneToOneField(Customer, on_delete=models.DO_NOTHING, related_name="data")
    formatted_name = models.CharField()

    class Meta:
        managed = False
        db_table = "customer_data"
```

Create the view in a migration. The owning model can then order by `data__formatted_name`, or set `formatted_name_lookup_expression = "data__formatted_name"` and order by `formatted_name`.

When the sort only needs to work, keep the annotation and also list it in `ordering_fields`. Clients can then offer it as an explicit sort, although `default` stays empty.

## Order and Filter by a Related `formatted_name`

Name the related path on the viewset and in the filterset:

```python
class CartViewSet(VuedaViewSet):
    queryset = Cart.objects.all()
    serializer_class = CartSerializer
    ordering = ["customer__formatted_name"]
    ordering_fields = ["customer__formatted_name"]


class CartFilterSet(VuedaFilterSet):
    customer__formatted_name = filters.CharFilter(field_name="customer__formatted_name", lookup_expr="icontains")

    class Meta:
        model = Cart
        fields = []
```

A client sends `o=customer.formatted_name` and `customer.formatted_name=...`.

Declare a related ordering on the viewset. Django's `models.E015` rejects `customer__formatted_name` in a model's `Meta.ordering`.

A filterset built on {@api py:class:vueda.core.filters.VuedaFilterSet} or {@api py:class:vueda.core.filters.VuedaCompositePrimaryKeyFilterSet} needs nothing more. For a filterset built on [django-filter: `FilterSet`]{@api ext:django-filter:django_filters.filterset.FilterSet} directly, add {@api py:class:vueda.core.filters.FormattedNamePathFilterSetMixin} ahead of the `FilterSet` base:

```python
from django_filters import rest_framework

from vueda.core.filters import FormattedNamePathFilterSetMixin


class CartFilterSet(FormattedNamePathFilterSetMixin, rest_framework.FilterSet):
    customer_name = rest_framework.CharFilter(field_name="customer__formatted_name", lookup_expr="icontains")

    class Meta:
        model = Cart
        fields = []
```

## Check the Result

Run `python manage.py check` and fix any `vueda_info.E005`, `E006`, `E007`, or `E010` it reports.

Then request the model's {@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/} entry. `model_ordering.default` should list your default ordering's fields, and `model_ordering.fields` should list each field a client may sort by.
