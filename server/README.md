# VUEDA Server

<a href="https://vueda.dev">
    <img src="https://vueda.dev/v3/assets/logo-text-solid.png" alt="VUEDA: Vue.js User Experience for Django Administration" width="420">
</a>

[vueda.dev](https://vueda.dev) · [Documentation](https://vueda.dev/v3/) · [Start building](https://vueda.dev/v3/tutorials/start-building.html) · [Server changelog](https://vueda.dev/v3/reference/changelog/server.html)

VUEDA Server provides the Django REST framework backend for VUEDA, a framework
for building business applications with Django and Vue. It extends your models,
serializers, and viewsets with permissions, audit history, and metadata that
[VUEDA Client](https://github.com/arrai-innovations/vueda/tree/main/client) uses to
build forms, lists, detail screens, and routes. Metadata describes the models'
fields, actions, and permissions.

The Python package is `vueda`.

## What it provides

- **Django and REST framework base classes:** models, serializers, viewsets,
  filters, and routers with shared conventions for application APIs.
- **Model metadata:** field definitions, actions, filtering, ordering, and
  permissions for the Vue client.
- **Server authorization:** model and object permissions, including row-level
  filtering for lists.
- **Audit history:** track model changes and inspect the user actions behind them.
- **Authentication and account support:** Django authentication integration,
  account management, and multi-factor authentication.
- **Optional workflows:** states, transitions, and permissions for business
  processes, plus queued email and SMS delivery through the dispatch app.

Your application extends VUEDA's base classes to implement its business rules.
The server enforces authorization independently of what the client displays.

## Get started

VUEDA requires PostgreSQL. This version supports Python 3.11 to 3.14 and Django
5.2 to 6.1, subject to the dependency constraints in the package metadata.

For a new application, follow
[Start Building](https://vueda.dev/v3/tutorials/start-building.html). The starter
templates configure the Django and Vue projects, and the tutorial adds an
inventory model from end to end.

To add the server to an existing project, first configure
[package registry access](https://vueda.dev/v3/tutorials/start-building.html#package-registry-access),
then install with uv:

```console
uv add --prerelease allow vueda
```

The v3 series is currently a prerelease. Use the documentation for the major
version installed in your application.

Installation is followed by Django settings, user-model, URL, and client setup.
Use the [architecture overview](https://vueda.dev/v3/core-concepts/architecture-overview.html)
to understand the required apps and conventions, and the tutorial for a complete
starting configuration.

## Define a model and its API

In an application already configured for VUEDA, the model, serializer, and
viewset follow familiar Django and REST framework patterns.

```python
# models.py
from django.db import models
from vueda.core.models import BaseModelMeta, VuedaModel


class Product(VuedaModel):
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=64, unique=True)
    description = models.TextField(blank=True)

    class Meta(BaseModelMeta):
        ordering = ["name", "id"]
```

```python
# serializers.py
from vueda.core.serializers import VuedaSerializer
from .models import Product


class ProductSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = Product
        fields = [*VuedaSerializer.Meta.fields, "id", "name", "sku", "description"]
```

```python
# viewsets.py
from vueda.core.viewsets import VuedaViewSet
from .models import Product
from .serializers import ProductSerializer


class ProductViewSet(VuedaViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
```

To make this API discoverable by the client, register the serializer and viewset
in your app's `AppConfig.ready()` and expose the viewset through a `VuedaRouter`.
Apply migrations and assign permissions before accessing the model. The
[model API guide](https://vueda.dev/v3/guides/create-crudl-surface.html) covers
registration, URL wiring, filtering, and verification.

## Configure application behavior

- [Permission names](https://vueda.dev/v3/guides/permission-name-mapping.html):
  choose the Django/VUEDA mapping and configure the required `patch_django` import.
- [Row-level permissions](https://vueda.dev/v3/guides/implement-row-level-permissions.html):
  control access to individual records.
- [Group management](https://vueda.dev/v3/guides/manage-groups.html) and
  [workflow management](https://vueda.dev/v3/guides/manage-workflows.html):
  configure groups and workflows in the browser and generate migrations to carry
  those changes between environments.
- [Permissions and workflow overview](https://vueda.dev/v3/guides/permissions-workflow-overview.html):
  inspect access for groups and individual users.
- [Configuration reference](https://vueda.dev/v3/reference/configuration.html):
  settings and environment variables.

### Optional email and SMS dispatch

The VUEDA Dispatch Queue (`vueda.vdq`) tracks outbound messages through workflow
states. It requires `vueda.workflow`, a Celery worker, and a message broker
configured through `CELERY_BROKER_URL`. Set `VDQ_URL` for attachment links.

With your project's Django settings selected, start the worker and periodic
scheduler with:

```console
celery -A vueda.vdq.celery:app worker -l info -B
```

See the [dispatch model](https://vueda.dev/v3/core-concepts/vdq-and-background-work.html),
[email guide](https://vueda.dev/v3/guides/vdq-email-anymail.html), and
[SMS guide](https://vueda.dev/v3/guides/vdq-sms-twilio.html) for provider setup,
delivery tracking, and retries.

## Contributing

Development setup, PostgreSQL test configuration, and test commands live in the
[monorepo README](https://github.com/arrai-innovations/vueda#develop-vueda).
Read the [contribution guide](https://github.com/arrai-innovations/vueda/blob/main/CONTRIBUTING.md)
or [report an issue](https://github.com/arrai-innovations/vueda/issues).

Built by [Arrai Innovations](https://arrai.com), under the
[BSD 3-Clause license](https://github.com/arrai-innovations/vueda/blob/main/server/LICENSE).
