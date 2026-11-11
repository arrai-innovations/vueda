"""
End-to-end delivery over a real websocket.

A forked Daphne process serves ``stream_websocket_application()`` on a local port. The test process
runs ``object_streams_listen`` in a thread and writes the order. The two processes share only
PostgreSQL and a Redis channel layer, as a deployed web process and listener do.

Needs ``channels-redis`` and a reachable Redis server. ``VUEDA_TEST_REDIS_URL`` names the server and
defaults to ``redis://localhost:6379/0``. Each test uses its own channel layer key prefix, so it
does not disturb other users of that Redis database. When the variable is unset and no Redis server
answers at the default, the tests skip. When the variable is set, the tests run and fail without
Redis, so a CI job that provides Redis cannot skip them silently.
"""

import asyncio
import json
import multiprocessing
import os
import threading
import time
import uuid
from decimal import Decimal
from http import HTTPStatus
from typing import ClassVar

import pytest
from django import db
from django.conf import settings
from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from django.core.management import call_command
from django.test import Client
from django.test import override_settings

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.store import models as store_models
from vueda.streams.consumers import SESSION_LOGOUT_CLOSE_CODE


aiohttp = pytest.importorskip("aiohttp")
pytest.importorskip("channels_redis")
redis = pytest.importorskip("redis")
daphne_testing = pytest.importorskip("daphne.testing")

REDIS_URL_REQUIRED = "VUEDA_TEST_REDIS_URL" in os.environ
REDIS_URL = os.environ.get("VUEDA_TEST_REDIS_URL", "redis://localhost:6379/0")
HOST = "localhost"
RECEIVE_TIMEOUT = 10.0


def redis_available():
    try:
        return redis.Redis.from_url(REDIS_URL, socket_connect_timeout=1).ping()
    except redis.RedisError:
        return False


pytestmark = pytest.mark.skipif(
    not REDIS_URL_REQUIRED and not redis_available(),
    reason=f"no Redis server at {REDIS_URL}, and VUEDA_TEST_REDIS_URL is unset",
)


class ForkedDaphneProcess(daphne_testing.DaphneProcess):
    """
    A Daphne server process that always starts by fork.

    The child must inherit the per-test database name and the overridden settings, which only fork
    copies. Python 3.14 changed the default start method on Linux to forkserver.
    """

    _start_method = "fork"
    _Popen = staticmethod(multiprocessing.get_context("fork").Process._Popen)


def make_stream_application():
    """
    Build the websocket application inside the server process.

    Registration happens here, in the forked child, so the default registry of the test process
    stays empty.
    """
    from tests.store.viewsets import CustomerOrderViewSet
    from vueda.streams.registry import register_viewset
    from vueda.streams.routing import stream_websocket_application

    register_viewset(CustomerOrderViewSet)
    return stream_websocket_application()


@pytest.fixture
def channel_layer_prefix():
    prefix = f"vueda-test-{uuid.uuid4().hex}"
    yield prefix
    client = redis.Redis.from_url(REDIS_URL)
    keys = list(client.scan_iter(match=f"{prefix}*"))
    if keys:
        client.delete(*keys)


@pytest.fixture
def stream_settings(channel_layer_prefix):
    """
    Settings that both processes need, applied before the server forks.

    Sessions use the database because the default cache backend is local to each process, so the
    server could not read a session that the test process created.
    """
    with override_settings(
        ALLOWED_HOSTS=[HOST],
        SESSION_ENGINE="django.contrib.sessions.backends.db",
        CHANNEL_LAYERS={
            "default": {
                "BACKEND": "channels_redis.core.RedisChannelLayer",
                "CONFIG": {"hosts": [REDIS_URL], "prefix": channel_layer_prefix},
            },
        },
    ):
        yield


@pytest.fixture
def live_server_port(stream_settings):
    # The child inherits open database sockets when it forks. Closing them here keeps the child
    # from sharing, and later terminating, a connection that the test process still uses.
    db.connections.close_all()
    process = ForkedDaphneProcess(HOST, make_stream_application)
    process.start()
    try:
        while not process.ready.wait(timeout=1):
            if not process.is_alive():
                pytest.fail("The Daphne test server stopped before it was ready.")
        yield process.port.value
    finally:
        process.terminate()
        process.join()


def drain_outbox():
    """Broadcast every pending outbox row, so the subscription sees only the write under test."""
    call_command("object_streams_listen", timeout=0.2, verbosity=0)


class ListenerThread(threading.Thread):
    """Runs ``object_streams_listen`` until it broadcasts one event."""

    def __init__(self):
        super().__init__(daemon=True)
        self.error = None

    def run(self):
        try:
            call_command("object_streams_listen", once=True, timeout=RECEIVE_TIMEOUT, verbosity=0)
        except Exception as exc:
            self.error = exc
        finally:
            db.connections.close_all()


async def receive_json(socket):
    message = await socket.receive(timeout=RECEIVE_TIMEOUT)
    assert message.type == aiohttp.WSMsgType.TEXT, message
    return json.loads(message.data)


