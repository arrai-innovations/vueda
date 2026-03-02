---
title: Create a CRUDL Surface for a New Model
type: how-to
audience: implementor
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

**Null field with a lookup expression.** Set `formatted_name = None` on the model and define `formatted_name_lookup_expression` as a string pointing to an alternate field path (e.g., `"data__formatted_name"`). Choice endpoints will use this expression to annotate the queryset when resolving labels.

**Null field with a Python method.** Set `formatted_name = None` on the model and implement a `get_formatted_name()` method for runtime computation. This is the most flexible option but requires explicit wiring in the serializer (covered in the next section). Choice endpoints resolve labels using a priority order: `get_formatted_name()` method, then `formatted_name_lookup_expression` annotation, then the direct `formatted_name` field, then static field choices.

Setting `formatted_name = None` without providing either `formatted_name_lookup_expression` or `get_formatted_name()` will cause choice endpoints to fail with a 500 error when they attempt to annotate a non-existent field.

## Serializer Contract

The {@term Canonical Serializer} defines the field schema that the metadata API exposes to the client. Every field the client can see, validate against, or submit comes from this serializer definition. Extend `VuedaSerializer` for standard models or `VuedaHistorySerializer` for models that use the audit history system.

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

The viewset defines the actions, filtering, ordering, and permission behavior for the model's API endpoints. Extend `VuedaViewSet` for standard models or `VuedaHistoryViewSet` for models that include audit history. At minimum, set `queryset`, `serializer_class`, and the fields you want to support for ordering:

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

`VuedaViewSet` inherits from DRF's `ModelViewSet` and adds several framework behaviors. `ListRowLevelViewSetMixin` applies row-level permission filtering on `list` queries. `NoExtraFieldsForViewSetMixin` validates query parameters against the filterset and rejects unknown parameters. `FlexFieldsMixin` provides expand-aware serializer context. Together these mixins ensure that the viewset's behavior is consistent with what the metadata API advertises.

The viewset provides all five standard CRUDL actions by default: `list`, `create`, `retrieve`, `update` (including `partial_update`), and `destroy`. The `destroy` action supports both single-object deletion (via `DELETE` to the `detail` endpoint with a PK in the URL) and bulk deletion (via `DELETE` to the `list` endpoint with a `{"pks": [...]}` payload). Bulk destroy validates that all requested PKs exist before deleting any of them, and supports an optional dry-run mode via the `X-Dry-Run` header.

Note that `VuedaViewSet` does not wrap its own CRUDL handlers in `transaction.atomic` by default. If you need atomic write behavior, use `AtomicModelViewSetMixin` or manage transaction boundaries explicitly in your viewset. The web process's `ATOMIC_REQUESTS` setting provides request-level atomicity as a safety net, but explicit transaction control is appropriate when the viewset needs finer-grained boundaries.

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

**Choice dropdowns show no labels or endpoint returns 500.** This is typically a `formatted_name` configuration error. If the model sets `formatted_name = None`, it must provide either `formatted_name_lookup_expression` or a `get_formatted_name()` method. If using `get_formatted_name()`, the serializer must also declare `formatted_name = serializers.SerializerMethodField()`.

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
    - {@api py:class:vueda.core.routers.VuedaRouter}
    - {@api py:function:vueda.info.registration.register}
    - {@api py:class:vueda.core.serializers.PrimaryKeyListSerializer}
- REST:
    - {@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}
    - {@api rest:endpoint:GET:/vueda.info/model_info_choices/{app_label}/{model}/{field}/}
    - {@api rest:endpoint:GET:/vueda.info/model_info_filter_choices/{app_label}/{model}/{field}/}
- JavaScript:
    - {@api js:function:@arrai-innovations/vueda.router/makeCrud.makeCRUDRoutes}
    - {@api js:function:@arrai-innovations/vueda.router/guards.requireModelInfo}
    - {@api js:function:@arrai-innovations/vueda.router/routerComponent.setCrudComponents}
    - {@api js:module:@arrai-innovations/vueda.stores/storeModelInfo}
    - {@api js:module:@arrai-innovations/vueda.stores/storeModelConfig}
    - {@api js:function:@arrai-innovations/vueda.router/getCrud.getCRUDForTo}
- Vue.js Components:
    - {@api vue:component:ViewActionRouter}
