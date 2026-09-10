---
title: Filtering and Ordering Semantics
type: explanation
audience: integrator
status: draft
---

# Filtering and Ordering Semantics

VUEDA's filtering and ordering contract spans four boundaries: the canonical viewset declares what filters and ordering fields exist, the model-info serializer projects those declarations into metadata payloads, `list` endpoints validate incoming queries against the declared namespace, and the client consumes the metadata to build filter and sort controls. Each boundary enforces a different aspect of the contract, and the observable behaviour depends on all four layers agreeing.

This page explains the authority at each boundary, the metadata shapes that flow between them, the search backend's ranked-search semantics, and the failure surfaces that emerge when layers disagree. For the query parameter names that carry filter and ordering intent, see [Configuration Surface and Defaults](./configuration-surface-and-defaults). For how the client caches and normalizes model-info metadata, see [Reactive Data Flow](./reactive-data-flow). For how filter choices interact with permission boundaries, see [Permission Model](./permission-model). For the broader DRF compatibility boundaries that shape these semantics, see [DRF Ecosystem Compatibility Boundaries](./drf-ecosystem-deviations).

## Contract Boundary and Authority

The filtering and ordering contract begins at the canonical registered viewset. Model-info metadata does not derive filter and ordering information solely from serializer fields; it also reads `filterset_class` and `ordering_fields` from the registered viewset. If a model has no registered viewset (only a serializer), its `model_filtering` metadata is empty, since filtering has no meaning without a `filterset_class` to declare it. `model_ordering` is different: it still reflects the model's own `Meta.ordering`, since that comes from the model rather than the viewset — see below.

This authority boundary means that adding a field to the serializer does not automatically make it filterable. Filtering requires an entry in the viewset's `filterset_class`. Adding a field to the serializer can make it automatically sortable, providing no `ordering_fields` are defined on the viewset. This reflects the functionality in Django Rest Framework, and it resolves each serializer field by its underlying `source`, not by the serializer's name for it: a serializer field exposed under a renamed key is sortable under its source's name, and a field sourced from a Python model property is not sortable at all, since DRF's default resolution excludes model properties (there is no database column for a property to sort by). If `ordering_fields` are defined, then an entry is required in `ordering_fields` to make that field sortable. The metadata projects what is declared; it does not infer capabilities from the data model.

## Metadata Projection for Ordering and Filtering

The {@term Model Info} endpoint projects viewset declarations into structured metadata that clients consume.

Ordering metadata (`model_ordering`) is an object with two keys: `default` and `fields`. `default` is a plain list of field names, in order, that DRF actually orders by when a request omits the `?o=` param — the viewset's own `ordering` when declared, otherwise the model's `Meta.ordering`. It's one or the other in full: a viewset's own `ordering` is never merged field-by-field with the model's `Meta.ordering`. `fields` is the set of fields a client's `?o=` param may reference, each carrying `name` and `type`. When no canonical viewset exists, `default` still reflects the model's own `Meta.ordering` — there's no viewset `ordering` to take precedence over it — and `fields` mirrors the fields those terms name, each carrying `ascending` where `default` names it. Without a viewset there's no `ordering_fields` declaration or serializer-derived default field set to draw from, so `fields` never grows beyond the fields the `Meta.ordering` reads. (A `Meta.ordering` holding a term that reads more than one column leaves `default` empty while still offering each of those columns in `fields`, without `ascending` — the same rule as everywhere else, described below.)

A default ordering has to be declared, not applied. `default` reads a viewset's `ordering` attribute or a model's `Meta.ordering`, and nothing else. An `order_by()` call on the viewset's `queryset` attribute, or inside `get_queryset`, is not a supported way to set a default ordering and is not reported. Metadata is projected once from what the classes declare, while an `order_by()` in code can be called from more than one place, each call replacing the last rather than adding to it, and any of them may be conditional on the request or the user — there is no single value to read back and describe. The rows still arrive in the order the queryset asked for, while `default` reports the model's `Meta.ordering` instead, or is empty when the model declares none. The `vueda_info.E010` system check reports the one shape of this that is a declaration rather than a call — an `order_by()` on the viewset's `queryset` attribute — at `manage.py check` time; see [Queryset Ordering](#queryset-ordering) for what it covers and what it cannot. Declare the order as `ordering` on the viewset (or as the model's `Meta.ordering`) and let DRF apply it. `VuedaOrderingFilter` calls `order_by()` with it on every `list` request that omits `?o=`, so the rows arrive the same way and the client is told what it is getting. `get_queryset` stays the right place for filtering, `select_related`, and annotations — just not for the default sort.

`fields` mirrors DRF's own `OrderingFilter` resolution for the viewset's `ordering_fields` setting:

- When `ordering_fields` is an explicit list, `fields` reflects that list. An entry may be a plain field name or DRF's `(field_name, label)` pair; both offer `?o=` the same field, so `fields` reports the field either way. A label captions DRF's own browsable-API ordering control and is never reported — a client builds its own column headings from the field metadata.
- When `ordering_fields = "__all__"`, DRF's shorthand for allowing any model field, `fields` expands to the model's own fields instead of the literal string `"__all__"`, plus the annotations the viewset's own `get_queryset` adds. Both are orderable, and DRF accepts both under `"__all__"`. An annotation has no model field behind it to read a type from, so its `type` comes from the annotation expression's own output field, falling back to `alpha` when Django won't resolve one. The exception is a `formatted_name` reached through `formatted_name_lookup_expression`: it is typed from the column the lookup expression lands on, which describes what the client actually sorts by. A model field is named by its field name rather than by its database column, so a foreign key is offered as `customer`, not `customer_id` — the same name a relation carries everywhere else in the metadata.
- When `ordering_fields` isn't declared at all, DRF defaults to allowing ordering on any readable field of the canonical serializer, resolved by each field's `source` rather than its serializer name. `fields` reflects that same source-based resolution: a renamed serializer field appears under its source's name, and a field with no real orderable path behind it (a Python model property, or a computed field declared without an explicit `source`) is omitted rather than causing the endpoint to error.

