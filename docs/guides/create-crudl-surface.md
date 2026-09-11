---
title: Create a CRUDL Surface for a New Model
type: how-to
audience: integrator
status: draft
---

# Create a CRUDL Surface for a New Model

This guide walks through the end-to-end process of standing up a fully functional {@term CRUDL} surface; `list`, `create`, `read`, `update`, and `delete`; for a new Django model in VUEDA. By the end, the model will be served by the REST API, discoverable through model-info, and navigable in the Vue client with metadata-driven routes, forms, and permission gating.

The guide assumes familiarity with the framework's layered architecture. If you have not yet read [Architecture Overview](../core-concepts/architecture-overview), start there; the server responsibility layers and convention-over-configuration principles it describes are the foundation for everything below.
This flow starts with {@api py:class:vueda.core.models.VuedaModel} and builds a complete {@term CRUDL} surface from server conventions.

## Goal and Preconditions

The objective is a single model that supports all five standard CRUDL actions; `list`, `create`, `retrieve`, `update`, and `destroy`; and that is fully registered with the metadata API so the client can discover it, generate routes, and render views without hand-wired per-model code.

Before you begin, ensure the following are in place:

The model's Django app is installed in `INSTALLED_APPS` and has an `AppConfig` with a `ready()` method available for registration. The database migrations for the model have been created and applied. The project's URL configuration includes the VUEDA info URLs (`vueda.info.urls`) and has a router path where your app's viewset URLs will be mounted.

## Model and Permission Baseline

VUEDA's conventions begin at the model layer. Extend `VuedaModel` to inherit the framework's base infrastructure, including the default `formatted_name` generated field and the `BaseModelMeta` permission set.

`BaseModelMeta` defines `default_permissions` as `("create", "read", "update", "delete", "list")`. These replace Django's default `add`/`change`/`delete`/`view` codenames with VUEDA's own CRUDL codenames. Permission evaluation throughout the stack; model-info action filtering, viewset permission checks, and client-side route gating; relies on these codenames being present. If your model's `Meta` does not inherit from `BaseModelMeta` (either directly or through `VuedaModel`), the permission machinery will not find the expected codenames and action visibility will break.

### The `formatted_name` Contract

`formatted_name` is a client-facing object representation distinct from `__str__`. It is used as the display label in choice dropdowns, expanded-field references, and anywhere the client needs a human-readable label for an object instance. `VuedaModel` defines it as a `GeneratedField` with expression `F("name")`, which works when the model has a `name` field. Four strategies exist for models where this default does not apply:

**Inherited generated field (default).** If your model has a `name` field, the inherited `GeneratedField` works without changes. The database materializes the value and it is available for efficient querying.

**Custom generated-field expression.** Override the `formatted_name` field with a different expression; for example, `Cast(F("order_number"), output_field=CharField())`. This keeps the value database-persisted while deriving it from a different source.

**Null field with a lookup expression.** Set `formatted_name = None` on the model and define `formatted_name_lookup_expression` as a string pointing to an alternate field path (e.g., `"data__formatted_name"`). `FormattedNameManager` — the default manager `FormattedNameBaseModel` provides — annotates every queryset the model builds with this expression, and `VuedaViewSet.get_queryset` does the same for the querysets DRF builds, so `formatted_name` returns the resolved value in all list and retrieve responses. Because the annotation is on the model's own manager, `formatted_name` also works on a plain `Model.objects.all()`: in a management command, in the admin, through a reverse relation, or anywhere else a queryset is built (see [Replacing the default manager](#replacing-the-default-manager)). When the model appears as an expanded field in another serializer, `VuedaListSerializer` applies the same annotation to the related queryset, so `formatted_name` is populated in expand responses as well. Choice endpoints use the same annotation when resolving labels. Point the expression at a real column: the annotation is a plain `F(...)` over that path, so every segment has to be a database field. An expression aimed at another model's `formatted_name` works only when that model has a `formatted_name` column of its own — it is not followed through a second `formatted_name_lookup_expression`, and pointing at one raises a `FieldError` when the queryset is annotated. Every relation the path crosses also has to be single-valued: a forward foreign key or a one-to-one, nullable or not. Reaching through a reverse foreign key, a many-to-many, or a `GenericRelation` would join a row per related object, so the model would quietly return more rows than its table holds on every queryset rather than failing anywhere — `vueda_info.E008` reports that at startup.

