---
title: Set Up Websocket Subscriptions
type: how-to
audience: integrator
status: draft
---

# Set Up Websocket Subscriptions

A websocket subscription tells a signed-in client that a record changed. The message carries no record data. The client fetches the record again through the REST API, which applies the same permissions as before.

Subscriptions are optional, and the scaffolded project does not enable them. Every view works without them. This guide covers settings, ASGI routing, change capture, the listener process, the proxy, and the client.

Subscriptions add two parts to a deployment:

- **A Redis channel layer.** Web processes and the listener exchange messages through it.
- **A listener process.** It runs `manage.py object_streams_listen` beside the web processes. Without it, subscriptions succeed and no change ever arrives.

## Install the Extra

Add the `streams` extra and the Redis channel layer to `server/pyproject.toml`:

```toml
dependencies = [
    "vueda[redis,streams] >=3.0.0b1,<4",
    "channels-redis >=4.2.0,<5",
]
```

The `streams` extra installs `django-object-streams`, which provides the capture triggers, the outbox table, and the subscription protocol.

## Turn on the App

Pass `use_streams=True` to `get_defaults` in `config/settings/base.py`:

```python
locals().update(get_defaults(env, use_streams=True))
```

The keyword adds `vueda.streams` and the `object_streams` app to `INSTALLED_APPS`. In a project that uses workflows, it also adds `vueda.workflow.streams`, which reports state transitions to subscribers of the governed record. Startup fails with `ImproperlyConfigured` when `vueda.streams` is installed some other way without those apps.

Then point the channel layer at Redis, in the same file:

```python
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [env("CHANNEL_LAYER_URL")],
            "prefix": "widgets-streams",
        },
    },
}
```

`CHANNEL_LAYER_URL` is a key in your own config files, such as `redis://localhost:6379/0`. Give each deployment its own `prefix`, so two applications on one Redis server do not share channel groups.

The socket signs the user in with the same session cookie as the REST API, read once when the socket opens. A socket served by one web process must read a session that another process wrote, so sessions need a store that every process shares. [Configure the Cache and Sessions](configure-cache-and-sessions.md) covers that requirement.

## Route the Websocket

Replace `config/asgi.py` with a router that sends websocket connections to VUEDA:

```python
import os

from channels.routing import ProtocolTypeRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django_asgi_app = get_asgi_application()

from vueda.streams.routing import stream_websocket_application  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": stream_websocket_application(),
    }
)
```

Import the routing module after `get_asgi_application()`, which sets up Django.

The socket path is `ws/streams/` at the server root. `stream_websocket_application()` refuses a handshake in three cases:

- **Unknown origin.** The `Origin` header must match `ALLOWED_HOSTS` or `CORS_ALLOWED_ORIGINS`. `CORS_ALLOWED_ORIGIN_REGEXES` is not read. The scaffolded `config.local.toml` already lists the Vite development server in `CORS_ALLOWED_ORIGINS`.
- **No signed-in user.** The socket has no login message of its own.
- **No route.** Any other path.

Serve `config.asgi:application` with an ASGI server that supports websockets. The scaffolded `just serve-server` recipe runs uvicorn, which does. A WSGI server cannot serve the socket.

## Capture Changes on a Model

Add a `Streams` section to the model's `class Vueda`:

```python
class Widget(VuedaModel):
    class Vueda:
        class Streams:
            enabled = True
```

The section adds a database trigger that records every insert, update, and delete on the model's table in an outbox table. The trigger also records bulk writes, `QuerySet.update()`, and deletes, which Django signals miss. A model with a composite primary key cannot enable the section.

Run `makemigrations`, then add the `object_streams` app's latest migration to the new migration's `dependencies` by hand:

```python
dependencies = [
    ("widgets", "0007_previous"),
    ("object_streams", "0003_delivery_cursor"),
]
```

`makemigrations` does not add that dependency, because Django cannot see that the trigger writes to the outbox table. Without it, Django may apply the migration before the outbox table exists, and a later data migration that writes to the model fails.

## Register the Model for Subscriptions

Capture alone does not let a client subscribe. Register the model's viewset from your `AppConfig.ready()`:

```python
from django.apps import AppConfig


class WidgetsConfig(AppConfig):
    name = "widgets"

    def ready(self):
        from vueda.streams.registry import register_viewset

        from widgets.viewsets import WidgetViewSet

        register_viewset(WidgetViewSet)
```

Registration reuses the viewset's queryset and FilterSet. A client can subscribe only to the filters that the list endpoint accepts, and receives a change only for a record that it may read. Subscriptions that filter by `search` are not supported.

## Run the Listener

The listener waits for PostgreSQL notifications from the capture triggers and sends each change through the channel layer:

```console
python manage.py object_streams_listen
```

Run it as a long-running service beside the web processes, for example as a `just` recipe in development:

```just
listen-streams:
  cd {{justfile_directory()}}/server && uv run --no-sync python manage.py object_streams_listen
```

It retries after a database error, every second by default. `--retry-delay` and `--max-retries` change that.

## Configure the Proxy

A reverse proxy in front of the web processes must pass the websocket upgrade for `/ws/streams/`.

Check its idle timeout too. The server sends no keepalive message, and a browser cannot send a websocket ping. A socket with no changes to report is idle, and a proxy closes it once the idle timeout passes. Both Apache (`ProxyTimeout`) and nginx (`proxy_read_timeout`) default to 60 seconds. Raise the timeout for the socket path.

## Turn on the Client

Call `setupObjectStreams()` in `client/src/main.js`, after the default CRUD adapters:

```js
import { setupObjectStreams } from "@vueda/utils/objectStreams.js";

setupDefaultListCrud();
setupDefaultObjectCrud();
setupObjectStreams();
```

A read view then subscribes to its record. After each change, it fetches the record again through the REST API and shows the new values. When someone deletes the record, the view keeps the last values and shows a notice. The `deleted-notice` slot of `ViewRead` replaces it.

A list view subscribes with its filters, and the server reports each row that joins, leaves, or changes within them. The list then fetches its current page again and swaps the rows in when the new page arrives. A search term is not part of the subscription, so a searched list refetches after a change to any row that its other filters match.

An update view never replaces what the user is editing. When someone else saves the record, it shows a notice with a **Reload** button, which loads the saved values and discards the user's edits. The view compares the saved record with the one it holds, so the user's own save raises no notice. When someone deletes the record, the notice says that saving will fail. The `change-notice` slot of `ViewUpdate` replaces the notice.

The client opens one socket, on the API host, when the first view subscribes, and closes it when the last one leaves. It reconnects after a lost connection, and again whenever the signed-in user changes, because the server reads the session only when a socket opens. A socket that fails leaves every view working as it did before.

The socket path defaults to `/ws/streams/`. When your proxy serves it elsewhere, set `VITE_OBJECT_STREAMS_PATH` in the client's Vite environment. The proxy must forward that path to the server's `/ws/streams/` route.

## Verify the Setup

After migrating, check that every declared trigger is installed:

```console
python manage.py check --database default
```

The `object_streams.W001` warning names a trigger that was never migrated, and `object_streams.W002` names one that is out of date. A missing trigger captures nothing and raises no error.

To confirm capture and delivery, start the listener for one event, then save a record of a model that has the `Streams` section:

```console
python manage.py object_streams_listen --once --timeout 60
```

The listener prints `Broadcasted object stream event <id> at cursor <n>.` and exits. Without a change before the timeout, it exits with `No object stream notifications were received before the timeout.`
