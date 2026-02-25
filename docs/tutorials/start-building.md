---
audience: implementors
status: draft
type: tutorial
---

# Start Building

This guide walks through the **supported, opinionated starting point** for a VUEDA-based project, focusing on the minimum steps needed to get a VUEDA API server and a VUEDA client application talking to each other.

If you already have an existing Django or Vue project, this guide is still useful as a reference for how VUEDA expects projects to be structured, but it does not attempt to provide conversion steps.

By the end of this guide, you will have a running Django API and Vue client connected via VUEDA, exposing a simple inventory model end-to-end.

## Prerequisites

- [Python 3.11+](https://www.python.org/downloads/): for running the VUEDA Server
- [Node.js 22+](https://nodejs.org/en/download/): for running the VUEDA Client
- A [PostgreSQL](https://www.postgresql.org/) database: for hosting your application data
- [Git](https://git-scm.com/): for version control
- [Copier](https://copier.readthedocs.io/): for scaffolding from the project templates
- [uv](https://docs.astral.sh/uv/): for Python dependency management
- [pnpm](https://pnpm.io/): for Node.js dependency management

### Optional

- A [Redis](https://redis.io/) instance: for caching and Celery task brokering (not required for this guide)
- [just](https://just.systems/man/en/introduction.html): for common developer CLI tooling (included in the DX template)

::: warning
VUEDA assumes an ASGI runtime. Django's built-in `runserver` command uses WSGI and will not exercise VUEDA's ASGI middleware stack (CORS, sessions, CSRF token handling). The DX template includes `gunicorn` and `uvicorn` and its `just serve` command uses them automatically. If you are using the minimal template, install an ASGI server (e.g. `gunicorn` + `uvicorn`) and use it instead of `runserver`.
:::

## Environment Setup

This guide assumes access to a [bash](https://www.gnu.org/software/bash/)-like shell (Linux, macOS, WSL2, etc.) for running commands. Adjust accordingly for other environments (PowerShell, cmd.exe, etc.).

### Package Registry Access

<!-- todo: remove this section when public -->

Before proceeding, configure credentials for the private package registries.

**Python (private PyPI):**

```console
export UV_INDEX_ARRAI_USERNAME=your-username
export UV_INDEX_ARRAI_PASSWORD=your-password
```

**Node (npm):**

```console
export NPM_TOKEN=your-npm-token
```

You can also store the npm token in `~/.npmrc`:

```ini
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
```

::: tip
Add these environment variables to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.) to persist them across sessions.

You could also use a tool like [direnv](https://direnv.net/) to manage environment variables on a per-project basis.
:::

## Scaffold a New Project

VUEDA provides two [Copier](https://copier.readthedocs.io/) templates for scaffolding a new implementor project:

- **`implementor-monorepo`**: minimal setup with direct `uv`/`pnpm` workflows.
- **`implementor-monorepo-dx`**: DX-focused setup with repository automation via `just` (includes linting, formatting, git hooks, and `just serve` for running both servers concurrently).

Pick one and run:

```console
# DX template (recommended)
uvx copier copy --vcs-ref=HEAD gh:arrai-innovations/vueda/templates/implementor-monorepo-dx ./your-project

# or: minimal template
uvx copier copy --vcs-ref=HEAD gh:arrai-innovations/vueda/templates/implementor-monorepo ./your-project
```

Copier will prompt you for a project name, slug, ports, and other options. The defaults are sensible for most setups.

The template generates:

- A Django server under `server/` with VUEDA wired into settings, URLs, and config
- A custom `users` app under `server/<your_package>/users/` with a project-specific `User` model extending VUEDA's base user (required by `AUTH_USER_MODEL`)
- Two TOML config files: `server/config.toml` (shared, safe to commit) and `server/config.local.toml` (secrets, do not commit)
- A Vue client under `client/` with VUEDA's router and action system bootstrapped
- A `uv` workspace root and `pnpm` workspace definition
- (DX template only) A `Justfile`, `lefthook` config, `ruff`, `eslint`, and `prettier` setup

## Initialize the Repository

The DX template includes `lefthook` for git hooks, which runs automatically during `pnpm install`. Initialize a git repository before installing dependencies:

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

VUEDA projects use a two-file TOML configuration system, both under `server/`:

- **`config.toml`**: shared settings safe to commit (allowed hosts, frontend URL, app registry, CORS origins, etc.). The template ships sensible local-development defaults; you generally do not need to change this file to get started.
- **`config.local.toml`**: local-only overrides and secrets (**do not commit**). This is where machine-specific values like database credentials belong.

Settings in `config.local.toml` override those in `config.toml`. Both files are loaded by `TomlEnv` in `server/config/settings/base.py` and consumed by VUEDA's `get_defaults()`, which sets up Django settings (`INSTALLED_APPS`, `DATABASES`, `CACHES`, middleware, auth, etc.) from these keys.

Before starting the server, open `server/config.local.toml` and set real values:

```toml
SECRET_KEY = "a-real-secret-key"
DATABASE_URL = "postgres://postgres:postgres@localhost:5432/your-project"
```

The template pre-populates `DATABASE_URL` with a reasonable guess based on your project slug. Update it if your local Postgres connection details differ. `SECRET_KEY` should be changed from the placeholder for any non-trivial use.

::: tip
The template's `config.toml` also registers the scaffolded `users` app via `LOCAL_APPS` and sets `AUTH_USER_MODEL = "users.User"`. These are required for VUEDA's user system to work. You can add your own apps to `LOCAL_APPS` or append to `INSTALLED_APPS` directly in `base.py` (the guide uses the latter approach below).
:::

::: warning
When `REDIS_URL` is not configured, the template falls back to Django's `LocMemCache`, which is per-process. This is fine for single-process local development, but ASGI servers like gunicorn run multiple worker processes with isolated caches. Configure a Redis (or equivalent) cache backend for anything beyond basic local development.
:::

## First Contact

At this point we have a minimal VUEDA server and client setup. Let's verify that everything is wired up correctly.

::: tip
The remainder of this guide uses `localhost` for simplicity. If you are working in WSL2, Docker containers, or other networked environments, you may need to adjust hostnames or use `0.0.0.0` for binding.
:::

First, apply database migrations:

```console
# DX template
just manage migrate

# Minimal template
cd server
uv run python manage.py migrate
```

Now start the server and client. With the DX template, run both concurrently:

```console
just serve
```

With the minimal template, start each in its own terminal:

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

The client dev server defaults to port `5173` (configurable via the copier options).

Now verify the server is responding:

```console
curl -i http://localhost:8000/routes/vueda.user/who-is/
```

You should get a 200 response with an empty JSON object, indicating that the server is up and running but you are not authenticated.

For the client, open your browser and navigate to `http://localhost:5173`. You should see a page load without console errors. There is nothing to display yet since we have not added any routes or components.

::: warning
If you are having issues from here, consult [Django](https://docs.djangoproject.com/) or [Vite](https://vite.dev/) documentation for troubleshooting tips, or a system administrator for networking problems, as the issues are likely outside the scope of this guide.
:::

## VUEDA Server

With the boilerplate in place, we can now start building on the VUEDA Server. For this guide, we will add several simple models in the same Django app to demonstrate VUEDA's capabilities.

### Create a Django App

Add a new Django app under the project namespace. In `server/your_project/`, create a new folder called `inventory` with the following files:

- `__init__.py`
- `apps.py`
- `models.py`
- `serializers.py`
- `viewsets.py`
- `filtersets.py`
- `routers.py`
- `urls.py`

### Models

VUEDA provides its own extensions of Django's `Model` class:

- **`VuedaBaseModel`**: adds an expected `formatted_name` `GeneratedField` (by default based on a model's `name` field) and a custom `BaseModelMeta` class that sets up default permissions in VUEDA's expected way.
- **`Lookup`**: extends `VuedaBaseModel` with a unique `code` field, intended for lightweight, potentially user-defined, reference data tables.

::: important
VUEDA uses create, read, update, delete, and list permissions, which aligns better with `djangorestframework`'s viewset actions than Django's default add, change, delete, and view permissions. All VUEDA models must therefore inherit from `VuedaBaseModel` to ensure proper permission handling, and must have a `class Meta(VuedaBaseModel.Meta)` (or equivalently, `class Meta(BaseModelMeta)`) by default.
:::

`server/your_project/inventory/models.py`:

```python
from django.db import models

from vueda.core.models import BaseModelMeta, Lookup, VuedaBaseModel


class Product(VuedaBaseModel):
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=64, unique=True)
    description = models.TextField(blank=True)

    class Meta(BaseModelMeta):
        ordering = ["name", "id"]


class OptionType(Lookup):
    class Meta(BaseModelMeta):
        ordering = ["name", "id"]


class ProductOption(VuedaBaseModel):
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

VUEDA provides `VuedaSerializer` and `VuedaLookupSerializer` base classes for DRF serializers. `VuedaLookupSerializer` handles the boilerplate around the `code` field for `Lookup` models.

::: important
As with models, all VUEDA serializers should have a `class Meta(VuedaSerializer.Meta)` or `class Meta(VuedaLookupSerializer.Meta)` to ensure proper default behavior.
:::

`server/your_project/inventory/serializers.py`:

```python
from vueda.core.serializers import VuedaLookupSerializer, VuedaSerializer

from your_project.inventory.models import OptionType, Product, ProductOption


class ProductSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = Product
        fields = [
            "id",
            "name",
            "sku",
            "description",
            "formatted_name",
            "available_actions",
        ]


class OptionTypeSerializer(VuedaLookupSerializer):
    class Meta(VuedaLookupSerializer.Meta):
        model = OptionType
        fields = VuedaLookupSerializer.Meta.fields


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
            "formatted_name",
            "available_actions",
        ]
```

### Viewsets

VUEDA provides a `VuedaViewSet` base class which:

- sets up default behavior for CRUDL actions
- integrates with VUEDA's permission system
- extends DRF's `ModelViewSet` to cause more intentional errors when passing extra query parameters or fields (rather than silently ignoring them)
- provides row-level filtering hooks
- integrates and extends [drf-flex-fields](https://github.com/rsinger86/drf-flex-fields), adding `permit_{action}_expands` beyond the default which only supports `permit_list_expands`

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

VUEDA provides `VuedaFilterSet` as a base for DRF filtersets.

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

VUEDA provides `VuedaRouter`, which builds on DRF's `SimpleRouter` to generate standard CRUD routes, namespaces route names with the app label, and supports bulk actions via `@action(bulk=True)`.

`server/your_project/inventory/routers.py`:

```python
from vueda.core.routers import VuedaRouter

from your_project.inventory.viewsets import (
    OptionTypeViewSet,
    ProductOptionViewSet,
    ProductViewSet,
)

router = VuedaRouter()
router.register(r"products", ProductViewSet)
router.register(r"option-types", OptionTypeViewSet)
router.register(r"product-options", ProductOptionViewSet)
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

Finally, wire the inventory URLs into your project's namespace URL file. The copier template generates `server/your_project/urls.py` with an empty `urlpatterns`. Add the inventory app:

```python
from django.urls import include, path

urlpatterns = [
    path("inventory/", include("your_project.inventory.urls")),
]
```

The template's `server/config/urls.py` already includes your project namespace under the `routes/` prefix, so the inventory endpoints will be available at `/routes/inventory/`.

### App Configuration and Model-Info Registration

VUEDA's client discovers models through a metadata API. For your models to appear in this API (and therefore be usable by the client), you need to register them with VUEDA's `register()` function in the app's `AppConfig.ready()` method.

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

The imports are inside `ready()` deliberately. Registration resolves content types internally, which requires the Django app registry to be fully initialized first.

::: important
Without `register()`, the model's API endpoints will work (you can still curl them), but the client will not be able to discover the model's fields, actions, or permissions. This is the most common cause of "model doesn't show up in the client."
:::

### Register the App

Add the new app to `INSTALLED_APPS`. The copier template's settings use `get_defaults()` from VUEDA, which sets up `INSTALLED_APPS` with VUEDA's required apps plus any apps listed in `LOCAL_APPS` from `config.toml` (the scaffolded `users` app is already registered there). You need to add your new app as well.

In `server/config/settings/base.py`, after the `locals().update(get_defaults(env))` line, add:

```python
INSTALLED_APPS += ["your_project.inventory"]
```

Alternatively, you could add the app to `LOCAL_APPS` in `config.toml`. Either approach works; `INSTALLED_APPS +=` in `base.py` keeps the registration close to the code, while `LOCAL_APPS` keeps it in config.

Then run migrations:

```console
cd server
uv run python manage.py makemigrations inventory
uv run python manage.py migrate
```

### Verify the New API Endpoints

Since VUEDA enforces CRUDL permissions by default, the quickest path is to log in as a superuser.

Create one if you haven't already:

```console
uv run python manage.py createsuperuser
```

Then, in a new terminal, log in via curl and store the session cookie. The login endpoint sets a CSRF cookie in its response, which you will need for subsequent mutating requests.

::: tip
The CSRF cookie name is project-specific (`<project-slug>-csrf-token` by default, configured via `CSRF_COOKIE_NAME` in `local.py`). The examples below use `your-project-csrf-token` as a placeholder; substitute your actual project slug.
:::

```console
COOKIE_JAR=/tmp/vueda-cookies.txt
CSRF_COOKIE=your-project-csrf-token

# Log in (uses email + password; sets CSRF cookie in the response)
curl -c $COOKIE_JAR \
  -H "Content-Type: application/json" \
  -X POST http://localhost:8000/routes/vueda.user/login/ \
  -d '{"email":"you@example.com","password":"your-password"}'

# Extract the CSRF token for subsequent requests
CSRF_TOKEN=$(awk -v name="$CSRF_COOKIE" '$6 == name {print $7}' $COOKIE_JAR)
```

If the login succeeded, `who-is` should now return your user info:

```console
curl -b $COOKIE_JAR http://localhost:8000/routes/vueda.user/who-is/
```

Now test CRUDL on the inventory endpoints:

```console
# Create
curl -b $COOKIE_JAR -c $COOKIE_JAR \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: $CSRF_TOKEN" \
  -X POST http://localhost:8000/routes/inventory/products/ \
  -d '{"name":"Starter Kit","sku":"STARTER-001","description":"Demo product"}'
# Expect: 201 with the created object

# List
curl -b $COOKIE_JAR http://localhost:8000/routes/inventory/products/
# Expect: 200 with a list including the created object

# Retrieve
curl -b $COOKIE_JAR http://localhost:8000/routes/inventory/products/1/
# Expect: 200 with the created object

# Partial update
curl -b $COOKIE_JAR -c $COOKIE_JAR \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: $CSRF_TOKEN" \
  -X PATCH http://localhost:8000/routes/inventory/products/1/ \
  -d '{"description":"Updated description"}'
# Expect: 200 with the updated object

# Delete
curl -b $COOKIE_JAR -c $COOKIE_JAR \
  -H "X-CSRFToken: $CSRF_TOKEN" \
  -X DELETE http://localhost:8000/routes/inventory/products/1/
# Expect: 204 with no content
```

## VUEDA Client

With the server-side API in place, the next step is to build out the VUEDA Client to interact with it.

<!-- ============================================================
     CLIENT SECTION BRAINSTORMING / IMPLEMENTATION NOTES
     ============================================================

     ### What the template scaffolds (already done)

     - client/src/main.js: bare-bones Vue app (createApp, pinia, router, mount)
     - client/src/router/index.js: makeCRUDRoutes + setCrudComponents({}) with
       empty crudComponents, not-found catch-all, ViewActionRouter as route component
     - client/src/TheApp.vue: Toast + ConfirmDialog + RouterView
     - client/vite.config.js: vuedaViteConfig() from @vueda/vite (sets up @vueda
       alias, reactive-helpers alias, vue/pinia runtime aliases, symlink fixes)

     ### What's missing in main.js (compare with wayfinders-client/src/main.js)

     1. setupDefaultListCrud() and setupDefaultObjectCrud() — these register the
        HTTP adapters that VUEDA's composables use for all CRUD operations.
        Without them, nothing fetches data.
        src: @vueda/utils/listCrud.js, @vueda/utils/objectCrud.js

     2. PrimeVue plugin registration — VUEDA's built-in views use PrimeVue
        components (DataTable, InputText, Button, etc). Need:
          app.use(PrimeVue, { theme: { preset: ... }, cssLayer: ... })
          app.use(ToastService)
          app.directive("tooltip", Tooltip)
        Theme preset: @primeuix/themes has Aura, Lara, etc. Wayfinders uses a
        customized Lara. For the tutorial, Aura or Lara out of the box is fine.
        src: wayfinders-client/src/main.js lines 29-63

     3. setPrimeVuePreset() — registers theme with VUEDA's internal theme store.
        src: @vueda/theme/register.js

     ### What's missing in router/index.js

     crudComponents is {} — needs resolvers for at least: list, create, read,
     update, destroy. The pattern from wayfinders is dynamic import with fallback:

       list: async (argsObj) => {
         try {
           return (await import(`@/views/ViewList${pascal(app)}${pascal(model)}.vue`)).default;
         } catch {
           return (await import("@vueda/views/ViewList.vue")).default;
         }
       }

     For the tutorial, we can skip the per-model dynamic import and just map
     directly to VUEDA's built-in views as defaults:

       list: async () => (await import("@vueda/views/ViewList.vue")).default,
       create: async () => (await import("@vueda/views/ViewCreate.vue")).default,
       read: async () => (await import("@vueda/views/ViewRead.vue")).default,
       update: async () => (await import("@vueda/views/ViewUpdate.vue")).default,
       destroy: async () => (await import("@vueda/views/ViewDestroy.vue")).default,

     Then explain the dynamic import fallback pattern as the real-world approach
     (link to wayfinders as example or to the CRUDL surface guide).

     ### What's missing: auth routes

     The template's router has authRedirect: { name: "sign-in" } but no sign-in
     route. The user will hit a redirect loop when not authenticated. Need at
     minimum a sign-in view. Options:
       a) Use VUEDA's built-in ViewSignIn if one exists
       b) Create a minimal ViewSignIn.vue in the tutorial
       c) Use the allauth browser flow (redirect to Django login page)
     Check: does @vueda/views/ have a ViewSignIn.vue?
     src: wayfinders-client/src/views/ViewSignIn.vue (custom)

     ### What's missing: server connection (vite proxy or CORS)

     The client dev server (localhost:5173) needs to talk to the Django server
     (localhost:8000). Two approaches:
       a) Vite proxy: vite.config.js server.proxy { "/routes": target }
       b) CORS: already configured in config.toml (CORS_ALLOWED_ORIGINS includes
          localhost:5173). VUEDA's ASGI middleware handles CORS.
     The CORS approach requires the client to know the server URL. Check how
     VUEDA's objectCrud.js determines the base URL — it likely reads from
     env vars or a config.
     src: wayfinders-client uses VITE_DJANGO_HOSTNAME env var
     src: @vueda/utils/objectCrud.js, @vueda/utils/listCrud.js for base URL
     src: wayfinders-client/.env.development for env var pattern

     ### Suggested tutorial flow

     1. "Wire up the client runtime" — update main.js:
        - Add setupDefaultListCrud() / setupDefaultObjectCrud()
        - Add PrimeVue with a stock theme preset (Aura)
        - Add ToastService and Tooltip directive
        - Add setPrimeVuePreset()

     2. "Configure CRUD view resolution" — update router/index.js:
        - Fill in crudComponents with VUEDA's built-in views
        - Add a sign-in route (minimal or VUEDA-provided)

     3. "Connect to the server" — configure base URL:
        - .env.development with VITE_DJANGO_HOSTNAME
        - Or vite proxy approach

     4. "Verify in the browser" — navigate to:
        - http://localhost:5173/inventory/product/list/
        - Should see the product list (empty or with test data)
        - Create a product, verify it appears in the list
        - Click through to read, update, destroy

     5. (Optional) "Customize a view" — brief example of:
        - Creating a ViewListInventoryProduct.vue that overrides a slot
        - Or using setupModelConfig to hide/show fields

     ### Template concerns to flag

     - vuedaViteConfig() is in vueda source (client/lib/vite.js) but not in
       the published 1.2.1 package. Template references it. Projects scaffolded
       now need unreleased vueda or will fail at vite build.
     - crudComponents = {} ships as empty — should the template provide the
       built-in view defaults out of the box? (template fix, not just guide fix)
     - main.js ships without setupDefaultListCrud/setupDefaultObjectCrud or
       PrimeVue — should the template include these? (template fix)
     - No sign-in route in template router — redirect loop on first load

     ### Reference files

     - Template main.js: templates/implementor-monorepo-dx/client/src/main.js.jinja
     - Template router: templates/implementor-monorepo-dx/client/src/router/index.js.jinja
       (or check if .jinja exists — the test project has plain .js)
     - Template vite config: templates/implementor-monorepo-dx/client/vite.config.js.jinja
     - Wayfinders main.js: /home/joel/WebstormProjects/wayfinders-client/src/main.js
     - Wayfinders router: /home/joel/WebstormProjects/wayfinders-client/src/router/index.js
     - Wayfinders model config: /home/joel/WebstormProjects/wayfinders-client/src/setupModelConfig.js
     - VUEDA built-in views: vueda/client/lib/views/View{List,Create,Update,Read,Destroy}.vue
     - VUEDA CRUD adapters: vueda/client/lib/utils/{listCrud,objectCrud}.js
     - VUEDA theme register: vueda/client/lib/theme/register.js
     - VUEDA vite config: vueda/client/lib/vite.js
     - CRUDL surface guide: docs/guides/create-crudl-surface.md (client route wiring section)
     ============================================================ -->

This section is still being written. In the meantime, the generated `client/src/router/index.js` shows the scaffolded routing setup, and the [Guides](/guides/) section covers specific client-side tasks like [creating a CRUDL surface](/guides/create-crudl-surface) for a model.