**Null field with a Python method.** Set `formatted_name = None` on the model and implement a `get_formatted_name()` method for runtime computation. This is the most flexible option but requires explicit wiring in the serializer (covered in the next section). Choice endpoints resolve labels using a priority order: `get_formatted_name()` method, then `formatted_name_lookup_expression` annotation, then the direct `formatted_name` field, then static field choices.

A `get_formatted_name()` that traverses a relation — `self.customer.user.email`, say — costs one extra query per row per relation traversed whenever `formatted_name` is resolved in bulk, unless the model also declares `formatted_name_select_related` as a tuple of relation paths, the same paths it would pass to `queryset.select_related()` itself:

```python
class Cart(VuedaModel):
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT)

    formatted_name = None
    formatted_name_select_related = ("customer__user",)

    def get_formatted_name(self):
        if self.customer and self.customer.user:
            return self.customer.user.email
```

`annotate_formatted_name` — the helper `FormattedNameManager.get_queryset`, `VuedaViewSet.get_queryset`, `VuedaListSerializer.to_representation`, and the prefetch-plan builder all share — applies this `select_related` the same way it applies a `formatted_name_lookup_expression` annotation, so every bulk path that resolves `formatted_name` joins the declared relations in the same query instead of resolving them per row. A model with no `formatted_name_select_related` is unaffected; declaring it is only worthwhile when `get_formatted_name()` actually reaches through a relation.

Setting `formatted_name = None` without providing either `formatted_name_lookup_expression` or `get_formatted_name()` is caught at startup by a Django system check (`vueda_info.E001`), which reports the misconfiguration before any requests are served. Providing both alternatives triggers `vueda_info.E002`; decorating `get_formatted_name` with `@property` instead of leaving it as a plain method triggers `vueda_info.E003`; passing a non-string value for `formatted_name_lookup_expression` triggers `vueda_info.E004`; pointing `formatted_name_lookup_expression` through a relation that can match more than one row triggers `vueda_info.E008`; declaring a `formatted_name_lookup_expression` on a model whose default manager isn't a `FormattedNameManager` triggers `vueda_info.E009`; and declaring both `formatted_name_lookup_expression` and `formatted_name_select_related` triggers `vueda_info.E011`, since `formatted_name_select_related` only has an effect alongside `get_formatted_name()`.

**Ordering by `formatted_name`.** The first three strategies are sortable in the database, so `formatted_name` may be named as a plain field name in a viewset's `ordering` or `ordering_fields`, or in the model's own `Meta.ordering`, and clients may request it with `?o=formatted_name`. A generated field is sorted as its own column; a lookup expression is sorted through the annotation `VuedaViewSet.get_queryset` already adds. Either way, model-info metadata reports the field as `formatted_name` — the lookup expression behind it stays a server-side detail.

On a viewset, whichever strategy the model uses:

```python
class DeliveryViewSet(VuedaViewSet):
    queryset = Delivery.objects.all()
    serializer_class = DeliverySerializer
    ordering = ["formatted_name"]
```

Or as the model's own default, which applies whenever the viewset declares no `ordering` of its own:

```python
class Delivery(VuedaModel):
    formatted_name = None
    formatted_name_lookup_expression = "recipient__name"

    class Meta(VuedaModel.Meta):
        ordering = ["formatted_name"]
```

