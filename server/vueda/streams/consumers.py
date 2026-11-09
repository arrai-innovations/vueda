"""The websocket consumer for VUEDA object stream subscriptions."""

__all__ = (
    "SESSION_LOGOUT_CLOSE_CODE",
    "SESSION_LOGOUT_MESSAGE_TYPE",
    "VuedaObjectStreamConsumer",
    "session_group_name",
)

import hashlib
from collections.abc import Mapping

from django.apps import apps
from object_streams.transports.channels import ObjectStreamConsumer


#: The Channels message type that closes every socket of a session that logged out.
SESSION_LOGOUT_MESSAGE_TYPE = "vueda.session.logout"

#: The websocket close code for a socket whose session logged out. Codes 4000 to 4999 are free for applications.
SESSION_LOGOUT_CLOSE_CODE = 4401


def session_group_name(session_key):
    """
    Return the Channels group that holds the sockets of one session.

    The name carries a hash of the session key, so the key itself never reaches the channel layer.
    """
    return "vueda-streams-session-" + hashlib.sha256(session_key.encode()).hexdigest()[:40]


def canonical_model_label(value):
    """
    Return the ``app_label.ModelName`` label for a model that a client names.

    The client names a model the way VUEDA's routes do: the app label, then the lower-case model
    name, which may separate words with underscores, as in ``store.customer_order``. The
    subscription registry matches labels exactly, so a subscription must use the model's own label,
    ``store.CustomerOrder``. A value that names no installed model is returned unchanged, and the
    registry rejects it.
    """
    if not isinstance(value, str) or "." not in value:
        return value
    app_label, model_name = value.split(".", 1)
    try:
        model = apps.get_model(app_label, model_name.replace("_", ""))
    except LookupError:
        return value
    return model._meta.label


class VuedaObjectStreamConsumer(ObjectStreamConsumer):
    """
    Accept a websocket connection only for a signed-in user.

    The connection authenticates with the same session cookie as the REST API, at connect time.
    ``AsgiMiddlewareStack`` reads that cookie into ``scope["user"]``. The socket has no login message
    of its own, so a connection without a signed-in user is refused before it is accepted, and the
    browser sees a failed handshake.

    Visibility still applies per subscription. Refusing anonymous connections also keeps them from
    holding a connection open at all.

    A subscribe message may name its model the way VUEDA's routes do. The consumer replaces that
    name with the model's label before the subscription is checked.

    The socket joins a group for its session, and closes when that session logs out. The user is read
    once, when the socket opens, so without this a socket would outlive the session that opened it.
    """

    session_group = None

    async def connect(self):
        user = self.scope.get("user")
        if user is None or not user.is_authenticated:
            await self.close()
            return
        await super().connect()
        session_key = getattr(self.scope.get("session"), "session_key", None)
        if session_key and self.channel_layer is not None:
            self.session_group = session_group_name(session_key)
            await self.channel_layer.group_add(self.session_group, self.channel_name)

    async def disconnect(self, code):
        if self.session_group and self.channel_layer is not None:
            await self.channel_layer.group_discard(self.session_group, self.channel_name)
        await super().disconnect(code)

    async def vueda_session_logout(self, message):
        """Close the socket, because its session logged out."""
        await self.close(code=SESSION_LOGOUT_CLOSE_CODE)

    async def receive_json(self, content, **kwargs):
        if isinstance(content, Mapping) and content.get("op") == "subscribe":
            content = {**content, "model": canonical_model_label(content.get("model"))}
        await super().receive_json(content, **kwargs)
