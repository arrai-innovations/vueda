"""Signal receivers for websocket subscriptions."""

__all__ = ("close_session_sockets",)

import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from vueda.streams.consumers import SESSION_LOGOUT_MESSAGE_TYPE
from vueda.streams.consumers import session_group_name


logger = logging.getLogger(__name__)


def close_session_sockets(sender, request, user, **kwargs):
    """
    Close the websockets of a session that logs out.

    Django sends ``user_logged_out`` before it flushes the session, so the session key still names
    the session's group. Logout succeeds even when the channel layer fails. In that case the receiver
    logs the error, and the sockets stay open until they close for another reason.
    """
    session_key = getattr(getattr(request, "session", None), "session_key", None)
    if not session_key:
        return
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    try:
        async_to_sync(channel_layer.group_send)(session_group_name(session_key), {"type": SESSION_LOGOUT_MESSAGE_TYPE})
    except Exception:
        logger.exception("Could not close the websockets of a session that logged out.")
