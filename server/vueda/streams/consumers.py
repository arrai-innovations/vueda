"""The websocket consumer for VUEDA object stream subscriptions."""

__all__ = ("VuedaObjectStreamConsumer",)

from object_streams.transports.channels import ObjectStreamConsumer


class VuedaObjectStreamConsumer(ObjectStreamConsumer):
    """
    Accept a websocket connection only for a signed-in user.

    The connection authenticates with the same session cookie as the REST API, at connect time.
    ``AsgiMiddlewareStack`` reads that cookie into ``scope["user"]``. The socket has no login message
    of its own, so a connection without a signed-in user is refused before it is accepted, and the
    browser sees a failed handshake.

    Visibility still applies per subscription. Refusing anonymous connections also keeps them from
    holding a connection open at all.
    """

    async def connect(self):
        user = self.scope.get("user")
        if user is None or not user.is_authenticated:
            await self.close()
            return
        await super().connect()
