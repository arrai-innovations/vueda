"""Websocket routing for object stream subscriptions.

Add the websocket application to your ASGI router:

```python
from channels.routing import ProtocolTypeRouter
from django.core.asgi import get_asgi_application

django_asgi_app = get_asgi_application()

from vueda.streams.routing import stream_websocket_application  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": stream_websocket_application(),
    }
)
```

Import the routing module after ``get_asgi_application()``, which sets up Django.
"""

__all__ = (
    "STREAM_WEBSOCKET_PATH",
    "allowed_websocket_origins",
    "stream_websocket_application",
    "websocket_urlpatterns",
)

from channels.routing import URLRouter
from channels.security.websocket import OriginValidator
from django.conf import settings
from django.urls import path

from vueda.core.middleware import AsgiMiddlewareStack
from vueda.streams.consumers import VuedaObjectStreamConsumer


STREAM_WEBSOCKET_PATH = "ws/streams/"

websocket_urlpatterns = [
    path(STREAM_WEBSOCKET_PATH, VuedaObjectStreamConsumer.as_asgi(), name="vueda-object-streams"),
]


def allowed_websocket_origins():
    """
    Return the origins that may open a websocket: ``ALLOWED_HOSTS`` and ``CORS_ALLOWED_ORIGINS``.

    A browser sends the session cookie with a websocket handshake from any site, so the server must
    check the ``Origin`` header itself. ``ALLOWED_HOSTS`` covers a client served by Django. The CORS
    list covers a client served from its own origin, which the REST API already trusts.
    ``CORS_ALLOWED_ORIGIN_REGEXES`` is not read.
    """
    return [*settings.ALLOWED_HOSTS, *getattr(settings, "CORS_ALLOWED_ORIGINS", ())]


def stream_websocket_application():
    """
    Return the websocket application: origin check, then session authentication, then routing.

    The origin check runs first, so a handshake from another site is refused before its cookie is
    read.
    """
    return OriginValidator(
        AsgiMiddlewareStack(URLRouter(websocket_urlpatterns)),
        allowed_websocket_origins(),
    )
