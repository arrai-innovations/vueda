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

    Browsers apply no cross-origin rules to a websocket handshake. Whether a handshake from another
    site carries the session cookie depends only on the cookie's ``SameSite`` setting, so the server
    checks the ``Origin`` header itself. ``ALLOWED_HOSTS`` covers a client served by Django. The CORS
    list covers a client served from its own origin, which the REST API already trusts. This function
    does not read ``CORS_ALLOWED_ORIGIN_REGEXES``.

    A host name in ``ALLOWED_HOSTS`` matches an origin with any scheme and port, and ``"*"`` matches
    every origin, which turns the check off.
    """
    return [*settings.ALLOWED_HOSTS, *getattr(settings, "CORS_ALLOWED_ORIGINS", ())]


def stream_websocket_application():
    """
    Return the websocket application: origin check, then session authentication, then routing.

    The origin check runs first, so the application refuses a handshake from another site before it
    reads the handshake's cookie.
    """
    return OriginValidator(
        AsgiMiddlewareStack(URLRouter(websocket_urlpatterns)),
        allowed_websocket_origins(),
    )