Prefix the name with `-` for descending order. To control where rows with a null `formatted_name` land, declare the term as an `F("formatted_name").asc(nulls_last=True)` expression instead, the same as for any other field (see [Filtering and Ordering Semantics](../core-concepts/filtering-and-ordering-semantics#nulls-placement-for-client-requested-ordering)).

A term may also be a scalar database function — `Lower("formatted_name")` for a case-insensitive sort, `Coalesce("formatted_name", "code")` to fall back to another column — the same as for any other field. Metadata still reports the field the function reads, so a client that sorts by it explicitly sends `?o=formatted_name` either way, and that request sorts by the column rather than the function. A list the reader has not sorted sends no ordering param at all, so the function still applies (see [Database Functions in a Default Ordering](../core-concepts/filtering-and-ordering-semantics#database-functions-in-a-default-ordering)).

A model-level ordering on a lookup-expression `formatted_name` names something that is not one of the model's own fields, which Django's `models.E015` system check would normally reject. `FormattedNameBaseModel._check_ordering` withholds that one term from the check, since `FormattedNameManager` annotates the expression onto every queryset the model builds and so makes the ordering valid by the time the query runs. Every other term in the same `Meta.ordering` is still checked as usual, so a genuinely stale field name is still reported.

The manager is what makes that suppression safe, so the suppression asks about the manager. `Meta.ordering` applies to every queryset, not only the ones a viewset builds, so the annotation has to be there too — otherwise withholding the check would trade a startup error for a `FieldError` at query time in a management command, a data migration, or an admin page. A model whose default manager doesn't inherit `FormattedNameManager` is therefore left to `models.E015`, which is right about it. `vueda_info.E009` reports the same model with a hint aimed at the manager rather than at the ordering, but only for a registered model, so it is a second opinion rather than what makes the suppression sound.

#### Replacing the default manager

Django uses the first manager declared on a model as its default, so a model that declares its own `objects` shadows `FormattedNameManager` and loses the annotation. Inherit from it rather than from `models.Manager` when a VUEDA model needs a manager of its own:

```python
from vueda.core.models import FormattedNameManager, VuedaModel


class DeliveryManager(FormattedNameManager):
    def get_queryset(self):
        return super().get_queryset().filter(archived=False)


class Delivery(VuedaModel):
    formatted_name = None
    formatted_name_lookup_expression = "recipient__name"

    objects = DeliveryManager()
```

Build on `super().get_queryset()` rather than a fresh queryset, so the annotation survives. For a manager built with `Manager.from_queryset()`, pass `FormattedNameManager` as the base: `FormattedNameManager.from_queryset(DeliveryQuerySet)`.

This only matters for models with a `formatted_name_lookup_expression` and no `formatted_name` column — the one strategy where the name has no column of its own. A model with the generated-field column, or one using `get_formatted_name()`, is unaffected either way.

A manager declared on an abstract base shadows the default manager just as readily as one declared on the model, and is the easier case to miss, since the model that names the lookup expression can be several classes away from the one that names the manager. `VUEDAUserManager` and `SentItemManager` sit on models that have no annotation to lose.

::: warning
A model that replaces its default manager without inheriting `FormattedNameManager` is back to the pre-manager behavior: evaluating a queryset from that manager raises `FieldError: Cannot resolve keyword 'formatted_name'`. Two checks report it at startup. The `models.E015` suppression above asks about the manager before withholding anything, so such a model keeps Django's own error on a `Meta.ordering` that names `formatted_name`, registered or not. `vueda_info.E009` reports the manager itself, for a registered model, with a hint aimed at fixing the manager.
:::

`Model._base_manager` is not this manager and never carries the annotation. Django builds the base manager itself, as a plain `models.Manager`, unless `Meta.base_manager_name` names one — deliberately, since the base manager is what fetches related objects and a default manager may filter them out.

Only a model whose `Meta.ordering` names `formatted_name` has to care: a base-manager queryset carrying that ordering has no annotation to sort and raises `FieldError`. Anything reached through `get()` is safe, since `get()` clears ordering — that covers `refresh_from_db` and dereferencing a foreign key — and so are `select_related` and `prefetch_related`, which order by nothing of the related model's own. What is not safe is a base-manager queryset evaluated as a whole, which is the related-object collection a cascade delete performs (`Collector.related_objects` hands back a plain `_base_manager` queryset that `Collector.collect` evaluates without clearing ordering). `dumpdata --all` reads the base manager but replaces the ordering with the primary key, so it is safe too. Set `Meta.base_manager_name = "objects"` on a model in that position to make Django use this manager for those paths too, or order by the lookup expression's own path instead of by `formatted_name`. `vueda_core.E017` reports a model that did neither. It is a model check rather than a registration check, so it reaches a model no serializer or viewset names. It asks both managers by compiling the ordering rather than by reading their classes, so a manager of your own that annotates the path passes and a `FormattedNameManager` subclass that dropped the annotation does not.

The Python-method strategy cannot be ordered by: the value is computed per object, so the database has no column to sort on, and sorting in Python would mean loading every row of the table. Ordering declared on a method-backed `formatted_name` triggers `vueda_info.E005` at startup. Switch that model to `formatted_name_lookup_expression` if the value needs to be sortable. Where the value needs a join or an aggregate that no field path reaches, back it with a database view — a `managed = False` model related by `OneToOneField` — and point `formatted_name_lookup_expression` at a real column on that view (see [Queryset annotations](../core-concepts/filtering-and-ordering-semantics#queryset-annotations)).

**Ordering and filtering by a related model's `formatted_name`.** A related model's formatted name is named the way any other related path is, and works to any depth:

```python
class CartViewSet(VuedaViewSet):
    queryset = Cart.objects.all()
    serializer_class = CartSerializer
    ordering = ["customer__formatted_name"]
    ordering_fields = ["customer__formatted_name", "customer__user__formatted_name"]


class CartFilterSet(VuedaFilterSet):
    customer_name = filters.CharFilter(field_name="customer__formatted_name", lookup_expr="icontains")

    class Meta:
        model = Cart
        fields = []
```

When `Customer` reaches its formatted name through `formatted_name_lookup_expression = "data__formatted_name"`, `customer__formatted_name` names no column the database knows: the annotation `VuedaViewSet.get_queryset` adds belongs to the `Cart` queryset, not to the `Customer` rows it joins. `VuedaOrderingFilter` rewrites the path to `customer__data__formatted_name` before the query runs, and `FormattedNamePathFilterSetMixin` does the same for a filter's `field_name`. Both VUEDA filterset bases — `VuedaFilterSet` and `VuedaCompositePrimaryKeyFilterSet` — already include that mixin, so `CartFilterSet` above needs nothing extra; a filterset built on django-filter's `FilterSet` directly has to mix it in itself, ahead of the `FilterSet` base (see [The filterset half of the rewrite](../core-concepts/filtering-and-ordering-semantics#the-filterset-half-of-the-rewrite)). Clients keep using the declared name — it is what `?o=` takes, what `model_ordering` and `model_filtering` report, and what a generated filter label is built from. The resolved path is server-side only and is not accepted as a query parameter.

Two shapes are refused rather than rewritten, left out of the metadata, and reported by `vueda_info.E006`: a related `formatted_name` that a `get_formatted_name()` method computes (no column exists behind it at any depth), and a path that reaches the related model through a reverse foreign key or many-to-many, which would join a row per related object and multiply the rows a list request returns.

::: warning
This applies to a viewset's `ordering` and `ordering_fields`, to `?o=`, and to filters — not to a model's `Meta.ordering`, which applies to every queryset including ones no filter backend touches. `ordering = ["customer__formatted_name"]` in a model's `Meta` is still rejected by Django's `models.E015`; only the model's own un-prefixed `formatted_name` is withheld from that check.
:::

**Models that cannot inherit `VuedaModel`.** Django's built-in `Group`, `Permission`, and `ContentType` do not inherit from `VuedaModel`, but VUEDA patches them in `InfoConfig.ready()` so they work correctly as expandable fields without any action on your part. `Group` and `Permission` receive `formatted_name_lookup_expression = "name"`. `ContentType` receives a `get_formatted_name()` method that returns `app_labeled_name` (the `"app_label | verbose_name"` display string).

If you have a third-party model that cannot inherit `VuedaModel` but needs to participate in VUEDA's expand and formatted-name system, apply the same pattern in your own `AppConfig.ready()`: set `formatted_name_lookup_expression` to a field path string, or assign a `get_formatted_name` method that returns a string. Then add `_has_formatted_name_field` as a classmethod that returns truthy, and `_get_formatted_name` as an instance method that reads the annotated `formatted_name` attribute when present and falls back to `get_formatted_name()` or `lookup_field`. The `FormattedNameBaseModel` source is the reference implementation for both.

To name a lookup-expression `formatted_name` in such a model's `Meta.ordering`, assign `FormattedNameBaseModel._check_ordering` as well — without it, `models.E015` reports the term — and give the model a `FormattedNameManager` (or a subclass) as its default manager, so the annotation the withheld check assumes is actually there on every queryset.

## Serializer Contract

The {@term Canonical Serializer} defines the field schema that the metadata API exposes to the client. Every field the client can see, validate against, or submit comes from this serializer definition. Extend `VuedaSerializer`.

`VuedaSerializer` declares `formatted_name` and `available_actions` as base fields. Both are read-only. The serializer's `Meta.fields` list must include all fields that should appear in the metadata surface; if a field exists on the Django model but is not listed in the serializer's `fields`, it will not appear in model-info and the client will not know it exists. See [Server-Client Metadata Contract](../core-concepts/server-client-metadata-contract) for the full mapping from serializer definitions to metadata sections.

When the model uses the `get_formatted_name()` method pattern (the fourth strategy described above), the serializer must explicitly declare `formatted_name = serializers.SerializerMethodField()` and provide a corresponding `get_formatted_name(self, obj)` method. Without this declaration, `formatted_name` will be omitted from API responses and choice label rendering on the client will break.

A typical serializer definition extends the base `Meta.fields` list with the model's own fields:

```python
from vueda.core.serializers import VuedaSerializer
from .models import Widget

class WidgetSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = Widget
        fields = [
            "id",
            "name",
            "description",
            "status",
        ] + VuedaSerializer.Meta.fields
```

The serializer also serves as the source for `expandable_fields` metadata. If your model has foreign key or many-to-many relationships that should be expandable in the API, declare them in `Meta.expandable_fields` following the `rest_flex_fields` tuple syntax.

The `NoExtraFieldsSerializerMixin` (which `VuedaSerializer` includes) rejects unknown fields on input. Submitting a field name that is not in the serializer's declared fields will produce a validation error. This strictness is intentional; it prevents silent data loss from typos and keeps the serializer definition authoritative.

## ViewSet Contract

The viewset defines the actions, filtering, ordering, and permission behavior for the model's API endpoints. Extend `VuedaViewSet`. It carries the history endpoint for every model that records history, so no history-specific base class exists. At minimum, set `queryset`, `serializer_class`, and the fields you want to support for ordering:

```python
from vueda.core.viewsets import VuedaViewSet
from .models import Widget
from .serializers import WidgetSerializer
from .filtersets import WidgetFilterSet

class WidgetViewSet(VuedaViewSet):
    queryset = Widget.objects.all()
    serializer_class = WidgetSerializer
    filterset_class = WidgetFilterSet
    ordering_fields = ["name", "status"]
```

Set a default sort order with the viewset's `ordering` attribute (or the model's `Meta.ordering`), never with an `order_by()` on the `queryset` attribute or inside `get_queryset`. Model-info reads the declarations, not the code, so an `order_by()` applied in code sorts the rows without being described — and `model_ordering.default` then advertises a different order to every client. See [Filtering and Ordering Semantics](../core-concepts/filtering-and-ordering-semantics#metadata-projection-for-ordering-and-filtering).

`VuedaViewSet` inherits from DRF's `ModelViewSet` and adds several framework behaviors. `ListRowLevelViewSetMixin` applies row-level permission filtering on `list` queries. `NoExtraFieldsForViewSetMixin` validates query parameters against the filterset and rejects unknown parameters. `FlexFieldsMixin` provides expand-aware serializer context. Together these mixins ensure that the viewset's behavior is consistent with what the metadata API advertises.

The viewset provides all five standard CRUDL actions by default: `list`, `create`, `retrieve`, `update` (including `partial_update`), and `destroy`. The `destroy` action supports both single-object deletion (via `DELETE` to the `detail` endpoint with a PK in the URL) and bulk deletion (via `DELETE` to the `list` endpoint with a `{"pks": [...]}` payload). Bulk destroy validates that all requested PKs exist before deleting any of them, and supports an optional dry-run mode via the `X-Dry-Run` header.

::: warning
`VuedaViewSet` does not wrap its own CRUDL handlers in `transaction.atomic` by default. If you need atomic write behavior, use `AtomicModelViewSetMixin` or manage transaction boundaries explicitly in your viewset. The web process's `ATOMIC_REQUESTS` setting provides request-level atomicity as a safety net, but explicit transaction control is appropriate when the viewset needs finer-grained boundaries.
:::

Extra actions beyond the standard CRUDL set are defined using the `@action` decorator from `vueda.core.decorators`. Only add extra actions when you need distinct route or permission behavior that the standard actions do not cover. Extra actions appear in model-info's action list and are gated by `get_allowed_extra_actions` on the viewset.

## Router and URL Wiring

Register the viewset with a `VuedaRouter` instance. The router generates URL patterns that follow VUEDA's conventions; including the app-label-qualified route names that the metadata API depends on for action resolution.

```python
from vueda.core.routers import VuedaRouter
from .viewsets import WidgetViewSet

router = VuedaRouter()
router.register("widgets", WidgetViewSet)

urlpatterns = router.urls
```

`VuedaRouter` extends DRF's `SimpleRouter` with two changes. It includes the app label in route names to prevent naming collisions between apps that happen to have models with the same name. It also maps `DELETE` on the `list` route to the viewset's `destroy` method, which is what enables the bulk-delete behavior described above.

Include the router's URL patterns in the project's URL configuration, under the appropriate route prefix. The standard pattern is to include app-level URL modules within a top-level `routes/` path that also includes `vueda.info.urls` and other framework URL modules:

```python
urlpatterns = [
    path("routes/", include([
        path("myapp/", include("myapp.urls")),
        path("", include("vueda.info.urls")),
        # ... other app and framework URLs
    ])),
]
```

## Model-Info Registration

Registration is the act that makes the model visible to the metadata API and, through it, to the client. Without registration, a model with a perfectly defined serializer, viewset, and router will simply not exist from the client's perspective. See [Canonical Registration and Model Discovery](../core-concepts/canonical-registration-and-discovery) for the full explanation of registration states and their implications.

Register the model in your app's `AppConfig.ready()` method by calling `register` with the canonical serializer and viewset:

```python
from django.apps import AppConfig
from vueda.info import register

class MyAppConfig(AppConfig):
    name = "myapp"

    def ready(self):
        from .serializers import WidgetSerializer
        from .viewsets import WidgetViewSet

        register(WidgetSerializer, WidgetViewSet)
```

The imports are inside `ready()` deliberately. Registration resolves content types internally, which requires the Django app registry, content type framework, and all dependent models to be fully initialized. Performing registration at import time or module scope risks content-type resolution errors and import-ordering failures.

The `register` function accepts the serializer as the first argument and the viewset as the second. It can also be used as a decorator on the viewset class, with just the serializer as the argument. Both styles produce the same result; a fully registered model that appears in model-info with complete metadata: fields, actions, filters, ordering, and permissions.

Calling `register_serializer` instead of `register` produces a {@term Serializer-Only Registration}. The model will appear in model-info with field schema and permission metadata but without action, filter, or ordering metadata. This is appropriate for models that are referenced through expands but do not need their own CRUDL surface. It is not sufficient for a full CRUDL surface; the client cannot generate routes or forms for a model that lacks action metadata.

## Client Route Wiring

On the client side, `makeCRUDRoutes` generates the two route records that handle all CRUDL navigation for all registered models: a `detail` route (`/:app/:model/:action/:pk`) and a `list` route (`/:app/:model/:action/`). Both routes share a guard chain that loads model-info before allowing navigation and verifies that the requested action is present in the computed allowlist. See [Routing and View Resolution Model](../core-concepts/routing-and-view-resolution-model) for the full explanation of how route gating and view resolution work.

In the project's router setup, call `makeCRUDRoutes` and add the returned routes to the router:

```javascript
import { makeCRUDRoutes } from "@vueda/router/makeCrud.js";
import ViewActionRouter from "@vueda/views/ViewActionRouter.vue";

const crudRoutes = makeCRUDRoutes({
    component: ViewActionRouter,
    actionRedirect: { name: "not-found" },
    authRedirect: { name: "login" },
    vueApp: app,
    router,
    pinia,
});
router.addRoute(crudRoutes[0]);
router.addRoute(crudRoutes[1]);
```

The `actionRedirect` parameter is required. It specifies the route the guard should redirect to when a model or action is not found. If `actionRedirect` is falsy, `makeCRUDRoutes` throws at router build time; this is a hard error, not a runtime guard failure. The redirect target must not itself be gated by `requireModelInfo`, or you will produce a redirect loop.

The `requireModelInfo` guard computes its allowlist by intersecting server-advertised actions from model-info, any `routeActions` restrictions from client model-config, and workflow transition codes. This is the {@term Route Admission} check. The guard normalizes action names through a static action-map utility. The server uses `retrieve` and `partial_update`, while the client uses `read` and `update` in route paths. This normalization is automatic; you do not need to manually translate between naming conventions when defining routes.

Once routes are wired, the `ViewActionRouter` component handles runtime view resolution. It selects the concrete view component based on the action parameter: built-in CRUDL components for standard actions (`list`, `create`, `read`, `update`), or dynamically imported project-level components for custom actions. No per-model client code is needed for standard CRUDL surfaces.

After the baseline CRUDL surface is working, view behavior can be customized through model config without forking core components. See [Configure CRUDL Views](./configure-crud-views) for the configuration API.

## Verification Checklist

With all pieces in place, verify the surface end-to-end:

- The model appears in the model-info `list` endpoint (`GET /vueda.info/model_info/`) and returns complete metadata from the `detail` endpoint (`GET /vueda.info/model_info/{app_label}/{model}/`), including `model_fields`, `model_actions`, `model_filtering`, and `model_ordering`.
- The `list` endpoint returns paginated results and respects filter and ordering query parameters.
- The `detail` endpoint returns a single object with an `available_actions` field reflecting the requesting user's permissions.
- Create, update, and partial-update succeed with valid payloads and reject unknown fields with validation errors.
- Single-object delete and bulk delete (via `{"pks": [...]}` payload) both succeed. Bulk delete with missing PKs returns a validation error identifying which PKs were not found.
- Dry-run delete (with the `X-Dry-Run: true` header) returns 200 without deleting.
- Client navigation to `/:app/:model/list/` loads model-info, renders the `list` view, and displays data.
- Client navigation to `/:app/:model/read/:pk` renders the `read` view for a specific object.
- Client navigation to `/:app/:model/create/` renders the `create` form. Submission redirects to the appropriate view.
- Client navigation to `/:app/:model/update/:pk` renders the `update` form. Submission redirects to the appropriate view.
- Navigating to an action the user lacks permission for produces an "Action Not Found" toast and redirects to the `actionRedirect` target.

## Troubleshooting

**Model does not appear in model-info.** The most common cause is a missing `register()` call. Verify that the app's `AppConfig.ready()` method calls `register` with both the serializer and viewset. A `register_serializer`-only registration produces metadata without actions, which is not sufficient for a CRUDL surface.

**Model appears in model-info but client routes are blocked.** The `requireModelInfo` guard blocks navigation when it cannot find the requested action in the allowlist. Check that the model-info response includes the expected actions in `model_actions`. If actions are missing, the requesting user may lack the necessary permissions; `model_actions` is permission-filtered per user.

**Choice dropdowns show no labels or endpoint returns 500.** This is typically a `formatted_name` configuration error. A system check (`vueda_info.E001`) catches the most common cause — `formatted_name = None` without an alternative — at startup, so the root cause should be visible in server output before any requests are served. If the server starts cleanly but choice labels are missing, verify that `get_formatted_name()` is a plain method (not a `@property`, which triggers `vueda_info.E003`) and that only one of `formatted_name_lookup_expression` or `get_formatted_name()` is provided (both at once triggers `vueda_info.E002`). If using `get_formatted_name()`, the serializer must also declare `formatted_name = serializers.SerializerMethodField()`.

**Client shows "Action Not Found" for a valid action.** The client normalizes route action names through a static action map; for example, `read` maps to `retrieve`. If `routeActions` in client model-config is configured using client-side names (like `read`) instead of canonical server names (like `retrieve`), the guard filtering may exclude actions that should be present.

**`list` endpoint returns 400 on invalid filter queries.** `NoExtraFieldsForViewSetMixin` validates query parameters against the filterset class. A query parameter that does not match any declared filter or recognized framework parameter (pagination, ordering, expand, fields) will produce a field-keyed 400 response listing valid filters. Verify that the filterset declares filters for all parameters the client sends.

**Duplicate registration error at startup.** The canonical serializer is unique per model. If two apps attempt to register different serializers for the same model, the second registration raises a `ValueError`. Consolidate registration to a single app.

**Bulk delete rejects valid PKs.** Bulk destroy validates that every PK in the `pks` array exists in the queryset after row-level and object-level permission filtering. If the requesting user lacks `delete` permission for some of the objects, those objects are filtered out and the count mismatch triggers a validation error. The error message reports which PKs were "not found"; from the user's perspective they may not exist, even though the objects are in the database.

## Relevant Implementation Surface

- Python:
    - {@api py:class:vueda.core.models.VuedaModel}
    - {@api py:class:vueda.core.models.BaseModelMeta}
    - {@api py:class:vueda.core.serializers.VuedaSerializer}
    - {@api py:class:vueda.core.viewsets.VuedaViewSet}
    - {@api py:class:vueda.core.filters.VuedaFilterSet}
    - {@api py:class:vueda.core.filters.FormattedNamePathFilterSetMixin}
    - {@api py:class:vueda.core.routers.VuedaRouter}
    - {@api py:function:vueda.info.registration.register}
    - {@api py:class:vueda.core.serializers.VuedaListSerializer}
    - {@api py:class:vueda.core.serializers.PrimaryKeyListSerializer}
- REST:
    - {@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}
    - {@api rest:endpoint:GET:/vueda.info/model_info_choices/{app_label}/{model}/{field}/}
    - {@api rest:endpoint:GET:/vueda.info/model_info_filter_choices/{app_label}/{model}/{field}/}
- JavaScript:
    - {@api js:function:@arrai-innovations/vueda/router/makeCrud#makeCRUDRoutes}
    - {@api js:function:@arrai-innovations/vueda/router/guards#requireModelInfo}
    - {@api js:function:@arrai-innovations/vueda/router/routerComponent#setCrudComponents}
    - {@api js:module:@arrai-innovations/vueda/stores/storeModelInfo}
    - {@api js:module:@arrai-innovations/vueda/stores/storeModelConfig}
    - {@api js:function:@arrai-innovations/vueda/router/getCrud#getCRUDForTo}
- Vue.js Components:
    - {@api vue:component:ViewActionRouter}