def handshake_status(port, headers):
    """Return the HTTP status of a refused websocket handshake."""

    async def run():
        async with aiohttp.ClientSession() as http:
            with pytest.raises(aiohttp.WSServerHandshakeError) as caught:
                await http.ws_connect(f"ws://{HOST}:{port}/ws/streams/", headers=headers)
            return caught.value.status

    return asyncio.run(run())


@pytest.mark.django_db(transaction=True)
class TestLiveSocket(BaseTestGroupMixin, BaseTestUserMixin):
    groups_to_create: ClassVar[dict] = {"Order Readers": []}
    users_to_create: ClassVar[dict] = {
        "reader@domain.invalid": {"name": "Reader", "password": "password", "groups": ["Order Readers"]},
    }

    @property
    def groups(self):
        if hasattr(self, "_groups"):
            return self._groups

        group, _ = Group.objects.get_or_create(name="Order Readers")
        group.permissions.set(Permission.objects.filter(codename__in=["read_customerorder", "list_customerorder"]))
        self._groups = [group]
        return self._groups

    @pytest.fixture
    def reader(self):
        return self.users["reader@domain.invalid"]

    @pytest.fixture
    def customer_order(self, reader):
        customer = store_models.Customer.objects.create(user=reader)
        order_state = store_models.OrderState.objects.create(code="order_state_new", name="New")
        return store_models.CustomerOrder.objects.create(
            order_number=Decimal("1001"),
            customer=customer,
            order_state=order_state,
            shipping_method="free",
        )

    @pytest.fixture
    def signed_in_client(self, stream_settings, reader):
        client = Client()
        client.force_login(reader)
        return client

    @pytest.fixture
    def session_cookie(self, signed_in_client):
        return signed_in_client.cookies[settings.SESSION_COOKIE_NAME].value

    def test_logging_out_closes_the_sessions_socket(self, signed_in_client, session_cookie, live_server_port):
        url = f"ws://{HOST}:{live_server_port}/ws/streams/"
        headers = {
            "Origin": f"http://{HOST}:{live_server_port}",
            "Cookie": f"{settings.SESSION_COOKIE_NAME}={session_cookie}",
        }

        async def run():
            async with aiohttp.ClientSession() as http, http.ws_connect(url, headers=headers) as socket:
                # A reply proves the server accepted the socket and joined it to the session's group.
                await socket.send_json({"op": "unsubscribe", "subscription_id": "none"})
                await receive_json(socket)
                await asyncio.to_thread(self.log_out, signed_in_client)
                message = await socket.receive(timeout=RECEIVE_TIMEOUT)
                return message.type, socket.close_code

        message_type, close_code = asyncio.run(run())

        assert message_type == aiohttp.WSMsgType.CLOSE
        assert close_code == SESSION_LOGOUT_CLOSE_CODE

    @staticmethod
    def log_out(client):
        client.logout()
        db.connections.close_all()

    def test_a_saved_order_reaches_a_signed_in_socket(self, customer_order, session_cookie, live_server_port):
        drain_outbox()
        origin = f"http://{HOST}:{live_server_port}"
        url = f"ws://{HOST}:{live_server_port}/ws/streams/"
        headers = {"Origin": origin, "Cookie": f"{settings.SESSION_COOKIE_NAME}={session_cookie}"}

        async def run():
            async with aiohttp.ClientSession() as http, http.ws_connect(url, headers=headers) as socket:
                await socket.send_json(
                    {"op": "subscribe", "kind": "object", "model": "store.CustomerOrder", "pk": customer_order.pk}
                )
                subscribed = await receive_json(socket)

                listener = ListenerThread()
                listener.start()
                written_at = time.monotonic()
                await asyncio.to_thread(self.save_order, customer_order)
                event = await receive_json(socket)
                elapsed = time.monotonic() - written_at
                await asyncio.to_thread(listener.join, RECEIVE_TIMEOUT)
                return subscribed, event, elapsed, listener

        subscribed, event, elapsed, listener = asyncio.run(run())

        assert listener.error is None
        assert subscribed["type"] == "subscribed"
        assert event["type"] == "event"
        assert event["facet"] == "object"
        assert event["op"] == "updated"
        assert event["subject"]["pk"] == str(customer_order.pk)
        # The changed column names, the source row, and the transaction id stay on the server.
        assert set(event) <= {"type", "subscription_id", "subject", "facet", "op", "list_action", "cursor"}
        print(f"time from commit to socket event: {elapsed:.3f}s")

    @staticmethod
    def save_order(customer_order):
        customer_order.shipping_method = "express"
        customer_order.save()
        db.connections.close_all()

    def test_a_socket_without_a_session_is_refused(self, live_server_port):
        status = handshake_status(live_server_port, {"Origin": f"http://{HOST}:{live_server_port}"})

        assert status == HTTPStatus.FORBIDDEN

    def test_a_socket_from_another_origin_is_refused(self, session_cookie, live_server_port):
        headers = {
            "Origin": "https://attacker.example.com",
            "Cookie": f"{settings.SESSION_COOKIE_NAME}={session_cookie}",
        }

        assert handshake_status(live_server_port, headers) == HTTPStatus.FORBIDDEN
