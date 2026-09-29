---
title: Create a CRUD Surface for a New Model
type: how-to
audience: integrator
status: draft
---

# Create a CRUD Surface for a New Model

This guide builds a {@term CRUD} surface for a new Django model. It covers the REST endpoints, the {@term Model Info} registration, the client routes, and the permissions. When you finish, VUEDA's default views list, create, read, update, and delete the model's rows with no per-model client code. [Configure CRUD Views](./configure-crud-views.md) covers changing those views for the models that need it.

The examples use a `Widget` model in an app with the label `myapp`.

## Before You Begin

- The model's app is in `INSTALLED_APPS` and has an `AppConfig`.
- The root URLconf includes `vueda.info.urls` under a `routes/` path. A project generated from the VUEDA template already does.
- The client is set up as [Client Plugin Prerequisites](./client-plugin-prerequisites.md) describes.

## Define the Model

Extend {@api py:class:vueda.core.models.VuedaModel}:

```python
from django.db import models

from vueda.core.models import VuedaModel


class Widget(VuedaModel):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20)
```

`VuedaModel` makes `Widget` a {@term VUEDA Model}. It gives the model a {@term Formatted Name} and the five CRUD permission codenames from [`BaseModelMeta.default_permissions`]{@api py:property:vueda.core.models.BaseModelMeta.default_permissions}. [Permission Model](../core-concepts/permission-model.md#crud-codename-and-action-mapping) describes how those codenames are named.

Run `python manage.py makemigrations` and `python manage.py migrate`. The migration creates the table, and `migrate` creates the permissions.

## The `formatted_name` Contract

VUEDA shows a row by its `formatted_name` wherever the client needs a label for it, such as a choice list or an expanded relation. By default `formatted_name` is a stored {@api ext:django:django.db.models.GeneratedField} that copies the model's `name` field, so `Widget` needs nothing more.

A model without a suitable `name` field supplies the value in one of three other ways.

**Another generated expression.** Redeclare the field with your own expression:

```python
from django.db.models.functions import Cast


class Order(VuedaModel):
    order_number = models.IntegerField()

    formatted_name = models.GeneratedField(
        expression=Cast("order_number", output_field=models.CharField()),
        output_field=models.CharField(),
        db_persist=True,
    )
```

**A lookup expression.** Set `formatted_name = None` and name a column in [`formatted_name_lookup_expression`]{@api py:property:vueda.core.models.FormattedNameBaseModel.formatted_name_lookup_expression}:

```python
class Delivery(VuedaModel):
    recipient = models.ForeignKey(Recipient, on_delete=models.PROTECT)

    formatted_name = None
    formatted_name_lookup_expression = "recipient__name"
```

{@api py:class:vueda.core.models.FormattedNameManager}, the default manager, annotates that path as `formatted_name` on every queryset that the model builds. Every segment must be a database field, and every relation that it crosses must be single-valued: a forward foreign key or a one-to-one. A path can end at another model's `formatted_name` only when that model stores it as a column.

**A Python method.** Set `formatted_name = None` and define `get_formatted_name()`. When the method reads through relations, list them in [`formatted_name_select_related`]{@api py:property:vueda.core.models.FormattedNameBaseModel.formatted_name_select_related}. Bulk queries then join them, with no extra query per row:

```python
class Cart(VuedaModel):
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT)

    formatted_name = None
    formatted_name_select_related = ("customer__user",)

    def get_formatted_name(self):
        return self.customer.user.email
```

A method-backed model's serializer also needs a field declaration, which [Define the Serializer](#define-the-serializer) shows.

A choice list takes each label from the first source that the related model provides. The order is `get_formatted_name()`, then the column that `formatted_name_lookup_expression` names, then the `formatted_name` column. {@api py:class:vueda.info.viewsets.ModelInfoChoicesViewSet} describes the choice endpoint.

The database can sort by a generated field or a lookup expression. It cannot sort by a method. [Filtering and Ordering Semantics](../core-concepts/filtering-and-ordering-semantics.md#formatted-name-as-an-ordering-and-filter-target) describes ordering and filtering by `formatted_name`, and [Declare List Ordering](./declare-list-ordering.md) gives the steps.

Run `python manage.py check`. [`check_formatted_name_configuration`]{@api py:function:vueda.info.checks.check_formatted_name_configuration} reports a formatted name that cannot resolve, such as `formatted_name = None` with neither a lookup expression nor a method (`vueda_info.E001`). It checks registered models and the models that their expands reach.

### Replace the Default Manager

This applies only to a model with a lookup expression. Django uses the first manager that a model declares as its default, so a model that declares its own `objects` loses the `formatted_name` annotation. Subclass `FormattedNameManager` instead of {@api ext:django:django.db.models.Manager}:

```python
from vueda.core.models import FormattedNameManager


class DeliveryManager(FormattedNameManager):
    def get_queryset(self):
        return super().get_queryset().filter(archived=False)


class Delivery(VuedaModel):
    # ...
    objects = DeliveryManager()
```

For a manager built with `Manager.from_queryset()`, call `FormattedNameManager.from_queryset()`. `vueda_info.E009` reports a model whose default manager does not annotate the path. The `FormattedNameManager` reference covers managers on abstract bases and Django's base manager.

### Django's Built-In Models

VUEDA gives Django's `Group` and `Permission` a lookup expression on `name`, and `ContentType` a method that returns its `app_labeled_name`. They work as expanded relations with no action from you. A third-party model that you cannot subclass has no public way to supply a formatted name.

## Define the Serializer

Extend {@api py:class:vueda.core.serializers.VuedaSerializer} and add the base fields to your own:

```python
from vueda.core.serializers import VuedaSerializer

from .models import Widget


class WidgetSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = Widget
        fields = ["id", "name", "description", "status"] + VuedaSerializer.Meta.fields
```

This becomes the model's {@term Canonical Serializer}. Model info lists only the fields in `Meta.fields`, so a model field that you leave out does not exist for the client. The base fields are:

- `formatted_name`, read-only.
- [`available_actions`]{@api py:property:vueda.core.serializers.VuedaSerializer.available_actions}, present only when a request's {@term Sparse Fields} name it.
- `object_revision`, only for a model that records {@term Model History}.

For a model whose `formatted_name` comes from `get_formatted_name()`, declare the field as a {@api ext:drf:rest_framework.fields.SerializerMethodField}. Without the declaration, responses carry `formatted_name: null`:

```python
from rest_framework import serializers


class CartSerializer(VuedaSerializer):
    formatted_name = serializers.SerializerMethodField()

    class Meta(VuedaSerializer.Meta):
        model = Cart
        fields = ["id", "customer"] + VuedaSerializer.Meta.fields
```

`VuedaSerializer` already supplies the matching `get_formatted_name(self, obj)`.

A write that sends a field that the serializer does not declare fails validation. To let clients load related objects inline, declare them in `Meta.expandable_fields`, as [Field and Expand Semantics](../core-concepts/field-and-expand-semantics.md) describes.

## Define the Viewset

Extend {@api py:class:vueda.core.viewsets.VuedaViewSet}:

```python
from vueda.core.viewsets import VuedaViewSet

from .models import Widget
from .serializers import WidgetSerializer


class WidgetViewSet(VuedaViewSet):
    queryset = Widget.objects.all()
    serializer_class = WidgetSerializer
    ordering = ["name"]
    ordering_fields = ["name", "status"]
```

This becomes the model's {@term Canonical Viewset}. It serves `list`, `create`, `retrieve`, `update`, `partial_update`, and `destroy`.

Declare the default order in `ordering`, and do not call `order_by()` on the queryset. [Declare List Ordering](./declare-list-ordering.md) explains why.

To offer filters, set `filterset_class` to a {@api py:class:vueda.core.filters.VuedaFilterSet} subclass. The `list` endpoint works without one. Either way, it rejects any query parameter that it does not recognize, as [Filtering and Ordering Semantics](../core-concepts/filtering-and-ordering-semantics.md#query-namespace-and-validation-boundary) describes.

`destroy` deletes one row through `DELETE` on the detail URL, or several through `DELETE` on the list URL with a `{"pks": [...]}` body. A bulk delete deletes nothing unless every key names a row that the user may delete. Both forms honor the `Dry-Run: true` header, a {@term Dry Run} that checks the delete and keeps the row. [Action Contract and Availability](../core-concepts/action-contract-and-availability.md#dry-run-and-mutation-semantics) describes which requests honor it.

Each request runs in one database transaction, as [Request Transactions](../core-concepts/configuration-surface-and-defaults.md#request-transactions) describes.

To add an action beyond these, declare an {@term Extra Action} with VUEDA's {@api py:function:vueda.core.decorators.action}. [Action Contract and Availability](../core-concepts/action-contract-and-availability.md#server-action-declaration-and-route-partitioning) describes how to declare it and who sees it.

## Router and URL Wiring

The client requests every model at its {@term Model API Path}, `/routes/<app_label>/<model_name>/`. The two names are the model's `_meta.app_label` and `_meta.model_name`, so `Widget` in `myapp` is served at `/routes/myapp/widget/`.

Register the viewset with a {@api py:class:vueda.core.routers.VuedaRouter} under the model name:

```python
# myapp/urls.py
from vueda.core.routers import VuedaRouter

from .viewsets import WidgetViewSet


router = VuedaRouter()
router.register("widget", WidgetViewSet)

urlpatterns = router.urls
```

Mount the app's URL module at `<app_label>/` under `routes/`, beside `vueda.info.urls`:

```python
from django.urls import include, path


urlpatterns = [
    path(
        "routes/",
        include(
            [
                path("", include("vueda.info.urls")),
                path("myapp/", include("myapp.urls")),
            ]
        ),
    ),
]
```

A project generated from the VUEDA template includes `<python_package>.urls` at `""` under `routes/`. Add the `path("myapp/", include("myapp.urls"))` line to that module's `urlpatterns`, and leave `config/urls.py` unchanged.

`VuedaRouter` also routes `DELETE` on the list URL to `destroy`, and serves each {@term Bulk Action} at the list URL.

To serve models at another path, change the client's URL templates with {@api js:function:@arrai-innovations/vueda/utils/urls#setCustomUrl}.

## Model-Info Registration

Register the serializer and viewset in the app's {@api ext:django:django.apps.AppConfig.ready}:

```python
from django.apps import AppConfig


class MyAppConfig(AppConfig):
    name = "myapp"

    def ready(self):
        from vueda.info.registration import register

        from .serializers import WidgetSerializer
        from .viewsets import WidgetViewSet

        register(WidgetSerializer, WidgetViewSet)
```

Keep the imports inside `ready()`. The serializer and viewset modules import models, which Django cannot load while it is still importing the `apps` module.

Calling {@api py:function:vueda.info.registration.register} with a viewset makes a {@term Canonical Registration}. The viewset gives the model its actions, filters, and ordering. A {@term Serializer-Only Registration} has no actions, so the client blocks every route to the model. [Canonical Registration and Model Discovery](../core-concepts/canonical-registration-and-discovery.md) describes both states.

## Wire the Client Routes

A project generated from the VUEDA template already registers the {@term CRUD Routes} and a `not-found` route. Skip to [Grant Permissions](#grant-permissions).

In a client you set up yourself, add the routes that {@api js:function:@arrai-innovations/vueda/router/makeCrud#makeCRUDRoutes} returns, and a route for failed navigations:

```javascript
import { makeCRUDRoutes } from "@vueda/router/makeCrud.js";

const routes = [
    ...makeCRUDRoutes({
        component: async () => (await import("@vueda/views/ViewActionRouter.vue")).default,
        actionRedirect: { name: "not-found" },
        vueApp: app,
        router,
        pinia,
    }),
    {
        path: "/:pathMatch(.*)*",
        name: "not-found",
        component: async () => (await import("@vueda/views/ViewNotFound.vue")).default,
    },
];

for (const route of routes) {
    router.addRoute(route);
}
```

[`actionRedirect`]{@api js:param:@arrai-innovations/vueda/router/makeCrud#makeCRUDRoutes:params.actionRedirect} is required, and must name a route outside the CRUD routes. To require sign-in, also pass [`authRedirect`]{@api js:param:@arrai-innovations/vueda/router/makeCrud#makeCRUDRoutes:params.authRedirect} with your sign-in route.

A route opens only when its action is one of the user's {@term Model Actions}. [Routing and View Resolution Model](../core-concepts/routing-and-view-resolution-model.md#route-guard-chain) describes this {@term Route Admission} check. It also describes the route segment `read`, which stands for the `retrieve` action, and how {@api vue:component:ViewActionRouter} picks each view.

## Grant Permissions

Model info filters `model_actions` by the requesting user's permissions, and the client guard admits only listed actions. A user without grants sees "Action Not Found" on every route.

Grant `myapp.list_widget`, `myapp.read_widget`, `myapp.create_widget`, `myapp.update_widget`, and `myapp.delete_widget` to a group, then add your test user to that group. Use the group management page described in [Manage Groups and Generate Group Migrations](./manage-groups.md), or run this in `python manage.py shell`:

```python
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission

group, _ = Group.objects.get_or_create(name="Widget Editors")
group.permissions.add(*Permission.objects.filter(
    content_type__app_label="myapp",
    codename__in=["list_widget", "read_widget", "create_widget", "update_widget", "delete_widget"],
))
get_user_model().objects.get(email="tester@example.com").groups.add(group)
```

Test with this user, not a superuser. A superuser passes every check, so testing as one hides missing grants.

## Check the Result

Sign in as the test user and check each piece:

- {@api rest:endpoint:GET:/vueda.info/model_info/} at `/routes/vueda.info/model_info/` lists `myapp.widget`.
- {@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/} at `/routes/vueda.info/model_info/myapp/widget/` returns `model_fields`, `model_actions`, `model_filtering`, and `model_ordering`.
- `GET /routes/myapp/widget/` returns a page of rows.
- `GET /routes/myapp/widget/<pk>/?f=id,available_actions` returns the actions that the user may take on that row.
- A `DELETE` with the `Dry-Run: true` header returns `200` and leaves the row in place.
- `/myapp/widget/list/` in the client shows the list.
- `/myapp/widget/create/` shows the create form. After a save, it opens the new row's update view.
- `/myapp/widget/update/<pk>` shows the update form. After a save, it stays on the page. [Configure CRUD Views](./configure-crud-views.md#choose-the-redirect-after-a-save) describes how to change where each view goes.
- `/myapp/widget/read/<pk>` shows the row.

## Troubleshooting

**The model is missing from model info.** Check that the app's `ready()` calls `register` with both the serializer and the viewset.

**The list view shows a `404` error.** The server does not serve the model API path. Check the router prefix and where the app's URL module is mounted, as [Router and URL Wiring](#router-and-url-wiring) describes.

**Every route shows "Action Not Found".** The user lacks the model's permissions, so `model_actions` is empty. Grant them as [Grant Permissions](#grant-permissions) describes. If the model config sets `routeActions`, check that it uses `retrieve` for the read route, as [Configure CRUD Views](./configure-crud-views.md#limit-which-routes-open) describes.

**Rows show no label.** A method-backed model's serializer lacks `formatted_name = serializers.SerializerMethodField()`, so `formatted_name` is `null`.

**The `list` endpoint returns `400`.** A request sent a query parameter that the endpoint does not accept. The response names the accepted filters.

**Startup fails with `is already registered`.** Two apps register the same model. Each model has one registration, so remove one of the calls.

**A bulk delete reports existing rows as missing.** The bulk delete checks each key after it excludes the rows that the user may not delete. It reports a key that the user cannot delete as not existing.
