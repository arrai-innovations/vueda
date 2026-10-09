---
title: Data That VUEDA Does Not Display
type: how-to
audience: integrator
status: draft
---

# Data That VUEDA Does Not Display

Not every model or query in a VUEDA project reaches a VUEDA screen. Some examples:

- rows that a data export reads and writes to a file
- data that the project sends to another system's API, or receives from one
- staging tables that an import fills before the project copies the rows into displayed models
- summary tables behind a report that the project builds outside VUEDA

That data doesn't need a `formatted_name`, the label VUEDA shows for an object, and VUEDA doesn't require one. VUEDA's base classes and model-info registration exist for data that VUEDA displays. They bring startup checks that assume the data will be shown, so they get in the way of data that won't be.

Inheriting `VuedaModel` is not a requirement for every model in the project. Choosing it for an export model and then overriding methods to satisfy its checks works against the framework. This guide shows the two supported ways to keep such data out of those checks.

## Choose an Option

| Situation                                                                 | What to do                                                     | What not to do                                                                           | Why not                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No VUEDA screen shows the model at all                                    | [Use a plain Django model](#a-model-that-vueda-never-displays) | Inherit `VuedaModel` or `Lookup`, or register the model with model info                  | `VuedaModel` and `Lookup` add a `formatted_name` column computed from `name`, VUEDA's CRUDL permission names, and the `class Vueda` feature policy. Registration tells the client to build screens for the model. Both bring startup checks. |
| VUEDA shows the model, but one kind of query, such as an export, does not | [Opt a manager out](#a-query-that-vueda-never-displays)        | Give the query a `FormattedNameManager`, or a plain `models.Manager` without the opt-out | `FormattedNameManager` adds the `formatted_name` annotation to every query, and the join behind it when the name comes from a related model. A plain manager without the opt-out fails the startup check.                                    |

## Examples

### A Model That VUEDA Never Displays

Inherit Django's `models.Model` instead of `VuedaModel`. A plain Django model has no `formatted_name` field, so it needs no `formatted_name = None` and no replacement. No `formatted_name` check runs on it, because the checks belong to VUEDA's base classes and to registered models.

```python
from django.db import models


class OrderExportRow(models.Model):
    order_number = models.CharField(max_length=64)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    exported_at = models.DateTimeField(auto_now_add=True)
```

Don't register a serializer or viewset for the model with model info. Serve the data from a plain Django or DRF view instead.

A plain model doesn't get the `class Vueda` feature policy. To record history for one anyway, call {@api py:function:vueda.history.apps.track_model} directly.

### A Query That VUEDA Never Displays

Keep the model on `VuedaModel` and give the query its own manager. Set `used_without_formatted_name = True` on that manager's class, and declare `objects` above it. Django makes the first manager that a model declares its default. Setting `Meta.default_manager_name = "objects"` instead makes the order not matter. This example declares `objects` first:

```python
from django.db import models

from vueda.core.models import FormattedNameManager, VuedaModel


class OrderExportManager(models.Manager):
    used_without_formatted_name = True


class Order(VuedaModel):
    formatted_name = None
    formatted_name_lookup_expression = "customer__name"

    objects = FormattedNameManager()
    export = OrderExportManager()
```

`Order.export` then skips the `formatted_name` annotation and the join behind it, and the startup check leaves it out. The opt-out works only on a manager other than the default. An opted-out manager still has to run with the model's `Meta.ordering`. Subclasses inherit the attribute, and a subclass that sets `used_without_formatted_name = False` is checked again. [Opting a manager out of the check](./create-crudl-surface#opting-a-manager-out-of-the-check) has the full rules.

A viewset built on `Order.export` still returns `formatted_name`, because `VuedaViewSet.get_queryset` adds the annotation itself.

## Data Without a Formatted Name Cannot Be Displayed

The client uses `formatted_name` in choice dropdowns, in references to expanded related objects, and anywhere else it names an object (see [The `formatted_name` Contract](./create-crudl-surface#the-formatted_name-contract)).

::: warning
VUEDA cannot display a model or queryset correctly without a `formatted_name`. Use the options on this page only for data that no VUEDA screen shows. That includes screens that show the data indirectly, for example as a related field on another model's form. If a VUEDA screen does show the model, give it a formatted name. For a model that has to be displayed but cannot inherit the base class, see "Models that cannot inherit `VuedaModel`" under [The `formatted_name` Contract](./create-crudl-surface#the-formatted_name-contract).
:::

The startup checks affect only what VUEDA can display. They do not control who can read the data. The server's permission checks are separate (see [Authorization vs UI Semantics](../core-concepts/authorization-vs-ui-semantics)).

## Relevant Implementation Surface

- Python:
    - {@api py:class:vueda.core.models.VuedaModel}
    - {@api py:class:vueda.core.models.FormattedNameManager}
    - {@api py:function:vueda.history.apps.track_model}
    - {@api py:function:vueda.info.registration.register}
