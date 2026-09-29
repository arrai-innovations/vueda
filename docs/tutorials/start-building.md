---
audience: integrator
status: draft
type: tutorial
---

# Start Building

In this tutorial we generate a VUEDA project from a template, add an inventory app to its Django server, and open the inventory in its Vue client. By the end, you sign in to the client and list, create, read, and update products through VUEDA's built-in views.

The tutorial starts from a new project. It gives no steps for adding VUEDA to an existing Django or Vue project.

For a more complete example, try [Widget Warehouse](https://www.widgetwarehouse.com/), a VUEDA application with inventory, purchasing workflows, and custom dashboards. Its [repository](https://github.com/arrai-innovations/widget-warehouse) includes the source and a guided walkthrough.

## Prerequisites

- [Python 3.11+](https://www.python.org/downloads/): for running the VUEDA Server
- [Node.js 22+](https://nodejs.org/en/download/): for running the VUEDA Client
- A [PostgreSQL](https://www.postgresql.org/) database: for hosting your application data
- A [Redis](https://redis.io/) server: for the cache that holds sign-in sessions (or use the database cache instead; see [Configure Local Settings](#configure-local-settings))
- [Git](https://git-scm.com/): for version control
- [Copier](https://copier.readthedocs.io/): for scaffolding from the project templates
- [uv](https://docs.astral.sh/uv/): for Python dependency management
- [pnpm](https://pnpm.io/): for Node.js dependency management

### Optional

- [just](https://just.systems/man/en/introduction.html): for common developer CLI tooling (included in the DX template)

::: tip
Run the server under an ASGI server instead of Django's `runserver`. The DX template's `just serve` runs gunicorn with uvicorn workers, the same setup as production. VUEDA's planned websocket support will also need ASGI. Both templates already depend on `gunicorn` and `uvicorn`. With the minimal template, run this from `server/`: `uv run gunicorn config.asgi -k uvicorn.workers.UvicornWorker --reload --bind localhost:8000`.
:::

### What you need to know

The VUEDA docs assume you can already build with these tools. They explain what VUEDA adds and link the upstream docs for the rest.

- [Python](https://docs.python.org/3/tutorial/): modules, classes, and virtual environments
- [Django](https://docs.djangoproject.com/en/stable/intro/): apps, models, migrations, and settings
- [Django REST framework](https://www.django-rest-framework.org/tutorial/quickstart/): serializers, viewsets, routers, and permissions
- [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide): ES modules, promises, and `async` / `await`
- [Vue](https://vuejs.org/guide/introduction): single-file components, props, slots, and the Composition API

## Environment Setup

The commands in this tutorial are for a [bash](https://www.gnu.org/software/bash/)-like shell, such as the shell on Linux, macOS, or WSL2. In PowerShell or cmd.exe, adapt them to that shell.

### Package Registry Access

VUEDA is available from [public PyPI](https://pypi.org/project/vueda/) and [public npm](https://www.npmjs.com/package/@arrai-innovations/vueda/v/alpha). No registry credentials are needed.

The v3 packages are prereleases, and the templates select them. To add VUEDA v3 to a project of your own, use `uv add --prerelease allow vueda` for the server and `pnpm add @arrai-innovations/vueda@alpha` for the client. The `alpha` tag selects v3 on npm.

## Scaffold a New Project

VUEDA provides two [Copier](https://copier.readthedocs.io/) templates for scaffolding a new integrator project:

- **`integrator-monorepo`**: minimal setup with direct `uv`/`pnpm` workflows.
- **`integrator-monorepo-dx`**: DX-focused setup with repository automation via `just` (includes linting, formatting, git hooks, and `just serve` for running both servers concurrently).

Clone the VUEDA repository, then copy one template from the clone:

```console
git clone https://github.com/arrai-innovations/vueda.git

# DX template (recommended)
uvx copier copy vueda/templates/integrator-monorepo-dx ./your-project

# or: minimal template
uvx copier copy vueda/templates/integrator-monorepo ./your-project
```

Copier will prompt you for a project name, slug, ports, and other options. The defaults are sensible for most setups.

The template generates:

- A Django server under `server/` with VUEDA wired into settings, URLs, and config
- A custom `users` app under `server/your_project/users/` with a project-specific `User` model extending VUEDA's base user (required by `AUTH_USER_MODEL`)
- Two TOML config files: `server/config.toml` (shared, safe to commit) and `server/config.local.toml` (secrets, do not commit)
- A Vue client under `client/` with VUEDA's router and action system bootstrapped
- A `uv` workspace root and `pnpm` workspace definition
- (DX template only) A `Justfile`, `lefthook` config, `ruff`, `eslint`, and `prettier` setup

## Initialize the Repository

The DX template installs `lefthook` git hooks during `pnpm install`, and the hooks need a git repository. Create one before you install dependencies:

```console
cd your-project
git init
```

## Install Dependencies

### DX template

```console
just bootstrap
```

### Minimal template

```console
uv sync --all-packages
pnpm install
```

## Configure Local Settings

The server reads its settings from two TOML files in `server/`:

- **`config.toml`**: shared settings that are safe to commit, such as allowed hosts, the frontend URL, installed apps, and CORS origins. The template fills it with placeholder values for a public deployment. Replace them with your real domain before you deploy.
- **`config.local.toml`**: local overrides and secrets. **Do not commit it.** It holds machine-specific values such as database credentials, local frontend origins, and `DEBUG`.

A key in `config.local.toml` overrides the same key in `config.toml`. `server/config/settings/base.py` loads both files into a {@api py:class:vueda.core.config.TomlEnv}, and {@api py:function:vueda.core.default_settings.get_defaults} builds the Django settings from it. [Configuration Surface and Defaults](../core-concepts/configuration-surface-and-defaults.md) lists the keys it reads.

Before you start the server, open `server/config.local.toml` and set real values:

```toml
SECRET_KEY = "a-real-secret-key"
DEBUG = true
ALLOWED_HOSTS = ["localhost", "127.0.0.1"]
FRONTEND_DOMAIN = "http://localhost:5173"
CSRF_TRUSTED_ORIGINS = ["http://localhost:5173"]
CORS_ALLOWED_ORIGINS = ["http://localhost:5173"]
DATABASE_URL = "postgres://postgres:postgres@localhost:5432/your-project"
CACHE_URL = "redis://localhost:6379/0?key_prefix=your-project-"
```

The template fills in the frontend and origin values from the bind IP and client port that you chose in Copier. It also fills in a `DATABASE_URL` based on your project slug. Change these values if your network or PostgreSQL connection differs. Replace the placeholder `SECRET_KEY` with a real secret.

Sign-in sessions live in the cache that `CACHE_URL` names. To skip Redis, set `CACHE_URL = "db://your_project_cache"` and run `manage.py createcachetable` after `migrate` in the next step. See [Configure the Cache and Sessions](../guides/configure-cache-and-sessions.md) for the options.

::: tip
The template's `config.toml` also lists the scaffolded `users` app in `LOCAL_APPS` and sets `AUTH_USER_MODEL = "users.User"`. VUEDA's user system needs both. Later in this tutorial, we add the inventory app to `LOCAL_APPS`.
:::

## First Contact

Before we add any code, we check that the scaffolded server and client start and reach each other.

::: tip
The commands use `localhost`. In WSL2, a Docker container, or another networked environment, you may need a different hostname, or to bind the servers to `0.0.0.0`.
:::

First, apply the database migrations:

```console
# DX template
just manage migrate

# Minimal template
cd server
uv run python manage.py migrate
```

Next, start the server and the client. With the DX template, one command starts both:

```console
just serve
```

With the minimal template, start each one in its own terminal:

```console
# Terminal 1: server
cd server
uv run gunicorn config.asgi -k uvicorn.workers.UvicornWorker --reload --bind localhost:8000
```

```console
# Terminal 2: client
cd client
pnpm dev
```

The client dev server uses port `5173` by default. You can choose another port in Copier.

In another terminal, check that the server answers the {@api rest:endpoint:GET:/vueda.user/who-is/} endpoint:

```console
curl -i http://localhost:8000/routes/vueda.user/who-is/
```

The server returns `200` with an empty JSON object, `{}`, because you are not signed in.

For the client, open `http://localhost:5173` in your browser. The client redirects you to its sign-in page at `/sign-in/`. You have no user to sign in with yet; we create one after we build the server's inventory app.

::: tip
If you want your local environment to match production security settings (secure session and CSRF cookies, HTTPS-only), see [Local HTTPS Development](../guides/local-https-setup.md).
:::

## VUEDA Server

Now we build the inventory app on the server. It has three models in one Django app: products, option types, and product options.

### Create a Django App

`your_project` stands for the Python package name that you chose in Copier. In `server/your_project/`, create a folder called `inventory` with these files:

- `__init__.py`
- `apps.py`
- `models.py`
- `serializers.py`
- `viewsets.py`
- `filtersets.py`
- `routers.py`
- `urls.py`

### Models

VUEDA models build on one of two abstract bases, which extend Django's {@api ext:django:django.db.models.Model}:

- {@api py:class:vueda.core.models.VuedaModel}: the base for domain models. It adds a {@term Formatted Name}, a display label that copies the model's `name` field by default.
- {@api py:class:vueda.core.models.Lookup}: the base for reference tables of codes and names. It provides a unique `code`, a `name`, and a formatted name. It is a {@term Lookup}.

Both bases give a model the five permissions that VUEDA checks: create, read, update, delete, and list. A model that declares its own `class Meta` keeps them when its `Meta` subclasses {@api py:class:vueda.core.models.BaseModelMeta}, as each model below does.

`server/your_project/inventory/models.py`:

```python
from django.db import models

from vueda.core.models import BaseModelMeta, Lookup, VuedaModel


class Product(VuedaModel):
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=64, unique=True)
    description = models.TextField(blank=True)

    class Meta(BaseModelMeta):
        ordering = ["name", "id"]


class OptionType(Lookup):
    class Meta(BaseModelMeta):
        ordering = ["name", "id"]


class ProductOption(VuedaModel):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="options"
    )
    option_type = models.ForeignKey(
        OptionType, on_delete=models.PROTECT, related_name="product_options"
    )
    name = models.CharField(max_length=255)
    value = models.CharField(max_length=255)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta(BaseModelMeta):
        ordering = ["sort_order", "id"]
```

### Serializers

VUEDA serializers extend {@api py:class:vueda.core.serializers.VuedaSerializer}. For a `Lookup` model, {@api py:class:vueda.core.serializers.VuedaLookupSerializer} already lists `id`, `code`, `name`, and the base fields.

Give each serializer a `Meta` that subclasses `VuedaSerializer.Meta` or `VuedaLookupSerializer.Meta`. Add `VuedaSerializer.Meta.fields` to your own field list to include the base fields: `formatted_name`, `available_actions`, and `object_revision`. [Define the Serializer](../guides/create-crud-surface.md#define-the-serializer) describes each base field.

`server/your_project/inventory/serializers.py`:

```python
from vueda.core.serializers import VuedaLookupSerializer, VuedaSerializer

from your_project.inventory.models import OptionType, Product, ProductOption


class ProductSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = Product
        fields = ["id", "name", "sku", "description"] + VuedaSerializer.Meta.fields


class OptionTypeSerializer(VuedaLookupSerializer):
    class Meta(VuedaLookupSerializer.Meta):
        model = OptionType


class ProductOptionSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = ProductOption
        fields = [
            "id",
            "product",
            "option_type",
            "name",
            "value",
            "sort_order",
        ] + VuedaSerializer.Meta.fields
```

### Viewsets

VUEDA viewsets extend {@api py:class:vueda.core.viewsets.VuedaViewSet}, which builds on DRF's {@api ext:drf:rest_framework.viewsets.ModelViewSet}. A `VuedaViewSet`:

- serves `list`, `create`, `retrieve`, `update`, `partial_update`, and `destroy`, plus a bulk delete on the list URL
- rejects a query parameter that names no filter or field that it knows
- filters list results by row-level permissions
- expands related objects through [drf-flex-fields](https://github.com/rsinger86/drf-flex-fields), with a `permit_<action>_expands` list for each action

`server/your_project/inventory/viewsets.py`:

```python
from vueda.core.viewsets import VuedaViewSet

from your_project.inventory.filtersets import (
    OptionTypeFilterSet,
    ProductFilterSet,
    ProductOptionFilterSet,
)
from your_project.inventory.models import OptionType, Product, ProductOption
from your_project.inventory.serializers import (
    OptionTypeSerializer,
    ProductOptionSerializer,
    ProductSerializer,
)


class ProductViewSet(VuedaViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    filterset_class = ProductFilterSet


class OptionTypeViewSet(VuedaViewSet):
    queryset = OptionType.objects.all()
    serializer_class = OptionTypeSerializer
    filterset_class = OptionTypeFilterSet


class ProductOptionViewSet(VuedaViewSet):
    queryset = ProductOption.objects.all()
    serializer_class = ProductOptionSerializer
    filterset_class = ProductOptionFilterSet
```

### Filtersets

Filtersets extend {@api py:class:vueda.core.filters.VuedaFilterSet}. The fields in each filterset's `Meta.fields` become the list filters for its model.

`server/your_project/inventory/filtersets.py`:

```python
from vueda.core.filters import VuedaFilterSet

from your_project.inventory.models import OptionType, Product, ProductOption


class ProductFilterSet(VuedaFilterSet):
    class Meta:
        model = Product
        fields = ["id", "name", "sku"]


class OptionTypeFilterSet(VuedaFilterSet):
    class Meta:
        model = OptionType
        fields = ["id", "code", "name"]


class ProductOptionFilterSet(VuedaFilterSet):
    class Meta:
        model = ProductOption
        fields = ["id", "product", "option_type", "name"]
```

### Router and URLs

The client requests each model at `/routes/<app_label>/<model_name>/`, its {@term Model API Path}, so we register each viewset under its model name, lowercased with no separators. [Router and URL Wiring](../guides/create-crud-surface.md#router-and-url-wiring) describes this rule.

{@api py:class:vueda.core.routers.VuedaRouter} builds on DRF's `SimpleRouter`. It prefixes each route name with the app label, and it serves each {@term Bulk Action} at the list URL.

`server/your_project/inventory/routers.py`:

```python
from vueda.core.routers import VuedaRouter

from your_project.inventory.viewsets import (
    OptionTypeViewSet,
    ProductOptionViewSet,
    ProductViewSet,
)

router = VuedaRouter()
router.register(r"product", ProductViewSet)
router.register(r"optiontype", OptionTypeViewSet)
router.register(r"productoption", ProductOptionViewSet)
urlpatterns = router.urls
```

`server/your_project/inventory/urls.py`:

```python
from django.urls import include, path

from your_project.inventory.routers import urlpatterns

urlpatterns = [
    path("", include(urlpatterns)),
]
```

The template's `server/config/urls.py` includes `server/your_project/urls.py` under the `routes/` prefix. `server/your_project/urls.py` starts with an empty `urlpatterns`. Mount the inventory app at `inventory/` in it:

```python
from django.urls import include, path

urlpatterns = [
    path("inventory/", include("your_project.inventory.urls")),
]
```

The server now serves the products at `/routes/inventory/product/`.

### App Configuration and Model-Info Registration

The client builds its views from {@term Model Info}, the metadata that the server publishes for each registered model. Register each model's serializer and viewset with {@api py:function:vueda.info.registration.register} in the app's {@api ext:django:django.apps.AppConfig.ready} method.

`server/your_project/inventory/apps.py`:

```python
from django.apps import AppConfig


class InventoryConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "your_project.inventory"

    def ready(self):
        from vueda.info import register

        from .serializers import (
            OptionTypeSerializer,
            ProductOptionSerializer,
            ProductSerializer,
        )
        from .viewsets import (
            OptionTypeViewSet,
            ProductOptionViewSet,
            ProductViewSet,
        )

        register(ProductSerializer, ProductViewSet)
        register(OptionTypeSerializer, OptionTypeViewSet)
        register(ProductOptionSerializer, ProductOptionViewSet)
```

Keep the imports inside `ready()`. The serializer and viewset modules import models, which Django cannot load while it is still importing the `apps` module.

Without `register`, the model's API endpoints still answer, but model info does not describe the model, so the client cannot open its views. [Canonical Registration and Model Discovery](../core-concepts/canonical-registration-and-discovery.md) describes registration.

### Register the App

`get_defaults` builds `INSTALLED_APPS` from Django's apps, VUEDA's apps, third-party apps, and the apps in `LOCAL_APPS`. Add the inventory app to `LOCAL_APPS` in `server/config.toml`:

```toml
LOCAL_APPS = ["your_project.users", "your_project.inventory"]
```

The default VUEDA app list installs every VUEDA app, and two of them are optional. [Django App Boundaries](../core-concepts/architecture-overview.md#django-app-boundaries) separates required infrastructure from optional feature apps and gives the combinations VUEDA tests.

Create and apply the migrations for the new app:

```console
# DX template
just manage makemigrations inventory
just manage migrate

# Minimal template, from server/
uv run python manage.py makemigrations inventory
uv run python manage.py migrate
```

The migration also creates an event table for each of the three models. Each table records its model's {@term Model History}.

Stop the server and start it again, so that it loads the new app.

### Create a User

The inventory endpoints check the requesting user's {@term CRUD} permissions. `migrate` created five permissions for each model, such as `inventory.create_product`, `inventory.read_product`, `inventory.update_product`, `inventory.delete_product`, and `inventory.list_product`. Model info lists only the actions that the user's permissions allow, and the client opens only those views. [Permission Model](../core-concepts/permission-model.md) describes the checks.

We create a group with the 15 permissions of the three models, and a user in that group. In another terminal, open a Django shell from `server/` with `just manage shell` (DX template) or `uv run python manage.py shell` (minimal template), and run:

```python
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission

group, _ = Group.objects.get_or_create(name="Inventory Editors")
group.permissions.set(
    Permission.objects.filter(
        content_type__app_label="inventory",
        content_type__model__in=["product", "optiontype", "productoption"],
    )
)
user = get_user_model().objects.create_user(
    email="you@example.com", password="your-password", name="You"
)
user.groups.add(group)
```

The filter leaves out the event models' permissions. [Manage Groups and Generate Group Migrations](../guides/manage-groups.md) describes a page for managing groups in the browser.

### Verify the New API Endpoints

In a new terminal, sign in with curl through the {@api rest:endpoint:POST:/vueda.user/login/} endpoint, and store the session cookie. The response also sets a CSRF cookie. Requests that change data must send the cookie's value in the `X-CSRFToken` header.

::: tip
The CSRF cookie name is project-specific. By default it is `<project-slug>-csrf-token`, and `CSRF_COOKIE_NAME` in `server/config/settings/local.py` sets it. The examples below use `your-project-csrf-token`; substitute your project slug.
:::

```console
COOKIE_JAR=/tmp/vueda-cookies.txt
CSRF_COOKIE=your-project-csrf-token

# Sign in with email and password; the response sets the CSRF cookie
curl -c $COOKIE_JAR \
  -H "Content-Type: application/json" \
  -X POST http://localhost:8000/routes/vueda.user/login/ \
  -d '{"email":"you@example.com","password":"your-password"}'

# Read the CSRF token for the requests that follow
CSRF_TOKEN=$(awk -v name="$CSRF_COOKIE" '$6 == name {print $7}' $COOKIE_JAR)
```

After you sign in, `who-is` returns your user:

```console
curl -b $COOKIE_JAR http://localhost:8000/routes/vueda.user/who-is/
```

Check that model info describes the product model, through the {@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/} endpoint:

```console
curl -b $COOKIE_JAR http://localhost:8000/routes/vueda.info/model_info/inventory/product/
# Expect: 200 with model_fields and model_actions
```

A `404` here means that the `register` calls did not run. Check that `LOCAL_APPS` names the app and that the server restarted.

Now try each {@term CRUD} action on the product endpoints:

```console
# Create
curl -b $COOKIE_JAR -c $COOKIE_JAR \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: $CSRF_TOKEN" \
  -X POST http://localhost:8000/routes/inventory/product/ \
  -d '{"name":"Starter Kit","sku":"STARTER-001","description":"Demo product"}'
# Expect: 201 with the created object

# List
curl -b $COOKIE_JAR http://localhost:8000/routes/inventory/product/
# Expect: 200 with a list including the created object

# Retrieve
curl -b $COOKIE_JAR http://localhost:8000/routes/inventory/product/1/
# Expect: 200 with the created object

# Partial update
curl -b $COOKIE_JAR -c $COOKIE_JAR \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: $CSRF_TOKEN" \
  -X PATCH http://localhost:8000/routes/inventory/product/1/ \
  -d '{"description":"Updated description"}'
# Expect: 200 with the updated object

# Delete: create a second product, then delete it
curl -b $COOKIE_JAR -c $COOKIE_JAR \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: $CSRF_TOKEN" \
  -X POST http://localhost:8000/routes/inventory/product/ \
  -d '{"name":"Spare Kit","sku":"SPARE-001"}'
curl -b $COOKIE_JAR -c $COOKIE_JAR \
  -H "X-CSRFToken: $CSRF_TOKEN" \
  -X DELETE http://localhost:8000/routes/inventory/product/2/
# Expect: 204 with no content; Starter Kit remains
```

## VUEDA Client

The scaffolded client already has what the inventory needs: a sign-in page, a welcome page, and {@term CRUD Routes} for every registered model. We check its setup, add a link to the products, and then customize the product list.

### Connect to the Server

During local development, the client dev server and Django run on different ports. The scaffolded `client/.env.development` sets `VITE_DJANGO_CONNECTION_PORT` to the server port that you chose in Copier, so the client knows where to reach the server. No Vite proxy is needed, because `config.local.toml` already lists the client's origin in `CORS_ALLOWED_ORIGINS`.

### Check the Client Setup

The scaffolded `client/src/index.css` and `client/src/main.js` already set up the client, so keep both files. `index.css` loads Tailwind, the theme's `base.css` tokens, and the fonts. `main.js` registers the Tailwind theme, the icons, and the {@term CRUD} data adapters. See [Client Plugin Prerequisites](../guides/client-plugin-prerequisites.md) for what each call does.

::: tip
For per-family or per-component loading and the order required for project patches, see [How the theme is registered](../core-concepts/theming-and-customization.md#how-the-theme-is-registered).
:::

### Check the Scaffolded Routes

The scaffolded `client/src/router/index.js` defines these routes:

- `/sign-in/` renders {@api vue:component:ViewSignIn}, VUEDA's sign-in form. After sign-in, it opens the route named `welcome`.
- `/welcome/` renders `client/src/views/ViewWelcome.vue`.
- `/` redirects to `/welcome/`.
- The routes from {@api js:function:@arrai-innovations/vueda/router/makeCrud#makeCRUDRoutes} open each model's views, such as `/inventory/product/list/`.

The welcome page and the CRUD routes send a signed-out user to `/sign-in/`. [Build Auth Views](../guides/build-auth-views.md) describes the sign-in and password views.

The CRUD routes render VUEDA's built-in views, which build their fields, filters, and actions from model info. So the inventory needs no client code for a working list and forms. To give one model its own view for an action, replace that action's loader with {@api js:function:@arrai-innovations/vueda/router/routerComponent#setCrudComponents}. [View Component Resolution Order](../core-concepts/routing-and-view-resolution-model.md#view-component-resolution-order) describes how each view is chosen.

### Link the Welcome Page to the Products

The scaffolded welcome page shows the signed-in user's email. Add a link to the product list. Replace `client/src/views/ViewWelcome.vue` with:

```vue
<script setup>
import { storeUser } from "@vueda/stores/storeUser.js";

const userStore = storeUser();
</script>

<template>
    <main class="flex flex-col gap-2 p-6">
        <h1 class="text-xl font-semibold">Welcome</h1>
        <p>You are signed in as {{ userStore.loggedInUser?.email }}.</p>
        <p>
            <RouterLink to="/inventory/product/list/">Products</RouterLink>
        </p>
    </main>
</template>
```

[`loggedInUser`]{@api js:property:@arrai-innovations/vueda/stores/storeUser#storeUser.loggedInUser} holds the signed-in user's details from `who-is`.

### Verify in the Browser

If the server and the client are not running, start them as in [First Contact](#first-contact). Then:

1. Open `http://localhost:5173/`. The client shows the sign-in form.
2. Sign in as `you@example.com` with the password that you set in [Create a User](#create-a-user). The client opens `/welcome/`.
3. Click **Products**. The list shows the Starter Kit product that you created with curl.
4. Use the **Create** action to add a product. After the save, the client opens the new product's update view. Return to the list to see the product there.
5. Open `http://localhost:5173/inventory/product/read/1` to see the Starter Kit's read view.

The other models follow the same client URL pattern: the option type list is at `/inventory/optiontype/list/`, and the product option list is at `/inventory/productoption/list/`.

### Customize with Model Config

The built-in views show every field that the serializer exposes. To change what a view shows without writing a custom view, set its {@term Model Config} with {@api js:function:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig}. We make the product list show two columns and link each product's name to the product.

Create `client/src/setupModelConfig.js`:

```javascript
import { storeModelConfig } from "@vueda/stores/storeModelConfig.js";

export function setupModelConfig(pinia) {
    storeModelConfig(pinia).setConfig({ app: "inventory", model: "product" }, null, {
        list: {
            displayFields: ["name", "sku"],
            detailLinkField: "name",
        },
    });
}
```

[`setConfig`]{@api js:method:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig.setConfig} takes the model, a config that applies to all views, and configs for single views, keyed by view name. The `null` leaves the all-views config unset, and the `list` key applies only to the list view. `displayFields` names the list columns. [`detailLinkField`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.detailLinkField} turns each row's `name` into a link to that product's update view. For a user who cannot update the product, the link opens its read view. [Link List Rows to Read and Update Views](../guides/link-list-rows-to-detail-views.md) describes row links.

In `client/src/main.js`, import the function and call it after `app.use(pinia)`:

```javascript
import { setupModelConfig } from "./setupModelConfig.js";

// ... after app.use(pinia)
setupModelConfig(pinia);
```

Reload the product list. It shows the `name` and `sku` columns, and each name links to the product's update view. [Configure CRUD Views](../guides/configure-crud-views.md) lists the other model config options.
