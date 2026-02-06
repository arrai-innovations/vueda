# Getting Started

<!-- todo:
GOAL: VUEDA API + client talking to each other
Contents:
- Prereqs (short)
- Minimal repo layout (possibly even without monorepo justification)
- Server: install vueda, add urls, migrate
- Client: install vueda, point at API
- Run locally
- Stop
No:
- uv workspace philosophy
- eslint/prettier/ruff
- just/concurrently
- CI
- commitlint
- lefthook
- deep uv sync warnings

Link to new project structure, docs/project-structure.md:
`For the standard Arrai/VUEDA project layout and tooling, see Project Structure.`
-->

This guide documents the **supported, opinionated starting point** for a VUEDA-based project, focusing on the minimum install + configuration steps needed to get a VUEDA API server and a VUEDA client application talking to each other.

If you want a short “happy path” overview first, start with the [Quick Start](quick-start.md).

If you already have an existing Django or Vue project, this guide is still useful as a reference for how VUEDA expects projects to be structured, but it does not attempt to provide conversion steps.

By the end of this guide, you will have a running Django API and Vue client connected via VUEDA, exposing a simple inventory model end-to-end.

## Prerequisites

- [Python 3.11+](https://www.python.org/downloads/): for running the VUEDA Server
- [Node.js 20+](https://nodejs.org/en/download/): for running the VUEDA Client
- A [PostgreSQL](https://www.postgresql.org/) database: for hosting your application data
- A [Redis](https://redis.io/) instance: for caching and background task brokering
- [Git](https://git-scm.com/): for version control
- Access to the private package registries ([private PyPI](http://pypi.arrai.dev/) for `vueda`, [npm](https://www.npmjs.com/) for `@arrai-innovations/vueda`) <!-- todo: remove when public -->

## Recommended

- [`uv`](https://docs.astral.sh/uv/): for Python dependency management
- [`pnpm`](https://pnpm.io/): for Node.js dependency management
- [`just`](https://just.systems/man/en/introduction.html): for common developer CLI tooling

## Environment Setup

This guide assumes access to a [`bash`](https://www.gnu.org/software/bash/)-like shell (Linux, macOS, WSL2, etc.) for running commands. Adjust accordingly for other environments (PowerShell, cmd.exe, etc.).

### `pypi`

Before proceeding, configure credentials for Arrai’s private Python package index. These are required to install the `vueda` package.

```console
export UV_INDEX_ARRAI_USERNAME=your-username
export UV_INDEX_ARRAI_PASSWORD=your-password
```

### `npm`

Before proceeding, grab an NPM token for Arrai's shared npm user. This is required to install the private scoped VUEDA package, `@arrai-innovations/vueda`.

```console
export NPM_TOKEN=your-npm-token
```

You can also store this in an `.npmrc` file in your home directory (`~/.npmrc`):

```ini
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
```


> [!TIP]
> Add these environment variables to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.) to persist them across sessions.
> 
> You could also prefer using a tool like [`direnv`](https://direnv.net/) to manage environment variables on a per-project basis.


## Project Scaffolding for this Guide

VUEDA has two `copier` templates for scaffolding a new implementor project, one with a full set of recommended DX tooling, and one minimal template without any opinionated tooling.

```console
# Implementor Monorepo with DX Tooling
uvx copier copy --vcs-ref=HEAD gh:arrai-innovations/vueda/templates/implementor-monorepo-dx ./your-project

# Implementor Monorepo Minimal
uvx copier copy --vcs-ref=HEAD gh:arrai-innovations/vueda/templates/implementor-monorepo ./your-project
```

The template generates the repo layout and the minimum wiring (Django settings + URLs, Vite + router stubs) so you can jump straight to running the stack.

## Install Dependencies

From your new project root:

### DX template (`implementor-monorepo-dx`)

```console
cd your-project
just bootstrap
```

### Minimal template (`implementor-monorepo`)

```console
cd your-project
uv sync --all-packages
pnpm install
```

## Checkpoint: First Contact

At this point, we have a minimal VUEDA server and client setup.
- Django should start without errors
- The VUEDA API routes should be reachable under `/routes/`
- Vite should start without errors
- The Vue app should load in a browser

Let's verify that everything is wired up correctly.

> [!TIP]
> We use `0.0.0.0` for binding instead of `localhost` to ensure that the services are reachable from WSL2, Docker containers, or other network contexts. Your mileage may vary depending on your development environment, you may need to adjust the curl urls we use later for an appropriate hostname or IP address. For example, Arrai devs have `<your-machine-name>.arrai.com` set up to work correct in both the WSL and host machines via etc hosts files. 
> 
> The remainer of this guide will use `localhost` for simplicity.

Before starting the server, ensure `server/config.local.toml` has values for `SECRET_KEY` and `DATABASE_URL`.

You can run both the server and client concurrently when using the DX template via:

```console
just serve
```

Otherwise, start the VUEDA server in one console:

```
cd server
uv run python manage.py migrate
uv run python manage.py runserver localhost:8000
```

In another console, start the VUEDA client:

```console
cd client
pnpm dev
```

The `pnpm dev` command uses the client port you set up in the copier options, which defaults to `5173`.

> [!TIP]
> These ports are arbitrary, you can choose any free ports on your machine. Just ensure that the client is configured to talk to the server on the correct port (we will cover that later). You may have network/firewall restrictions on your machine necessitating different ports.

And in a third console, let's use `curl` to verify that the VUEDA server is responding:

```console
curl -i http://localhost:8000/routes/vueda.user/who-is/
```

You should get a 200 level response, with an empty JSON object, indicating that the server is up and running, but that you are not authenticated.

For the client, open your browser and navigate to `http://localhost:5173`. You should see a blank page (since we have not added any routes or components yet), but there should be no errors in the console.

> [!WARNING]
> If you are having issues from here, you should consult Django or Vite documentation for troubleshooting tips, or a system administrator for networking problems, as the issues are likely outside the scope of this guide.

<!-- todo: time to switch into VUEDA concepts -->

## VUEDA Server

With the boilerplate in place, we can now start our implementation of the VUEDA Server. For this guide, we will add several simple models in the same Django app to demonstrate VUEDA's capabilities.

### Create a Django App

Let's add a new Django app under the `your_project` namespace. In `server/your_project/`, create a new folder called `inventory`, and inside it, create the necessary files:
- a `__init__.py` file to make it a package,
- a `models.py` file for our data models,
- a `serializers.py` file for our DRF serializers,
- a `viewsets.py` file for our DRF viewsets,
- a `filtersets.py` file for our DRF filtersets,
- a `routers.py` file for our app's router,
- a `urls.py` file for our app's URL routing.

In VUEDA, we have our own extensions of Django's `Model` class, `VuedaBaseModel`, which adds:
- an expected `formatted_name` `GeneratedField`, by default based on a model's `name` field,
- a custom `BaseModelMeta` class which sets up default_permissions in VUEDA's expected way.

> [!IMPORTANT]
> VUEDA uses create, read, update, delete and list permissions, which aligns better with `djangorestframework`'s viewset actions than Django's default add, change, delete, and view permissions. All VUEDA models must therefore inherit from `VuedaBaseModel` to ensure proper permission handling, and must have a `class Meta(VuedaBaseModel.Meta)` by default.

VUEDA also provides a `Lookup` base model, which adds a unique `code` field to the model, and is intended for lightweight, potentially user defined, reference data tables.

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
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="options")
    option_type = models.ForeignKey(OptionType, on_delete=models.PROTECT, related_name="product_options")
    name = models.CharField(max_length=255)
    value = models.CharField(max_length=255)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta(BaseModelMeta):
        ordering = ["sort_order", "id"]
```

With the models defined, we can create serializers for them using VUEDA's `VuedaSerializer` base class. There is also `VuedaLookupSerializer` for lookup models, handling the boilerplate around the `code` field.

> [!IMPORTANT]
> As with models, all VUEDA serializers should have a `class Meta(VuedaSerializer.Meta)` or `class Meta(VuedaLookupSerializer.Meta)` to ensure proper default behavior.

`server/your_project/inventory/serializers.py`:
```python
from vueda.core.serializers import VuedaLookupSerializer, VuedaSerializer

from your_project.inventory.models import OptionType, Product, ProductOption


class ProductSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = Product
        fields = ["id", "name", "sku", "description", "formatted_name", "available_actions"]


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

A serializer is nice, but a viewset is needed to expose it via the API. VUEDA provides `VuedaViewSet` base class which:
- sets up default behavior for CRUDL actions,
- integrates with VUEDA's permission system,
- extends DRF's `ModelViewSet`, to cause more intentional errors when passing extra query parameters or fields. We found that there was a tendency with new developers to think that since something didn't error, it must be allowed/work...
- provides row level filtering hooks.
- integration and extension for [`drf-flex-fields`](https://github.com/rsinger86/drf-flex-fields), adding `permit_{action}_expands` beyond the default which only supports `permit_list_expands` in a hardcoded way.

`server/your_project/inventory/viewsets.py`:
```python
from vueda.core.viewsets import VuedaViewSet

from your_project.inventory.filtersets import OptionTypeFilterSet, ProductFilterSet, ProductOptionFilterSet
from your_project.inventory.models import OptionType, Product, ProductOption
from your_project.inventory.serializers import OptionTypeSerializer, ProductOptionSerializer, ProductSerializer


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

And, as implied above, we can create filtersets for each viewset using VUEDA's `VuedaFilterSet` base class.

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

To wire up viewsets to URLs, we use `VuedaRouter`, which:
- builds on DRF’s `SimpleRouter` to generate the standard CRUD routes
- namespaces route names with the app label via `IncludeAppInRouteNameRouter`
- adds “bulk” actions: `@action(bulk=True)` (`vueda.core.decorators.action`) routes the action at the collection URL (no lookup), so a single action name can handle single-object (via `pk`) or multi-object (via a list of PKs in the body)

`server/your_project/inventory/routers.py`:
```python
from vueda.core.routers import VuedaRouter

from your_project.inventory.viewsets import OptionTypeViewSet, ProductOptionViewSet, ProductViewSet

router = VuedaRouter()
router.register(r"products", ProductViewSet)
router.register(r"option-types", OptionTypeViewSet)
router.register(r"product-options", ProductOptionViewSet)
urlpatterns = router.urls
```

Finally, we can wire up the app's URLs in `server/your_project/inventory/urls.py`:
```python
from django.urls import include
from django.urls import path

from your_project.inventory.routers import urlpatterns

urlpatterns = [
    path("", include(urlpatterns)),
]
```

We should also include the app's URLs in the project's main URL configuration, `server/config/urls.py`, which we have not shown yet. Let's add that now:
```diff
-        # Application routes go here
-        # path("blog/", include("your_project.blog.urls")),
+        # Application routes
+        path("inventory/", include("your_project.inventory.urls")),
```

### Verify the New API Endpoints

With the server code in place, we can now verify that the new API endpoints are reachable. Since VUEDA enforces CRUDL permissions by default, the quickest path is to log in as a superuser and then run a few curl requests.

```console
uv run --project server python server/manage.py createsuperuser
```

Then, in a new terminal, login via curl and store the session cookie:
```console
# get a csrf cookie (who-is always sets one)
COOKIE_JAR=/tmp/vueda-cookies.txt
curl -c $COOKIE_JAR -s http://localhost:8000/routes/vueda.user/who-is/ > /dev/null
CSRF_TOKEN=$(awk '/csrftoken/ {print $7}' $COOKIE_JAR)

# login (uses email + password)
curl -b $COOKIE_JAR -c $COOKIE_JAR \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: $CSRF_TOKEN" \
  -X POST http://localhost:8000/routes/vueda.user/login/ \
  -d '{"email":"you@example.com","password":"your-password"}'
```

If the login succeeded, `who-is` should return your user info:
```console
curl -b $COOKIE_JAR http://localhost:8000/routes/vueda.user/who-is/
```

Now you can test CRUDL on the inventory endpoints:
```console
# create
curl -b $COOKIE_JAR -c $COOKIE_JAR \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: $CSRF_TOKEN" \
  -X POST http://localhost:8000/routes/inventory/products/ \
  -d '{"name":"Starter Kit","sku":"STARTER-001","description":"Demo product"}'
# expect a 201 response with the created object

# list
curl -b $COOKIE_JAR http://localhost:8000/routes/inventory/products/
# expect a 200 response with a list including the created object

# retrieve
curl -b $COOKIE_JAR http://localhost:8000/routes/inventory/products/1/
# expect a 200 response with the created object

# partial update
curl -b $COOKIE_JAR -c $COOKIE_JAR \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: $CSRF_TOKEN" \
  -X PATCH http://localhost:8000/routes/inventory/products/1/ \
  -d '{"description":"Updated description"}'
# expect a 200 response with the updated object

# delete
curl -b $COOKIE_JAR -c $COOKIE_JAR \
  -H "X-CSRFToken: $CSRF_TOKEN" \
  -X DELETE http://localhost:8000/routes/inventory/products/1/
# expect a 204 response with no content
```

## VUEDA Client

With the server-side API in place, we can now proceed to implement the VUEDA Client to interact with it.

<!-- todo: inventory overview -->
### Configure the Client to Talk to the Server
VUEDA's client library needs to know where the API server is located. This is configured via environment variables.

In `client/.env.development`, set the following variables:
```ini
VITE_CSRF_COOKIE_NAME=your-project-csrf-token
VITE_DJANGO_CONNECTION_PORT=8000
```

And a production equivalent in `client/.env.production`:
```ini
VITE_CSRF_COOKIE_NAME=csrftoken
VITE_DJANGO_CONNECTION_PORT=
```

> [!TIP]
> Django's default CSRF cookie name is `csrftoken`. We use a project specific name in local dev to avoid conflicts when developing multiple VUEDA/Django projects on the same machine.

### Routes

VUEDA does not require a specific client-side routing structure. Instead, it provides a small router module that can generate CRUD routes dynamically based on the server-side models and viewsets exposed by the VUEDA API.

This section focuses on wiring up routing, not on layouts or UI design.

#### Why VUEDA Generates Routes

On the server, VUEDA builds a predictable API surface from Django models, serializers, viewsets, and filters.  
On the client, VUEDA mirrors that structure by generating routes for common create, read, update, delete, list (CRUD/CRUDL) actions and custom actions.

Rather than defining these routes manually for each model, VUEDA provides a route factory that builds them automatically and routes them through a shared "action router" view.

#### CRUD Components

Before generating routes, we define how VUEDA should resolve components for each action.

In the stub `client/src/router/index.js`, we had you define a `crudComponents` map and registering it globally:
```js
const crudComponents = {}; // to be filled in later
setCrudComponents(crudComponents);
```

`crudComponents` is a map of action names → resolver function. The resolver returns a Vue component, usually via dynamic import to enable code splitting / lazy loading. The common pattern is to use a model-specific component if one exists, otherwise fall back to a shared action specific default. To display a not-found view for missing actions, this must be handled explicitly in the action resolver. Returning `null` or `undefined` from a resolver will result in an empty render. VUEDA ships a `ViewActionNotFound.vue` component for this purpose. It inspects the available model actions and attempts to suggest the closest valid action based on lexical similarity.

An example `crudComponents` map for common VUEDA actions would look like this:
```js
const crudComponents = {
  list: async (argsObj) => {
    try {
      return (
              await import(
                      `@/views/ViewList${getPascalCaseName(argsObj.app)}${getPascalCaseName(argsObj.model)}.vue`
                      )
      ).default;
    } catch {
      return (await import("@/components/DefaultViewList.vue")).default;
    }
  },
  create: async (argsObj) => {
    try {
      return (
              await import(
                      `@/views/ViewCreate${getPascalCaseName(argsObj.app)}${getPascalCaseName(argsObj.model)}.vue`
                      )
      ).default;
    } catch {
      return (await import("@/components/DefaultViewCreate.vue")).default;
    }
  },
  update: async (argsObj) => {
    try {
      return (
              await import(
                      `@/views/ViewUpdate${getPascalCaseName(argsObj.app)}${getPascalCaseName(argsObj.model)}.vue`
                      )
      ).default;
    } catch {
      return (await import("@/components/DefaultViewUpdate.vue")).default;
    }
  },
  read: async (argsObj) => {
    try {
      return (
              await import(
                      `@/views/ViewRead${getPascalCaseName(argsObj.app)}${getPascalCaseName(argsObj.model)}.vue`
                      )
      ).default;
    } catch {
      return (await import("@vueda/views/ViewRead.vue")).default;
    }
  },
  destroy: async (argsObj) => {
    try {
      return (
              await import(
                      `@/views/ViewDestroy${getPascalCaseName(argsObj.app)}${getPascalCaseName(argsObj.model)}.vue`
                      )
      ).default;
    } catch {
      return (await import("@/views/ViewDestroy.vue")).default;
    }
  },
}
```

The above example attempts to load model-specific views first, falling back to shared defaults if the model-specific view does not exist. This allows per-model customization without duplicating route definitions. We'll explore more about this kind of customization when we get into the views section later.

`setCrudComponents` is a VUEDA router utility which registers the components globally for action routing, via `makeCRUDRoutes` and `ViewActionRouter.vue`.

Also, in the example, we call `createRouter` with an empty `routes` array. We then use `router.addRoutes` later to add routes. We do this because certain route guards need access to the router instance at route creation time, particularly for redirecting to auth or group permission routes.

```js
const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [],
});

// add routes after so we can pass the router to router guards in makeCRUDRoutes
const routes = [
  // custom routes here
  {
    path: "/",
    name: "landing",
    beforeEnter: () => requireUnauth({ name: "welcome" }, router),
    redirect: { name: "sign-in" },
  },
  {
    path: "/welcome",
    name: "welcome",
    component: () => import("@/views/ViewWelcome.vue"),
    beforeEnter: (to) => requireAuth({ name: "sign-in" }, to, router),
  },
  {
    path: "/sign-in",
    name: "sign-in",
    component: () => import("@/views/ViewSignIn.vue"),
    props: (route) => ({
      redirect: route.query?.redirect,
    }),
  },
  {
    path: "/sign-out",
    name: "sign-out",
    component: () => import("@/views/ViewSignOut.vue"),
  },
  // setup action routes
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
  // not-found route
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
```

On the non-crud routes above, we also see examples of using router guards like `requireAuth` and `requireUnauth` to protect routes based on authentication state. These guards redirect to appropriate routes if the user is not authenticated or is already authenticated. Additionally, `requireGroups` and `requireModelInfo` are also examples of provided VUEDA route guards.

`makeCRUDRoutes` builds two action routes (detail + list), optionally namespacing them, then layers in auth, model‑info, and group‑permission guards so access control and error handling are consistent across all CRUD actions. It is the entry points for action routing that `ViewActionRouter.vue` uses to resolve the appropriate view component at runtime.

`ViewActionRouter.vue` is a convention-over-configuration layer on top of `vue-router`. Instead of each project defining a large matrix of `app / model / action` routes, it resolves the appropriate action view at runtime using model configuration and workflow transitions. In combination with the action mapping function earlier, it provides a predictable override chain (`app + model + action` → `action` → `default`) and standardizes loading, not-found, and transition handling so CRUD views behave consistently across projects. This keeps routing declarative while allowing per-model customization without duplicating route definitions.


<!-- todo: finish the docs from here -->