Every field name listed in `default` also appears in `fields` — merged into its existing entry there, or added as a new one, whichever applies — carrying an additional `ascending` key for that field's direction in the default ordering. This holds even when `ordering_fields` doesn't otherwise cover that field, because `VuedaOrderingFilter` (see below) always accepts an explicit `?o=` request for a default-ordering field regardless of `ordering_fields`; `fields` describes what a client may actually request, not just what `ordering_fields` happens to whitelist. A `fields` entry without `ascending` means that field isn't part of the default ordering — it's explicitly requestable, but its direction outside of an explicit request is undefined.

A default ordering is reported as a whole or not at all. When any term in it can't be reported under a single field name, `default` is empty rather than listing only the terms that could. Three things cause that. A term that doesn't resolve to a real model field path — a field renamed or removed without its `Meta.ordering` or viewset `ordering` being updated to match. A term that doesn't read exactly one column — either more than one, or none at all, as with Django's random ordering `"?"` — which is a working ordering with no single name to report it under (see [Database Functions in a Default Ordering](#database-functions-in-a-default-ordering)). And a term naming a queryset annotation, which is also a working ordering, and which VUEDA cannot resolve to a field to describe (see [Queryset annotations](#queryset-annotations)). Any of the three would otherwise leave a partial default ordering, telling the client the rows arrive in an order they don't.

They differ in what happens at request time: an unresolvable term fails the `list` request outright, while the other two sort the rows correctly and are simply not described. They differ again in whether anything warns you first. An unresolvable term is a misconfiguration and is reported at startup by the system checks described below, so an empty `default` traceable to drift shouldn't survive a `manage.py check`. The other two are valid, working declarations that no check reports — for a term that reads no single column an empty `default` is the expected outcome and not a problem to fix, and for an annotation it is a limitation with workarounds, described under [Queryset annotations](#queryset-annotations). A viewset's own unresolvable `ordering` doesn't fall back to the model's `Meta.ordering`, even when the model's ordering is correct. DRF passes a viewset's `ordering` straight to `order_by()` without validating it, and an explicit `order_by()` replaces `Meta.ordering` rather than adding to it — so Django raises `FieldError` and the `list` request fails outright. There is no ordering in effect to report, and reporting the model's would describe a sort order no successful response ever arrives in.

An `ordering_fields` entry that doesn't resolve costs only itself. Unlike a default ordering, `ordering_fields` lists fields a client may request one at a time, so an entry with no real field path behind it is omitted from `fields` while the rest stay on offer. Nothing fails at request time either: DRF validates `?o=` against the declared `ordering_fields`, so the stale name would only reach `order_by()` if a client asked for it by name, which metadata never advertises.

The `vueda_info.E006` system check reports both cases at startup. It validates a viewset's `ordering` and `ordering_fields` against the model, following the same resolution the metadata does — so a `"pk"` alias, a `formatted_name` reached through a lookup expression, and an annotation the viewset's own `get_queryset` adds are all accepted. A model's `Meta.ordering` is left to Django's own `models.E015`, which reports the same drift. Between them, a stale ordering surfaces as a configuration error at `manage.py check` time rather than as an empty `default` (or a missing `fields` entry) that a client can't distinguish from a model that simply has no default ordering.

`"pk"` never reaches the client. Django resolves `"pk"` as an alias for a model's primary key, so it is valid in a model's `Meta.ordering`, a viewset's `ordering`, and a viewset's `ordering_fields` — but it names no field a client could sort a column by. `default` and `fields` both report the field behind it instead: `id` for the usual auto-generated primary key, or every field a `CompositePrimaryKey` is built from, matching how Django expands ordering by such a key into one term per column. Every name in `model_ordering` is a real field name a client may send back in `?o=`.

`formatted_name` is orderable whenever the database can sort it. A model reaches its formatted name three ways (see [Create a CRUDL Surface](../guides/create-crudl-surface#the-formatted_name-contract)): as its own generated-field column, through `formatted_name_lookup_expression`, or through a `get_formatted_name()` method. The first two are sortable — the lookup expression is already annotated onto every queryset by `VuedaViewSet.get_queryset`, under the name `formatted_name` — so both appear in `fields` and may be used as a default ordering. Metadata reports the client-facing name, `formatted_name`, not the lookup expression behind it, so a client orders by one name regardless of how the server resolves it.

`ordering = ["formatted_name"]` is written the same way wherever it is declared — on a viewset, or in a model's own `Meta.ordering` — and for any of the sortable strategies. A lookup-expression `formatted_name` is not one of the model's own fields, so Django's `models.E015` check would reject the model-level declaration; `FormattedNameBaseModel._check_ordering` withholds that one term from the check, leaving every other term in the same declaration to Django. It withholds it only on a model that declares a `formatted_name_lookup_expression` **and** whose default manager is a `FormattedNameManager`, since that manager is what puts the annotation on every queryset and so makes the ordering valid by the time the query runs. A model that has replaced its default manager without inheriting it keeps Django's error, which is right about it — see [Replacing the default manager](../guides/create-crudl-surface#replacing-the-default-manager). Metadata reports the ordering identically in all cases. See [Create a CRUDL Surface](../guides/create-crudl-surface#the-formatted_name-contract) for the trade-off — a model default applies to every queryset, including ones no viewset annotated.

A method-backed `formatted_name` is computed per object in Python, so nothing exists for the database to sort by and sorting would mean loading every row. It is omitted from `fields`, and a default ordering that names it is dropped whole under the rule above. The `vueda_info.E005` system check reports ordering declared on one at startup, so this surfaces as a configuration error rather than a silently missing sort.

A related model's `formatted_name` may be named the same way any other related path is: `customer__formatted_name` in a viewset's `ordering` or `ordering_fields`, as a filter's `field_name`, or in a client's `?o=`. Paths of any depth work — `cart__customer__formatted_name` reaches through two relations.

This needs more than the annotation that makes the un-prefixed form work. `VuedaViewSet.get_queryset` annotates `formatted_name` onto the queryset being ordered or filtered, not onto the tables that queryset joins, so `customer__formatted_name` names nothing the database knows. `VuedaOrderingFilter` handles the ordering half and {@api py:class:vueda.core.filters.FormattedNamePathFilterSetMixin} the filtering half: both rewrite such a path to the one behind it — `customer__data__formatted_name` — before the query runs.

The rewrite is server-side only. The name a client sends and the name `model_ordering` and `model_filtering` report are the declared one; the resolved path is never advertised and is not a query parameter the `list` namespace check accepts. A filter's label is likewise generated from the path as declared.

Two shapes are deliberately left unresolved rather than rewritten. Both are omitted from the metadata and reported by `vueda_info.E006`:

- **A method-backed related `formatted_name`.** If the related model computes its formatted name with `get_formatted_name()`, there is no column behind it to rewrite to, at any depth.
- **A multi-valued relation in the path.** Reaching the related model through a reverse foreign key or a many-to-many (`cart_items__formatted_name`) would join a row per related object and silently multiply the rows a `list` request returns, so the path is refused instead.

A model's own `Meta.ordering` is not covered by any of this. It applies to every queryset, including the ones no filter backend ever touches, so a path like `customer__formatted_name` declared there is still rejected by Django's `models.E015` — only the model's own un-prefixed `formatted_name` is withheld from that check. Declare a related ordering on the viewset instead.

Filtering metadata (`model_filtering`) is richer. Each filter entry includes the filter field name, its type, the list of `lookup_exprs` (lookup expressions such as `in`, `exact`, `contains`), `suffixes` (such as `min` and `max` or `after` and `before`), and choice metadata when the filter field has a bounded value set. {@term Lookup} expressions are always presented as a list, even when only one expression is available. This consistent shape simplifies client parsing; consumers do not need to distinguish between single-expression and multi-expression filters.

Filters that are excluded or disabled in the filterset class are omitted from the metadata projection. The metadata represents only the active, usable filter surface.

Choice metadata for filters follows a two part shape. Static choices (enumeration values defined on the field or filter) are serialized as `{label, value}` entries with values normalized to strings. Queryset-based choices are encoded as `choices: true` plus `app_label`, `model`, and `filterset_name` identifiers, which the client uses to fetch choices dynamically through a separate endpoint, due to the potential for a high volume of data.

Value-derived filters take the second shape even though they aren't relational. `AllValuesFilter` and `AllValuesMultipleFilter` build their options from the values currently stored in a column, so the set changes as rows are added and removed. They are always reported as `choices: true` with the same identifiers, including when the column currently holds no values at all — reporting them as a filter with no choices would leave a client no way to tell a dynamic set that happens to be empty from a filter that genuinely offers nothing. The current values come from the filter-choices endpoint like any other dynamic set.

### The filterset half of the rewrite

A filter states the path it queries as its `field_name`, and django-filter builds the lookup straight from that (`field_name` plus `lookup_expr`) — there is no hook for a filter backend to rewrite it on the way to the query. {@api py:class:vueda.core.filters.FormattedNamePathFilterSetMixin} does the rewrite on the filterset instead, in its `__init__`, on the instance's own copy of each filter. The class-level declaration is left as written, which is what keeps everything client-facing on the declared path: the mixin records that path as `vueda_declared_field_name`, and a generated filter label is built from it rather than from the rewritten path.

Both VUEDA filterset bases already include the mixin, so a filterset built on either needs nothing extra:

- {@api py:class:vueda.core.filters.VuedaFilterSet}, the usual base.
- {@api py:class:vueda.core.filters.VuedaCompositePrimaryKeyFilterSet}, for composite primary key models (see [Composite Primary Key Filtering](#composite-primary-key-filtering)).

A filterset that inherits from django-filter's `FilterSet` directly gets no rewrite. Mix it in explicitly, ahead of the `FilterSet` base, so the mixin's `__init__` runs after the filters are built:

```python
from django_filters import rest_framework

from vueda.core.filters import FormattedNamePathFilterSetMixin


class CartFilterSet(FormattedNamePathFilterSetMixin, rest_framework.FilterSet):
    customer_name = rest_framework.CharFilter(field_name="customer__formatted_name", lookup_expr="icontains")

    class Meta:
        model = Cart
        fields = []
```

The mixin only rewrites what needs rewriting, so mixing it into a filterset that has no `formatted_name` filter changes nothing. A filter on a path the queryset already carries an annotation for — the model's own un-prefixed `formatted_name` — is left alone, since that annotation is both what the query resolves and what the metadata describes. So is a filter on any other path, and a related `formatted_name` with no column behind it to rewrite to (the two refused shapes above).

## Queryset Ordering

An `order_by()` on a viewset's `queryset` attribute is a real ordering that no declaration describes. DRF's `OrderingFilter` reads a view's `ordering` attribute and nothing else, so with none declared it applies no ordering at all and hands the queryset back as it found it — ordering included. The list arrives sorted the way the queryset asked, while `model_ordering.default` reports the viewset's `ordering` or the model's `Meta.ordering`, neither of which had any part in it.

The `vueda_info.E010` system check reports that class-level declaration. It reads the `queryset` attribute only, and compares the terms it carries against the default ordering the metadata would report — the viewset's `ordering` when declared, otherwise the model's `Meta.ordering`. Three outcomes get three messages, because the fix differs:

- **The viewset declares no `ordering` and the model's `Meta.ordering` disagrees.** The queryset's order is what a client receives and the model's is what the metadata describes. Declare the queryset's order as the viewset's `ordering`, or drop the `order_by()` and accept the model's order — which reverses the list if the two run opposite ways.
- **The viewset declares no `ordering` and the model declares none either.** The rows arrive sorted and `default` is empty, so a client cannot show which column sorted them. Declare the order as the viewset's `ordering`.
- **The viewset declares an `ordering` that disagrees.** Here the metadata is accurate, because DRF applies the view's `ordering` over whatever the queryset carried. What the check reports is a declaration that reaches nothing while reading like the list's sort order. Remove the `order_by()`, or make the two agree.

Direction counts. `ordering = ["queued"]` against a queryset ordered by `-queued` names the same field and sorts every row the opposite way, so the check compares each term's direction rather than only its field name. A `"pk"` alias and the field behind it are treated as the same term, as are a `formatted_name` and the column its `formatted_name_lookup_expression` names, so spelling one sort two legitimate ways is not reported as a conflict.

Four things the check cannot see, all of which leave the same mismatch:

- **An ordering applied inside `get_queryset`**, in a manager, or in a helper the queryset passes through. The check never calls `get_queryset`: doing so would run application code with no request behind it, and the result can differ per request anyway, so nothing it returned would be a declaration to hold to account.
- **An ordering that varies by request** — a different sort for a different user, role, or query parameter. Static metadata cannot describe it and a startup check cannot predict it.
- **A viewset whose `filter_backends` omits the ordering backend.** The check assumes the backend is in effect, which is what makes a declared `ordering` authoritative. Without it, no `ordering` is ever applied and the queryset's order wins whatever either side declares.
- **An ordering removed by a bare `order_by()`**, which clears the model's default ordering along with any explicit one. The rows then arrive unordered while `default` still reports the model's declaration.

What the check proves is narrow and worth stating plainly: that a viewset's class-level declarations agree with each other. It says nothing about the order any particular request returns.

## Nulls Placement for Client-Requested Ordering

A field's default ordering can control where rows with a null value in that field appear — first or last in the results — by declaring `ordering` as a `F(...).asc(nulls_first=True)`-style expression instead of a plain field name. That placement only applies automatically when a request omits the `?o=` param; DRF's stock `OrderingFilter` passes an explicit `?o=` request through as a plain field name, so the database's own default nulls placement applies instead, which can silently change where null-valued rows land the moment a client sorts by that field on purpose.

`vueda.core.filters.VuedaOrderingFilter` closes this gap. Declare `nulls_ordering` on a viewset as a dict mapping field name to `"first"` or `"last"` to attach a nulls placement to the field itself, regardless of sort direction. To have the placement flip instead — `first` becomes `last`, and `last` becomes `first`, when the field is sorted descending — list that field name in `nulls_ordering_flip` as well. A field left out of `nulls_ordering` keeps the database's default nulls placement, the same as before this backend existed.

The placement applies wherever that field is sorted **by name**. That covers an explicit `?o=` request, and equally a default `ordering` written as plain strings (`ordering = ["due_date"]`), because DRF hands a string default to the backend as a string too. A default ordering term written as an expression is left alone, since it already states its own placement or deliberately states none.

That is the point of declaring it here rather than in `ordering`: the placement belongs to the field, so it holds however the field is reached. Writing `ordering = [F("due_date").asc(nulls_first=True)]` states the placement once for the default and still loses it on `?o=due_date`; `nulls_ordering = {"due_date": "first"}` states it once for both.

```python
class InvoiceViewSet(VuedaViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer

    # Nulls first whether the rows arrive in the default order or the client
    # sends `?o=due_date`, and nulls last for `?o=-due_date`.
    ordering = ["due_date"]
    ordering_fields = ["due_date", "number"]
    nulls_ordering = {"due_date": "first"}
    nulls_ordering_flip = ["due_date"]
```

Only `"first"` and `"last"` are usable — they become the `nulls_first`/`nulls_last` keyword of `F().asc()`/`F().desc()`, and nothing else has a keyword to become. Any other value is ignored at request time rather than failing the request, so the list endpoint keeps working and returns rows in the database's default nulls order. The `vueda_info.E007` system check reports the declaration, which is where it can actually be fixed; it also reports a `nulls_ordering` that isn't a dict, a `nulls_ordering_flip` that isn't a list of field names, and a field listed in `nulls_ordering_flip` that `nulls_ordering` gives no placement to flip. Both attributes are checked on every run and every problem in either is reported together, since they fail independently and fixing them one `manage.py check` at a time would be needless work.

This is server-side sort behavior only; `model_ordering` doesn't advertise `nulls_ordering`/`nulls_ordering_flip` to clients, since a client only needs to send `?o=` and get consistent placement back, not know which end nulls land on ahead of time.

## Explicit Ordering on Default-Only Fields

`VuedaOrderingFilter` also widens which fields a client's `?o=` param may reference: a field named in the viewset's default ordering (`ordering`, or the model's `Meta.ordering` when the viewset doesn't declare one) is always a valid explicit target, even when `ordering_fields` doesn't whitelist it. Without this, DRF would silently reject the request and fall back to the default ordering — a confusing result, since a field a client can already see the list sorted by ought to be requestable directly.

This is why every field in `model_ordering.default` also appears in `model_ordering.fields`: the metadata reflects what a client may actually request, not only what `ordering_fields` happens to name.

### The `pk` alias

`"pk"` is a legitimate ordering term — Django's query machinery resolves it — but it names no field a client can otherwise see, so `model_ordering` never hands it over. It reports the field behind it instead: `id` for an ordinary model, and one entry per column for a `CompositePrimaryKey`.

`VuedaOrderingFilter` accepts both spellings, so a client following the metadata (`?o=id`) and a reader of the viewset's own source (`?o=pk`) both get primary-key order. Only the expanded name is advertised, so there is one name to display and one name to send.

The expansion applies wherever the alias is declared — `ordering` and `ordering_fields` alike — on both sides of the contract. That symmetry is the point: metadata advertises the expanded name, so the backend has to accept it, or the alias becomes a name every client is offered and none can use.

```python
class ProductViewSet(VuedaViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    ordering = ["pk"]
    ordering_fields = ["name"]
    # model_ordering.default == ["id"]
    # model_ordering.fields  == [{"name": "name", ...}, {"name": "id", ..., "ascending": true}]
    # `?o=id`, `?o=-id`, and `?o=pk` are all accepted.


class ProductAltViewSet(VuedaViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    ordering = ["-name"]
    ordering_fields = ["pk", "name"]
    # The alias is in `ordering_fields` rather than in `ordering`, and expands the same way.
    # model_ordering.default == ["name"]  (descending; `ascending` is false)
    # model_ordering.fields  == [{"name": "id", ...}, {"name": "name", ..., "ascending": false}]
    # `?o=id`, `?o=-id`, and `?o=pk` are all accepted.
```

### Queryset annotations

An annotation the viewset's own `get_queryset` adds is orderable without being a model field, and DRF accepts a `?o=` request for it whether it was reached through `ordering_fields = "__all__"` or named outright in `ordering_fields`. `model_ordering.fields` reports it either way, typed from the annotation's own `output_field` — falling back to `alpha` when Django refuses to resolve one (a `Coalesce` over mixed types, for instance).

A **default** ordering that names an annotation is a different matter: it is not advertised. `model_ordering.default` comes back empty for it, and the annotation reaches `fields` only if `ordering_fields` also covers it by one of the two routes above.

```python
class ProductViewSet(VuedaViewSet):
    serializer_class = ProductSerializer

    ordering = ["shelf_label"]
    ordering_fields = []

    def get_queryset(self):
        return super().get_queryset().annotate(shelf_label=Lower("name"))

    # The list really does arrive sorted by shelf_label, and `?o=shelf_label` really is accepted.
    # model_ordering.default == []
    # model_ordering.fields  == []
```

This is a limitation, not a rule with a reason behind it. Ordering metadata is built by resolving each term to the model field behind it, and an annotation has no such field — there is nothing to read a `type` from, and no way to tell an annotation the viewset added from a name that is simply stale. A queryset can pick up an annotation anywhere on its way to the metadata layer, including inside a manager or a helper VUEDA never sees, so there is no declaration to inspect either. Nothing warns you: `vueda_info.E006` deliberately accepts annotations, so a default ordering on one passes `manage.py check` and then goes unreported.

Nothing breaks — the ordering runs, and `VuedaOrderingFilter` accepts `?o=` on that name. What's lost is the client's ability to know about it: a metadata-driven client can't show which column the list is sorted by, and can't offer the column as a sort target unless `ordering_fields` names it.

If a client needs to see the default ordering, give the sort a real database column so there is a field to describe:

- **A model field**, where the value is something you can store.
- **A `GeneratedField`**, where the value is derived from other columns on the same row. The database computes and persists it, and it resolves like any other field.
- **A database view**, where the value needs a join or an aggregate. Model the view as a `managed = False` model with the columns it exposes, relate it to the model with a `OneToOneField`, and order through the relation. This is the pattern `Customer` and `CustomerData` use in the test suite: `CustomerData` is unmanaged, backed by `db_table = "customer_data"`, and carries a real `formatted_name` column that `Customer` reaches through `formatted_name_lookup_expression = "data__formatted_name"`.

If you only need the ordering to work and don't need to describe it, an annotation is fine as-is. Name it in `ordering_fields` as well, so it at least appears in `fields` and a client can offer it as an explicit sort.

## Database Functions in a Default Ordering

A default `ordering` term is not limited to a field name. Django's `order_by()` accepts any query expression, and so does a viewset's `ordering` or a model's `Meta.ordering`: a plain name, an `F(...).asc()`/`.desc()`, or a scalar database function from `django.db.models.functions`.

Every scalar function Django ships works — `Lower`, `Upper`, `Reverse`, `Trim`, `Coalesce`, `Concat`, `Cast`, `Collate`, `Length`, `Greatest`/`Least`, the `Extract` and `Trunc` date families, the text-hash functions, and the math functions. This is not an allowlist. VUEDA reads a term by walking the expression tree Django already builds and collecting the `F` references in it, so it never has to recognize a particular function class: a `Func` subclass you write yourself works the same way, as does any function a future Django version adds. The window functions (`Rank`, `RowNumber`, and the rest) are the exception, and only because Django itself requires them to be wrapped in a `Window(...)` rather than used bare in `order_by()`.

```python
from django.db.models import Value
from django.db.models.functions import Coalesce, Lower


class CustomerViewSet(VuedaViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer

    # Case-insensitive default sort. A bare expression sorts ascending; wrap it in
    # `.desc()` (or `.asc(nulls_last=True)`) to say otherwise.
    ordering = [Lower("name")]


class ContactViewSet(VuedaViewSet):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer

    # Falls back to the company name when a contact has no display name of its own.
    ordering = [Coalesce("display_name", "company__name", Value(""))]
```

The fields a term reads are what both layers work from, and one term can read any number of them.

`VuedaOrderingFilter` makes each of those fields a valid explicit `?o=` target, on the same reasoning as the section above. What such a request sorts by is the column itself, not the function over it — `?o=name` against a `Lower("name")` default gives a plain case-sensitive sort. This is the same divergence an explicit request already has with a default that carries a nulls placement, and `nulls_ordering` is the analogous escape hatch for that one. It takes an explicit request to reach it: the VUEDA client shows a default it was told about without sending it back, so a list the reader has not sorted keeps the function. One path does not keep it. A search reaching through a multi-valued relation deduplicates with a `DISTINCT ON`, which a function over a column cannot pair with, so such a list arrives in relevance order instead (see [Observable Failure Modes](#observable-failure-modes)).

`model_ordering` reports a term that reads exactly one column under that column's name, with `ascending` taken from the term's direction: `Lower("name").desc()` is reported as `{"name": "name", "type": "alpha", "ascending": false}`. The `type` describes the column the client orders by, not the value the function returns, so `Length("name")` reports `name` as `alpha` rather than `numeric`.

A term that reads more than one column has no single name that stands for the sort it performs, so `model_ordering.default` is empty for that ordering rather than naming each column. Naming them would tell the client the rows arrive sorted by the first and then by the second, which is not what `Concat("first_name", "last_name")` does.

The ordering itself still runs, and each column it reads is still an explicit `?o=` target — so each column does appear in `model_ordering.fields`, without an `ascending` flag. `ascending` describes the reported default ordering, and there isn't one to describe. A client can offer the sort without claiming the rows already arrive that way. What is withheld is the claim about how the rows currently arrive, not the fields themselves.

A term that reads no column at all is the other end of the same rule. Django's random ordering — `ordering = ["?"]` — is one, and so is an expression built on nothing the row holds, such as `Now()`. Both sort the rows without naming a column, so `default` is empty for them too. Here `fields` gains nothing either: a multi-column term at least contributes each column it reads as an explicit `?o=` target, and there is no column to contribute. The ordering still runs.

`"?"` may also be listed in `ordering_fields`. DRF matches a `?o=` value against those entries as plain strings, so a viewset declaring it accepts `?o=?` and returns the rows in random order, and `vueda_info.E006` leaves the entry alone rather than reporting it as a field the model doesn't have. It still names no field, so `fields` doesn't report it — a client that wants a random order sends `?o=?` because the viewset was written to offer it, not because the metadata advertised it.

Two ways to have the _default_ advertised as well:

- Declare it as separate terms — `ordering = ["first_name", "last_name"]` — where the sort really is field-by-field.
- Give the expression a real column to sort — a `GeneratedField` where it reads only this row, a database view where it needs a join — and order by that column's name. A `GeneratedField` over `Concat("first_name", "last_name")` is a field like any other, so it reports one name to send and one name to display.

Annotating the expression in `get_queryset` and ordering by the annotation's name makes the ordering work, but it is not advertised — `model_ordering.default` is empty for an annotation too. See [Queryset annotations](#queryset-annotations).

A `formatted_name` path inside an expression is rewritten to the column behind it in place, so `Lower("customer__formatted_name")` still applies the `Lower` to the rewritten column (see the section above). A field named only inside a boolean condition — the `Q` in `Case(When(active=True, then="name"), default="code")` — is not treated as a field the ordering reads; the condition chooses which value is sorted, not which column the sort reads.

## Query Namespace and Validation Boundary

`list` and `retrieve` endpoints both enforce strict query parameter validation, with a narrower accepted namespace on `retrieve`.

On `list`, the accepted query key namespace is the union of: declared filter field names, suffix-derived keys (filter field name plus suffix), any keys derived from the filterset's lookup expression configuration, and framework-level parameters (`s`, `o`, `p`, `ps`, `e`, `f`, `om`). A viewset with no `filterset_class` accepts only the framework-level parameters, since it has no declared filter fields to add to the namespace.

On `retrieve`, the accepted query key namespace is `e`, `f`, and `om` only. A detail route already identifies its object by primary key, so filter, pagination, ordering, and search parameters carry no meaning there and are rejected along with any other unrecognized key.

Any query key outside the accepted namespace is rejected with an HTTP 400 response containing a field-keyed validation error: `"Invalid query parameter. Valid filters are ..."`.

This strict validation is a deliberate departure from upstream DRF, which typically ignores unknown query parameters. VUEDA treats unknown query keys as invalid contract usage rather than silently discarding them.

## Search Contract Surface

Search is a distinct sub-surface of `list` queries, governed by `VuedaSearchFilterBackend`. This backend extends DRF's `SearchFilter` with two capabilities: trigram similarity and ranked search.

The standard DRF search prefixes (`^` for starts-with, `=` for exact, `@` for full-text, `$` for regex) are available. VUEDA adds three additional prefixes: `#` for trigram similarity, `~` for trigram word similarity, and `V:` for VUEDA-specific ranked search fields.

When at least one search field uses the `V:` prefix, the search backend switches to ranked-search mode. In this mode, the backend computes a `combined_rank` by combining full-text search rank, trigram similarity, and word-boundary match scores. Results are filtered by a `search_threshold` and, when no explicit ordering parameter is provided, ordered by `-combined_rank` (best match first). An explicit `o` (ordering) parameter normally suppresses that ranking, since explicit ordering takes precedence over relevance. The backend reads the raw parameter, so any nonempty `o` suppresses it, including a value DRF rejects. The viewset's own default ordering then applies in place of relevance. Ranking wins anyway on one path: a search that deduplicates through a `DISTINCT ON` needs every ordering term to pair with a distinct column, and returns to `-combined_rank` when one cannot (see [Observable Failure Modes](#observable-failure-modes)). Duplicate results will be removed from ranked results.

When at least one search field uses the `#` prefix, the search backend switches to use trigram similarity. In this mode, the backend combines the search term into a single search term, because that is required for trigram similarity.

When no search fields use the `V:` or `#` prefix, the backend falls back to standard DRF `SearchFilter` behaviour. The `V:` prefix is the boundary between deterministic lookups and ranked search; its presence or absence changes the query execution strategy.

## Filter Choices and Permission Surfaces

Dynamic filter choices, the values available for a filter dropdown, are served by a dedicated endpoint that enforces its own validation and permission contracts.

The filter-choice endpoint validates the requested field against the model's declared filter set. An unknown filter field returns an HTTP 404 response with a list of valid filter fields. This strict validation prevents probing for undeclared filters and provides a diagnosable error when the client passes an incorrect field name.

Permission checking for filter choices is bifurcated by source. Static choices (enumeration values) require only `read` permission on the current model. Queryset-based choices (backed by a related model) require both `read` permission on the current model and `list` permission on the related model. This distinction prevents filter choice endpoints from leaking relation values that the user does not have permission to see.

When the related model permission check fails, the endpoint returns HTTP 403, even though the user has `read` permission on the current model and can view the model's list and `detail` views. This can be confusing because the user can see the model's data, but cannot populate a filter dropdown that references a related model.

Queryset-based choice resolution assumes a `formatted_name` lookup path on the related model for display labels. If the related model does not define this path, the endpoint raises an HTTP 500 with `"Cannot resolve keyword 'formatted_name'..."`. A system check (`vueda_info.E001`) catches this misconfiguration for registered models at startup, so the error should be visible in server output before any requests reach the endpoint. This is a server-side configuration error, not a client issue, but it surfaces as a broken filter dropdown.

## Client Normalization and Cache Semantics

The client fetches model-info once per `app.model` key and caches the result in `storeModelInfo`. Filtering and ordering metadata are part of this cached payload and are normalized alongside other model-info fields: nested objects are camelCased, and the overall structure is flattened for consistent client access.

`storeModelConfig` derives sortable field names from `modelInfo.ordering` and maps them to the `o` query parameter for `list` requests. Filter configuration is consumed by `useFilter` and `useFilterForm`, which build the filter UI from the cached `modelInfo.filtering` entries. Choice population for filters uses `storeModelChoices` and `useModelChoices`, which fetch dynamic choices as needed.

Cached model-info errors are sticky. A failed model-info fetch for a given `app.model` key rejects immediately on subsequent attempts without re-fetching. This means that a transient server error during initial model-info load can render the model's filter and sort controls permanently unavailable until the store is reset or the page is reloaded.

The default filter UI uses only the first lookup expression (`lookupExprs[0]`) from each filter's metadata. Multi-lookup-expression selectors are not emitted by default. If a filter declares multiple lookup expressions (for example, `exact` and `icontains`), only the first is wired into the default filter component. A custom filter UI is needed to expose multiple lookup expressions for a single field.

## Composite Primary Key Filtering

Models that use a composite primary key cannot use `VuedaFilterSet` as a filterset base. `VuedaFilterSet` inherits from `IdInFilterSet`, which declares a default `id` filter. Composite primary key models have no `id` field; Django requires their primary key field to be named `pk`, and `id` is not a valid field name on such models.

`VuedaCompositePrimaryKeyFilterSet` is the correct base class for filtersets on composite primary key models. It declares no default filters. Filters for the fields that form the composite key, and any other filterable model fields, must be declared explicitly on the filterset subclass.

## Observable Failure Modes

**Unknown query parameter returns 400.** A typo in a `list` query key, or a stale client sending a filter key that no longer exists in the filterset, produces an HTTP 400 with the message `"Invalid query parameter. Valid filters are ..."`. The error response includes the valid filter set, which aids diagnosis.

**Ranked search bypassed silently.** If no search fields use the `V:` prefix, the search backend falls through to standard DRF `SearchFilter` behaviour. The symptom is that search results are not ranked by relevance and may not meet expected search quality standards. There is no runtime warning; the fallback is silent.

**Filter choice endpoint returns 404 for unknown fields.** An incorrect field name in a filter-choice request returns 404 with the valid filter set named in the response. This can present as a missing-choices UI state rather than a validation error on the originating `list` view, because the error occurs on a separate endpoint.

**Related model permission blocks filter choices.** Missing `list` permission on a related model causes the filter-choice endpoint to return 403, even when the user can read the current model. The symptom is a filter dropdown that fails to populate while the rest of the model's UI works normally.

**Related model missing `formatted_name`.** If the related model referenced by a queryset-backed filter choice does not implement the `formatted_name` lookup path, the filter-choice endpoint returns 500. A system check (`vueda_info.E001`) catches this for registered models at startup. This is a configuration error on the related model.

**A filter on a related `formatted_name` raises `FieldError` on a filterset that doesn't include the mixin.** A filterset built on django-filter's `FilterSet` rather than on a VUEDA base never rewrites the declared path, so a filter with `field_name="customer__formatted_name"` reaches the query as written and Django raises `FieldError: Cannot resolve keyword 'formatted_name' into field` — an unhandled server error rather than a 400, and only on requests that send that filter's query parameter. Nothing reports it at startup: the system checks validate a viewset's `ordering` and `ordering_fields`, not a filterset's `field_name` declarations. Mix in {@api py:class:vueda.core.filters.FormattedNamePathFilterSetMixin} (see [The filterset half of the rewrite](#the-filterset-half-of-the-rewrite)), or switch the filterset to a VUEDA base.

**Sticky model-info fetch errors.** A failed model-info fetch caches the error and blocks all subsequent access to that model's filtering and ordering metadata. Retrying the navigation does not trigger a re-fetch.

**Renamed or property-backed serializer fields sort unexpectedly, or not at all.** When a viewset doesn't declare `ordering_fields`, a client can only order by a serializer field's `source`, not its exposed name. A serializer field that renames a model field (for example, exposing `Product.name` as `title` via an explicit `source="name"`) is sortable as `name`, and an `?o=title` request is silently ignored rather than erroring. A serializer field sourced from a Python model property is not sortable under any name, because DRF's default resolution excludes model properties outright — there is no database column for a property to sort by. Both cases fall back to the viewset's default ordering rather than failing loudly, which can read as "sorting doesn't work" rather than "this field isn't declared sortable."

**A queryset's own `order_by()` sorts rows the metadata doesn't describe.** A viewset that sets its default order as `queryset = Model.objects.order_by("queued")` instead of `ordering = ["queued"]` sorts its rows that way, but `model_ordering.default` reports the model's `Meta.ordering` — a different order, or none at all. The `list` response is correctly sorted and returns 200, so the only symptom is a client whose sort indicator disagrees with the rows underneath it, and whose `Reset sort` restores an order the server never applied. `vueda_info.E010` reports the class-level form of this, where the `order_by()` sits on the `queryset` attribute; an `order_by()` inside `get_queryset` has no single value to check and goes unreported (see [Queryset Ordering](#queryset-ordering)). Move the order onto the viewset's `ordering` attribute.

**Default filter UI uses only first lookup expression.** Filters with multiple declared lookup expressions only expose the first one in the default filter component. The additional expressions are present in the metadata but not rendered. This is a UI limitation, not a metadata issue.

**A multi-column ordering expression shows no default sort in the client.** A default `ordering` term that reads more than one column — `Concat("first_name", "last_name")` — sorts the rows correctly but is left out of `model_ordering.default`, because no single field name stands for the sort it performs. No system check reports this: the configuration is valid, and the only symptom is a client that shows no sort indicator and offers no sort control for a list that is in fact sorted. If the sort is meant to be visible to clients, declare it as separate terms or annotate the expression in `get_queryset` and order by the annotation's name.

**A deduplicating search falls back to relevance order for an ordering it cannot pair.** When a `V:`-prefixed or `#`-prefixed search reaches through a multi-valued relation, `VuedaSearchFilterBackend` deduplicates with a `DISTINCT ON`, and PostgreSQL requires those expressions to match the leftmost `ORDER BY` expressions. `distinct()` accepts only field paths, while `order_by()` accepts any expression. So each ordering term has to compile to a bare column that both sides of the query reach the same way. Four shapes do not:

- **A term reading more than one column**, such as `Concat("first_name", "last_name")`, and a term reading none at all, such as `"?"`. Neither has a single column to pair with.
- **A term reading one column without being that column**, such as `Lower("name")`. Its distinct column compiles to `name` while the ordering compiles to `LOWER("name")`.
- **A plain relation name whose related model declares its own `Meta.ordering`**, such as `customer` where `Customer` orders by `["user__name"]`. Django replaces the term with that ordering over the joined table, while the distinct column trims the join back to the local foreign key.
- **A `"pk"` alias on a composite primary key**, which stands for several columns where the pairing allows one.

The rows then come back ranked by relevance rather than in the requested order. The response is correct and returns 200; only the order differs from the same request without a search term.

How each shape gets here differs, which is what decides whether a client can trigger it. A function over a column, and a term reading more than one, arrive only through the viewset's own default `ordering`: a `?o=` value is a plain field name and carries neither. A nonempty `?o=` that names nothing valid is the way in. DRF drops the value and leaves the default ordering in place, while the search backend still treats the request as explicitly ordered. A relation name arrives directly as `?o=customer`, and `ordering_fields = "__all__"` advertises every relation that way in `model_ordering.fields`, so a metadata-driven client offers it as a sort control.

Everything else pairs and is unaffected: a concrete field, a path through relations, a queryset annotation, the `"pk"` alias on an ordinary primary key, and a relation whose related model declares no ordering.

## Relevant Implementation Surface

- {@api rest:endpoint:GET:/vueda.info/model_info/}
- {@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}
- {@api rest:endpoint:GET:/vueda.info/model_info_filter_choices/{app_label}/{model}/{field}/}
- {@api py:class:vueda.info.serializers.ModelInfoSerializer}
- {@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_filtering}
- {@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_ordering}
- {@api py:class:vueda.info.viewsets.ModelInfoFilterSetChoicesViewSet}
- {@api py:function:vueda.info.viewsets.ModelInfoFilterSetChoicesViewSet.get_queryset}
- {@api py:function:vueda.info.viewsets.ModelInfoFilterSetChoicesViewSet.validate_queryset}
- {@api py:module:vueda.core.filters}
- {@api py:class:vueda.core.filters.VuedaOrderingFilter}
- {@api py:class:vueda.core.filters.VuedaSearchFilterBackend}
- {@api py:module:vueda.core.ordering}
- {@api py:function:vueda.core.ordering.ordering_term_field_names}
- {@api py:function:vueda.core.ordering.queryset_explicit_ordering}
- {@api py:class:vueda.core.filters.FormattedNamePathFilterSetMixin}
- {@api py:class:vueda.core.filters.VuedaFilterSet}
- {@api py:class:vueda.core.filters.VuedaCompositePrimaryKeyFilterSet}
- {@api py:function:vueda.info.viewsets.ModelInfoChoicesBaseViewSet.check_permissions}
- {@api py:class:vueda.core.viewsets.NoExtraFieldsForViewSetMixin}
- {@api py:function:vueda.core.viewsets.NoExtraFieldsForViewSetMixin.list}
- {@api js:module:@arrai-innovations/vueda/stores/storeModelInfo}
- {@api js:module:@arrai-innovations/vueda/stores/storeModelConfig}
- {@api js:module:@arrai-innovations/vueda/stores/storeModelChoices}
- {@api js:module:@arrai-innovations/vueda/use/useFilter}
- {@api js:module:@arrai-innovations/vueda/use/useFilterForm}
- {@api js:module:@arrai-innovations/vueda/use/useModelChoices}
- {@api js:property:@arrai-innovations/vueda/utils/constants#ORDERING_PARAM}
- {@api js:property:@arrai-innovations/vueda/utils/constants#SEARCH_PARAM}
- {@api vue:component:ViewList}
- {@api vue:component:FilterGroup}
- {@api vue:component:FilterMenu}
- {@api vue:component:FilterChip}
- {@api vue:component:FilterFieldForm}
