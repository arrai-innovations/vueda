"""The websocket consumer for VUEDA object stream subscriptions."""

__all__ = ("VuedaObjectStreamConsumer",)

from collections.abc import Mapping

from django.apps import apps
from object_streams.transports.channels import ObjectStreamConsumer


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
    """

    async def connect(self):
        user = self.scope.get("user")
        if user is None or not user.is_authenticated:
            await self.close()
            return
        await super().connect()

    async def receive_json(self, content, **kwargs):
        if isinstance(content, Mapping) and content.get("op") == "subscribe":
            content = {**content, "model": canonical_model_label(content.get("model"))}
        await super().receive_json(content, **kwargs)
