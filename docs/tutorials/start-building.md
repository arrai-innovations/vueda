---
audience: integrators
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

VUEDA provides two [Copier](https://copier.readthedocs.io/) templates for scaffolding a new {@term Implementor} project:

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

Settings in `config.local.toml` override those in `config.toml`. Both files are loaded by {@api py:class:vueda.core.config.TomlEnv} in `server/config/settings/base.py` and consumed by VUEDA's {@api py:function:vueda.core.default_settings.get_defaults}, which sets up Django settings (`INSTALLED_APPS`, `DATABASES`, `CACHES`, middleware, auth, etc.) from these keys.

Before starting the server, open `server/config.local.toml` and set real values:

```toml
SECRET_KEY = "a-real-secret-key"
DATABASE_URL = "postgres://postgres:postgres@localhost:5432/your-project"
```

The template pre-populates `DATABASE_URL` with a reasonable guess based on your project slug. Update it if your local Postgres connection details differ. `SECRET_KEY` should be changed from the placeholder for any non-trivial use.

::: tip
The template's `config.toml` also registers the scaffolded `users` app via `LOCAL_APPS` and sets `AUTH_USER_MODEL = "users.User"`. These are required for VUEDA's user system to work. You can add your own apps to `LOCAL_APPS` or append to `INSTALLED_APPS` directly in `base.py` (the guide uses the latter approach below).
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

::: tip
If you want your local environment to match production security settings (secure session and CSRF cookies, HTTPS-only), see [Local HTTPS Development](../guides/local-https-setup.md).
:::

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

- **{@api py:class:vueda.core.models.VuedaModel}**: adds an expected {@api py:function:vueda.core.models.VuedaModel.formatted_name} `GeneratedField` (by default based on a model's `name` field) and a custom {@api py:class:vueda.core.models.BaseModelMeta} class that sets up default permissions in VUEDA's expected way.
- **{@api py:class:vueda.core.models.Lookup}**: extends {@api py:class:vueda.core.models.VuedaModel} with a unique `code` field, intended for lightweight, potentially user-defined, reference data tables.

::: important
VUEDA uses create, read, update, delete, and list permissions, which aligns better with `djangorestframework`'s viewset actions than Django's default add, change, delete, and view permissions. All VUEDA models must therefore inherit from {@api py:class:vueda.core.models.VuedaModel} to ensure proper permission handling, and must have a `class Meta(VuedaModel.Meta)` (or equivalently, `class Meta({@api py:class:vueda.core.models.BaseModelMeta})`) by default.
:::

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

VUEDA provides {@api py:class:vueda.core.serializers.VuedaSerializer} and {@api py:class:vueda.core.serializers.VuedaLookupSerializer} base classes for DRF serializers. {@api py:class:vueda.core.serializers.VuedaLookupSerializer} handles the boilerplate around the `code` field for {@api py:class:vueda.core.models.Lookup} models.

::: important
As with models, all VUEDA serializers should have a `class Meta({@api py:class:vueda.core.serializers.VuedaSerializer}.Meta)` or `class Meta({@api py:class:vueda.core.serializers.VuedaLookupSerializer}.Meta)` to ensure proper default behavior.
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

VUEDA provides a {@api py:class:vueda.core.viewsets.VuedaViewSet} base class which:

- sets up default behavior for {@term CRUDL} actions
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

VUEDA provides {@api py:class:vueda.core.filters.VuedaFilterSet} as a base for DRF filtersets.

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

VUEDA provides {@api py:class:vueda.core.routers.VuedaRouter}, which builds on DRF's `SimpleRouter` to generate standard CRUDL routes, namespaces route names with the app label, and supports {@term Bulk Action}s via `@action(bulk=True)`.

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

VUEDA's client discovers models through a metadata API. For your models to appear in this API (and therefore be usable by the client), you need to register them with VUEDA's {@api py:function:vueda.info.registration.register} function in the app's `AppConfig.ready()` method.

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

The imports are inside `ready()` deliberately. Registration resolves {@term Content Type}s internally, which requires the Django app registry to be fully initialized first.

::: important
Without {@api py:function:vueda.info.registration.register}, the model's API endpoints will work (you can still curl them), but the client will not be able to discover the model's fields, actions, or permissions. This is the most common cause of "model doesn't show up in the client."
:::

### Register the App

Add the new app to `INSTALLED_APPS`. The copier template's settings use {@api py:function:vueda.core.default_settings.get_defaults} from VUEDA, which sets up `INSTALLED_APPS` with VUEDA's required apps plus any apps listed in `LOCAL_APPS` from `config.toml` (the scaffolded `users` app is already registered there). You need to add your new app as well.

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

Since VUEDA enforces {@term CRUDL} permissions by default, the quickest path is to log in as a superuser.

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

Now test {@term CRUDL} on the inventory endpoints:

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

The scaffolded client has Vue, Pinia, vue-router, and VUEDA's action router wired up. Next, add the server connection, {@term CRUDL} data adapters, PrimeVue, a sign-in view, and {@term CRUDL View Resolution}.

### Connect to the Server

During local development the client dev server and Django run on different ports. The scaffolded `client/.env.development` already contains `VITE_DJANGO_CONNECTION_PORT` set to the port you chose during scaffolding, so VUEDA knows where to reach the Django server. No Vite proxy is needed; the template's `config.toml` already includes the client origin in `CORS_ALLOWED_ORIGINS`.

### Set Up Tailwind CSS

The scaffolded `client/src/index.css` is empty. The `vueda-tailwind` theme maps component slots to Tailwind utility classes, so Tailwind must be configured to generate CSS for those classes.

Replace `client/src/index.css` with:

```css
@import "tailwindcss";
@import "@vueda/theme/vueda-tailwind/base.css";
```

The `@vueda/theme/vueda-tailwind/base.css` import defines the semantic color tokens (`foreground`, `background`, `primary`, `muted`, `sidebar`, and related variants) that the theme relies on. If your project already provides these tokens (for example, from a custom design system), you can omit that import.

### Register Plugins

Replace `client/src/main.js` with:

```javascript
import TheApp from "./TheApp.vue";
import { getRouter } from "./router/index.js";
import Aura from "@primeuix/themes/aura";
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { setTheme } from "@vueda/use/useTheme.js";
import { setupDefaultListCrud } from "@vueda/utils/listCrud.js";
import { setupDefaultObjectCrud } from "@vueda/utils/objectCrud.js";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import ConfirmationService from "primevue/confirmationservice";
import Tooltip from "primevue/tooltip";
import { createApp } from "vue";

setTheme(vuedaTailwind);
setupDefaultListCrud();
setupDefaultObjectCrud();

const app = createApp(TheApp);
const pinia = createPinia();
const router = getRouter(app, pinia);

app.use(pinia);
app.use(router);
app.use(PrimeVue, {
    theme: {
        preset: Aura,
    },
});
app.use(ConfirmationService);
app.directive("tooltip", Tooltip);

app.mount("#the-app");

export default app;
```

`setTheme(vuedaTailwind)` registers the built-in Tailwind CSS theme so that all VUEDA components receive their default styling classes. The theme system is CSS-framework-agnostic; `vuedaTailwind` is a first-party preset that maps component slots to Tailwind utility classes. {@api js:function:@arrai-innovations/vueda/utils/listCrud#setupDefaultListCrud} and {@api js:function:@arrai-innovations/vueda/utils/objectCrud#setupDefaultObjectCrud} register the HTTP adapters that VUEDA's composables use for every CRUDL operation. See [Client Plugin Prerequisites](/guides/client-plugin-prerequisites) for details on each plugin.

### Add a Sign-In View

The scaffolded router's `authRedirect` points to a `sign-in` route that does not exist yet. Create `client/src/views/ViewSignIn.vue`:

```vue
<script setup>
import AuthorizingForm from "@vueda/components/AuthorizingForm.vue";
import { ControlButton } from "@vueda/controls/button";
import FormField from "@vueda/fields/FormField.vue";
import { storeUser } from "@vueda/stores/storeUser.js";
import WidgetTextInput from "@vueda/widgets/WidgetTextInput.vue";

const userStore = storeUser();

function login({ formValues }) {
    return userStore.login(formValues);
}
</script>

<template>
    <AuthorizingForm header="Sign In" :run-action="login">
        <template #action-form-inner>
            <FormField name="email" label="Email" required>
                <WidgetTextInput />
            </FormField>
            <FormField name="password" label="Password" required>
                <WidgetTextInput type="password" />
            </FormField>
        </template>
        <template #action-bar>
            <ControlButton type="submit">Sign In</ControlButton>
        </template>
    </AuthorizingForm>
</template>
```

{@api vue:component:AuthorizingForm} handles form state, watches {@api js:function:@arrai-innovations/vueda/stores/storeUser#storeUser} for login, and redirects to the `welcome` route on success. {@api vue:component:FormField} and {@api vue:component:WidgetTextInput} register fields in the form context so their values are collected into `formValues` on submit. See [Build Auth Views](/guides/build-auth-views) for more on auth view patterns.

### Add a Welcome View

After sign-in, `AuthorizingForm` redirects to the route named `welcome`. Create `client/src/views/ViewWelcome.vue`:

```vue
<script setup>
import { storeUser } from "@vueda/stores/storeUser.js";
import { computed } from "vue";

const userStore = storeUser();
const displayName = computed(() => userStore.user?.first_name || userStore.user?.email || "there");
</script>

<template>
    <div style="padding: 2rem">
        <h1>Welcome, {{ displayName }}</h1>
        <p>
            You are signed in. Try navigating to
            <RouterLink to="/inventory/product/list/">Products</RouterLink>
            to see the inventory list.
        </p>
    </div>
</template>
```

### Configure CRUDL View Resolution and Routes

The scaffolded router calls {@api js:function:@arrai-innovations/vueda/router/routerComponent#setCrudComponents} with an empty object and has no routes for `sign-in` or `welcome`. Replace `client/src/router/index.js` with:

```javascript
import { requireInitialized } from "@vueda/router/guards.js";
import { makeCRUDRoutes } from "@vueda/router/makeCrud.js";
import { setCrudComponents } from "@vueda/router/routerComponent.js";
import { createRouter, createWebHistory } from "vue-router";

export function getRouter(app, pinia) {
    const crudComponents = {
        list: async () => (await import("@vueda/views/ViewList.vue")).default,
        create: async () => (await import("@vueda/views/ViewCreate.vue")).default,
        read: async () => (await import("@vueda/views/ViewRead.vue")).default,
        update: async () => (await import("@vueda/views/ViewUpdate.vue")).default,
        destroy: async () => (await import("@vueda/views/ViewDestroy.vue")).default,
    };
    setCrudComponents(crudComponents);

    const router = createRouter({
        history: createWebHistory(import.meta.env.BASE_URL),
        routes: [],
    });

    const routes = [
        {
            path: "/sign-in/",
            name: "sign-in",
            component: () => import("@/views/ViewSignIn.vue"),
            meta: { title: "Sign In" },
        },
        {
            path: "/welcome/",
            name: "welcome",
            component: () => import("@/views/ViewWelcome.vue"),
            meta: { title: "Welcome" },
            beforeEnter: () => requireInitialized(router, pinia),
        },
        ...makeCRUDRoutes({
            component: async () => (await import("@vueda/views/ViewActionRouter.vue")).default,
            authRedirect: { name: "sign-in" },
            groupsRedirect: { name: "welcome" },
            actionRedirect: { name: "not-found" },
            groups: [],
            vueApp: app,
            router,
            pinia,
        }),
        {
            path: "/:pathMatch(.*)*",
            name: "not-found",
            component: async () => (await import("@vueda/views/ViewNotFound.vue")).default,
            meta: {
                title: "Not Found",
                titles: {
                    view: "Not Found",
                },
            },
            beforeEnter: () => requireInitialized(router, pinia),
            props: (route) => {
                return {
                    ...(route.params || {}),
                    ...(route.query || {}),
                    title: route.meta.title,
                };
            },
        },
    ];

    for (const route of routes) {
        router.addRoute(route);
    }

    return router;
}
```

`crudComponents` maps each {@term CRUDL} action to a built-in view ({@api vue:component:ViewList}, {@api vue:component:ViewCreate}, {@api vue:component:ViewRead}, {@api vue:component:ViewUpdate}, {@api vue:component:ViewDestroy}). {@api vue:component:ViewActionRouter} uses this map to resolve which component to render. These views auto-discover fields, filters, and permissions from {@term Model Info}, so no per-model client code is needed for a working baseline. See [Routing and View Resolution](/core-concepts/routing-and-view-resolution-model) for the full resolution chain.

::: tip Per-model view overrides
In a real project you may want a custom view for a specific model. The common pattern is a dynamic import with a fallback:

```javascript
list: async ({ app, model }) => {
    try {
        return (await import(`@/views/ViewList${pascal(app)}${pascal(model)}.vue`)).default;
    } catch {
        return (await import("@vueda/views/ViewList.vue")).default;
    }
},
```

This lets you drop in a `ViewListInventoryProduct.vue` for one model while every other model keeps the default. See [Creating a CRUDL Surface](/guides/create-crudl-surface) for details.
:::

### Verify in the Browser

Start both servers if they are not already running:

```console
# DX template
just serve

# Minimal template (two terminals)
cd server && uv run gunicorn config.asgi -k uvicorn.workers.UvicornWorker --reload --bind localhost:8000
cd client && pnpm dev
```

Open `http://localhost:5173` in your browser.

1. You should be redirected to `/sign-in/` (not authenticated yet).
2. Sign in with the superuser credentials you created earlier.
3. After login you should land on `/welcome/`.
4. Click the "Products" link (or navigate to `http://localhost:5173/inventory/product/list/`). If you created products via curl earlier, they appear here. To reach other models, the client URL pattern is `/{app_label}/{model}/list/`, where `{model}` comes from model-info and follows Django's `model_name` convention: the class name lowercased with no separators. For example, `ProductOption` becomes `productoption`, so its list URL is `/inventory/productoption/list/`. This is separate from the server-side DRF router prefix (e.g. `product-options`), which controls the REST API path.
5. Use the "Create" action to add a product and verify it appears in the list.
6. Click a product row to open the read view, then try update and destroy.

### Customize with Model Config

The built-in views render every field the serializer exposes. To adjust which fields appear, set sort defaults, or reorder columns without building custom views, use {@api js:function:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig}.

Create `client/src/setupModelConfig.js`:

```javascript
import { storeModelConfig } from "@vueda/stores/storeModelConfig.js";

export function setupModelConfig() {
    const modelConfig = storeModelConfig();

    modelConfig.setConfig(
        { app: "inventory", model: "product" },
        {
            displayFields: ["name", "sku", "description"],
            sorted: ["name"],
        },
        {
            create: {
                fields: ["name", "sku", "description"],
            },
        },
    );
}
```

Then call it from `main.js` after `app.use(pinia)`:

```javascript
import { setupModelConfig } from "./setupModelConfig.js";

// ... after app.use(pinia)
setupModelConfig();
```

The `fields` shorthand sets `displayFields`, `fetchFields`, and `submitFields` together. Per-view configs (keyed by action name) merge on top of the generic config. See [Configure CRUDL Views](/guides/configure-crud-views) for all available options.
