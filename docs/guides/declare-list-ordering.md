---
title: Declare List Ordering
type: how-to
audience: integrator
status: draft
---

# Declare List Ordering

This guide sets a `list` endpoint's default order so that {@term Model Info} reports it to clients. It also covers nulls placement for sorts that a client requests, and ordering or filtering by a related model's `formatted_name`. [Filtering and Ordering Semantics](../core-concepts/filtering-and-ordering-semantics.md) describes the rules that these steps rely on.

## Declare the Default Order

Set `ordering` on the viewset:

```python
class QueueItemViewSet(VuedaViewSet):
    queryset = QueueItem.objects.all()
    serializer_class = QueueItemSerializer
    ordering = ["-queued"]
```

A model's `Meta.ordering` also works, and applies to every queryset that the model builds. Declare the order on the viewset when you want [`nulls_ordering`](#place-nulls-in-requested-sorts) to apply to the default.

Do not call `order_by()` with plain fields on the `queryset` attribute, inside `get_queryset`, or in the model's default manager. Model info reads the declarations, so an ordering applied in code sorts the rows, but model info does not report it. An ordering by an annotation, such as a `Count` that you annotate first, may stay in `get_queryset` or the manager, as long as it does not contradict a declared default. [Three Rules for Queryset Ordering](../core-concepts/filtering-and-ordering-semantics.md#three-rules-for-queryset-ordering) gives the full rules.

Run the system checks:

```console
python manage.py check
```

`vueda_info.E010` reports a list queryset whose order disagrees with what model info reports. The queryset comes from the `queryset` attribute, `get_queryset()`, a custom QuerySet method, or the model's default manager. Its message names one of these cases:

- **The model's `Meta.ordering` disagrees.** Declare the queryset's order as the viewset's `ordering`. For an annotation ordering, you can remove `Meta.ordering` instead.
- **A fields-only ordering, and no default ordering is declared.** Declare the queryset's order as the viewset's `ordering`.
- **The viewset's `ordering` disagrees.** Remove the `order_by()`, or make the two agree. The viewset's `ordering` is the one applied.
- **Django rejects the query.** The message quotes Django's `FieldError`. Fix the name, or annotate an aggregate before ordering by it.
- **The queryset calls `.reverse()`.** Django keeps it through the `order_by()` that applies the viewset's `ordering` or a client's `o`, so every sort comes back reversed. Remove the `.reverse()` and declare the order that you want.
- **The queryset groups its rows.** A queryset that annotates an aggregate, such as `Count("items")`, has a `GROUP BY`, and Django leaves `Meta.ordering` out of it. With no viewset `ordering`, the rows arrive unordered. Declare the order as the viewset's `ordering`.

`vueda_info.E015` reports a default manager that orders by fields alone. Move that ordering to `Meta.ordering`. It also reports a manager whose ordered query Django rejects.

`vueda_info.E006` reports a viewset `ordering` or `ordering_fields` entry that names no field. Point it at a model field, a path through relations, or an annotation that `get_queryset` adds.

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

Each key must name a field that a client can sort by: one in `ordering_fields` or in the default ordering. For a composite primary key, declare the placement on each column as well as on `pk`, because a client sorts by one column at a time.

`vueda_info.E007` reports a `nulls_ordering` value other than `"first"` or `"last"`, and a `nulls_ordering_flip` entry with no placement to flip. It also reports a key that no client can sort by, such as a dotted key, and a composite `pk` key whose columns are left out.

## Make a Function Default Visible

A default ordering on a multi-column function, such as `Concat("first_name", "last_name")`, sorts the rows, but model info does not report it. To have model info report the order, sort by one name: a field, an annotation, or a column.

When the sort is field by field, declare separate terms:

```python
ordering = ["first_name", "last_name"]
```

When the value is an expression over the row, annotate it in the viewset's `get_queryset` and order by the annotation's name. Model info reports the annotation under that name, with a `type` from its `output_field`:

```python
class ContactViewSet(VuedaViewSet):
    ordering = ["full_name"]

    def get_queryset(self):
        return super().get_queryset().annotate(full_name=Concat("first_name", Value(" "), "last_name"))
```

When other code also needs the value, store it in a {@api ext:django:django.db.models.GeneratedField} and order by that field:

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

Run `python manage.py check` and fix any `vueda_info.E005`, `E006`, `E007`, `E010`, or `E015` that it reports.

Then request the model's {@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/} entry. `model_ordering.default` should list your default ordering's fields, and `model_ordering.fields` should list each field that a client may sort by.
