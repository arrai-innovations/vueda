"""
Object stream subscriptions over VUEDA's permission rules, with capture by database trigger.

``store.CustomerOrder`` declares ``class Vueda.Streams``, and ``store.0011`` installs the trigger
that the section adds. Writes in these tests therefore reach the outbox through the trigger, the
same way they would in an integrator's project. The session tests stub the transport; the consumer
tests run the real websocket consumer.
"""

from decimal import Decimal
from types import SimpleNamespace
from typing import ClassVar

import pytest
from asgiref.sync import async_to_sync
from channels.testing.websocket import WebsocketCommunicator
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from django.db import models
from django.test import override_settings
from object_streams import ObjectStreamRegistry
from object_streams.models import ObjectStreamEvent
from object_streams.outbox import assign_outbox_cursors
from object_streams.outbox import latest_outbox_cursor
from object_streams.outbox import outbox_events_after
from object_streams.sessions import SubscriptionSession

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.store import models as store_models
from tests.store import viewsets as store_viewsets
from vueda.streams import receivers
from vueda.streams import visibility
from vueda.streams.apps import TRIGGER_NAME
from vueda.streams.apps import _validate_streams_section
from vueda.streams.consumers import SESSION_LOGOUT_MESSAGE_TYPE
from vueda.streams.consumers import VuedaObjectStreamConsumer
from vueda.streams.consumers import canonical_model_label
from vueda.streams.consumers import session_group_name
from vueda.streams.registry import default_facets_for
from vueda.streams.registry import register_viewset
from vueda.streams.routing import allowed_websocket_origins
from vueda.streams.visibility import VuedaVisibilityPolicy
from vueda.workflow.models import ObjectState


class RecordingTransport:
    """Collects what a websocket consumer would have sent."""

    def __init__(self):
        self.subscribed = []
        self.unsubscribed = []
        self.events = []
        self.resyncs = []
        self.errors = []

    async def send_subscribed(self, subscription):
        self.subscribed.append(subscription)

    async def send_unsubscribed(self, subscription_id):
        self.unsubscribed.append(subscription_id)

    async def send_event(self, event):
        self.events.append(event)

    async def send_resync(self, resync):
        self.resyncs.append(resync)

    async def send_error(self, code, message, *, details=None):
        self.errors.append({"code": code, "message": message, "details": details})


def trigger_names(model):
    return [trigger.name for trigger in model._meta.triggers]


class TestStreamsSection:
    def test_an_enabled_section_adds_the_capture_trigger(self):
        assert TRIGGER_NAME in trigger_names(store_models.CustomerOrder)

    def test_a_model_without_the_section_gets_no_capture_trigger(self):
        assert TRIGGER_NAME not in trigger_names(store_models.Customer)

    def test_a_composite_primary_key_fails_the_section(self):
        model = SimpleNamespace(
            __name__="Composite",
            _meta=SimpleNamespace(pk=models.CompositePrimaryKey("a", "b")),
        )

        [message] = _validate_streams_section(model, {"enabled": True})

        assert "composite primary key" in message

    def test_a_disabled_section_is_not_validated(self):
        model = SimpleNamespace(
            __name__="Composite",
            _meta=SimpleNamespace(pk=models.CompositePrimaryKey("a", "b")),
        )

        assert _validate_streams_section(model, {"enabled": False}) == []


class TestRegistration:
    def test_register_viewset_reuses_the_viewsets_filterset(self):
        registry = ObjectStreamRegistry()
        register_viewset(store_viewsets.CustomerOrderViewSet, registry=registry)
        registration = registry.get(store_models.CustomerOrder)

        assert registration.filterset is store_viewsets.CustomerOrderViewSet.filterset_class
        assert isinstance(registration.visibility, VuedaVisibilityPolicy)

    def test_a_workflow_model_receives_workflow_state_events(self):
        assert default_facets_for(store_models.CustomerOrder) == ("object", "workflow_state")

    def test_a_plain_model_receives_object_events_only(self):
        assert default_facets_for(store_models.Customer) == ("object",)


@pytest.mark.django_db
class TestCapture(BaseTestGroupMixin, BaseTestUserMixin):
    groups_to_create: ClassVar[dict] = {"Order Readers": []}
    users_to_create: ClassVar[dict] = {
        "reader@domain.invalid": {"name": "Reader", "password": "password", "groups": ["Order Readers"]},
        "no-perms@domain.invalid": {"name": "No Perms", "password": "password", "groups": []},
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
    def registry(self):
        """An isolated registry, so registering here cannot leak into other tests."""
        registry = ObjectStreamRegistry()
        register_viewset(store_viewsets.CustomerOrderViewSet, registry=registry)
        return registry

    @pytest.fixture
    def customer(self):
        return store_models.Customer.objects.create(user=self.users["reader@domain.invalid"])

    @pytest.fixture
    def order_state(self):
        return store_models.OrderState.objects.create(code="order_state_new", name="New")

    def create_order(self, customer, order_state, number="1001"):
        return store_models.CustomerOrder.objects.create(
            order_number=Decimal(number),
            customer=customer,
            order_state=order_state,
            shipping_method="free",
        )

    def subscribe(self, user, registry, **message):
        session = SubscriptionSession(user=user, transport=RecordingTransport(), registry=registry)
        session.subscribe({"op": "subscribe", "model": "store.CustomerOrder", **message})
        return session

    def publish(self, session, after_cursor):
        assign_outbox_cursors()
        for row in outbox_events_after(after_cursor):
            session.publish(row)

    def test_the_migrated_trigger_captures_a_write(self, customer, order_state):
        before = ObjectStreamEvent.objects.count()

        order = self.create_order(customer, order_state)

        # Creating a workflow model also creates its initial workflow state row, which the workflow
        # capture trigger reports for the same order. Both writes share one transaction.
        rows = list(ObjectStreamEvent.objects.order_by("id")[before:])
        assert sorted((row.facet, row.op, row.subject_object_id) for row in rows) == [
            ("object", "created", str(order.pk)),
            ("workflow_state", "updated", str(order.pk)),
        ]
        assert len({row.metadata["transaction_id"] for row in rows}) == 1

    def test_the_trigger_captures_a_bulk_update(self, customer, order_state):
        first = self.create_order(customer, order_state, "1001")
        second = self.create_order(customer, order_state, "1002")
        before = ObjectStreamEvent.objects.count()

        store_models.CustomerOrder.objects.filter(pk__in=[first.pk, second.pk]).update(shipping_method="express")

        rows = ObjectStreamEvent.objects.order_by("id")[before:]
        assert sorted(row.subject_object_id for row in rows) == sorted([str(first.pk), str(second.pk)])
        assert all("shipping_method" in row.changed_fields for row in rows)

    def test_a_permitted_subscriber_receives_the_event(self, registry, customer, order_state):
        assign_outbox_cursors()
        cursor = latest_outbox_cursor()
        session = self.subscribe(self.users["reader@domain.invalid"], registry, kind="model")

        order = self.create_order(customer, order_state)
        self.publish(session, cursor)

        assert session.transport.errors == []
        events = session.transport.events
        assert {event.subject.pk for event in events} == {str(order.pk)}
        assert events[0].list_action == "added"

    def test_a_filter_subscription_hears_about_rows_that_join_its_filter(self, registry, customer, order_state):
        # The client encodes filters as its list request's query string does, and the viewset's
        # FilterSet decides membership.
        order = self.create_order(customer, order_state)
        assign_outbox_cursors()
        cursor = latest_outbox_cursor()
        session = self.subscribe(
            self.users["reader@domain.invalid"], registry, kind="filter", filter={"shipping_method": "express"}
        )
        assert session.transport.errors == []

        self.create_order(customer, order_state, "1002")
        self.publish(session, cursor)
        assert session.transport.events == []

        cursor = latest_outbox_cursor()
        store_models.CustomerOrder.objects.filter(pk=order.pk).update(shipping_method="express")
        self.publish(session, cursor)

        [event] = session.transport.events
        assert event.subject.pk == str(order.pk)
        assert event.list_action == "added"

    def test_a_subscriber_without_read_permission_receives_nothing(self, registry, customer, order_state):
        assign_outbox_cursors()
        cursor = latest_outbox_cursor()
        session = self.subscribe(self.users["no-perms@domain.invalid"], registry, kind="model")

        self.create_order(customer, order_state)
        self.publish(session, cursor)

        assert session.transport.events == []

    def test_anonymous_users_see_nothing(self, customer, order_state):
        self.create_order(customer, order_state)

        assert not VuedaVisibilityPolicy().get_queryset(AnonymousUser(), store_models.CustomerOrder).exists()


@pytest.mark.django_db
class TestWorkflowCapture(BaseTestGroupMixin, BaseTestUserMixin):
    """A transition writes only an ``ObjectState`` row, yet subscribers of the order hear about it."""

    groups_to_create: ClassVar[dict] = {"Order Workflow Managers": []}
    users_to_create: ClassVar[dict] = {
        "workflow-user@domain.invalid": {
            "name": "Workflow User",
            "password": "password",
            "groups": ["Order Workflow Managers"],
        },
    }

    @property
    def groups(self):
        if hasattr(self, "_groups"):
            return self._groups

        group, _ = Group.objects.get_or_create(name="Order Workflow Managers")
        group.permissions.set(
            Permission.objects.filter(
                codename__in=["fulfill_orders", "read_customerorder", "list_customerorder", "delete_customerorder"]
            )
        )
        self._groups = [group]
        return self._groups

    @pytest.fixture
    def workflow_user(self):
        return self.users["workflow-user@domain.invalid"]

    @pytest.fixture
    def customer_order(self, workflow_user):
        customer = store_models.Customer.objects.create(user=workflow_user)
        order_state = store_models.OrderState.objects.create(code="order_state_new", name="New")
        return store_models.CustomerOrder.objects.create(
            order_number=Decimal("1001"),
            customer=customer,
            order_state=order_state,
            shipping_method="free",
        )

    @pytest.fixture
    def registry(self):
        registry = ObjectStreamRegistry()
        register_viewset(store_viewsets.CustomerOrderViewSet, registry=registry)
        return registry

    def test_a_transition_writes_one_workflow_state_event_for_the_order(self, customer_order, workflow_user):
        before = ObjectStreamEvent.objects.count()

        customer_order.apply_transition("pack_order", user=workflow_user)

        rows = list(ObjectStreamEvent.objects.order_by("id")[before:])
        assert [(row.facet, row.op) for row in rows] == [("workflow_state", "updated")]
        [row] = rows
        assert row.subject_object_id == str(customer_order.pk)
        assert row.subject_content_type.model_class() is store_models.CustomerOrder
        assert row.source_content_type.model_class() is ObjectState
        assert "state_id" in row.changed_fields

    def test_a_transition_reaches_subscribers_of_the_order(self, customer_order, workflow_user, registry):
        assign_outbox_cursors()
        cursor = latest_outbox_cursor()
        session = SubscriptionSession(user=workflow_user, transport=RecordingTransport(), registry=registry)
        session.subscribe(
            {"op": "subscribe", "kind": "object", "model": "store.CustomerOrder", "pk": customer_order.pk}
        )

        customer_order.apply_transition("pack_order", user=workflow_user)
        assign_outbox_cursors()
        for row in outbox_events_after(cursor):
            session.publish(row)

        assert session.transport.errors == []
        [event] = session.transport.events
        assert event.facet == "workflow_state"
        assert event.subject.pk == str(customer_order.pk)
        assert event.source.model == "vueda_workflow.ObjectState"


class TestStartupChecks:
    def test_streams_with_workflow_requires_workflow_capture(self, monkeypatch):
        from django.apps import apps
        from django.core.exceptions import ImproperlyConfigured

        from vueda.streams.apps import StreamsConfig

        installed = {"object_streams", "vueda.workflow"}
        monkeypatch.setattr(apps, "is_installed", lambda name: name in installed)

        with pytest.raises(ImproperlyConfigured, match=r"requires vueda\.workflow\.streams"):
            StreamsConfig.ready(apps.get_app_config("vueda_streams"))


@pytest.mark.django_db(transaction=True)
class TestConsumer(BaseTestUserMixin):
    users_to_create: ClassVar[dict] = {
        "socket@domain.invalid": {"name": "Socket User", "password": "password", "groups": []},
    }

    def connect(self, user):
        communicator = WebsocketCommunicator(
            VuedaObjectStreamConsumer.as_asgi(registry=ObjectStreamRegistry()),
            "/ws/streams/",
        )
        communicator.scope["user"] = user

        async def run():
            connected, _ = await communicator.connect()
            await communicator.disconnect()
            return connected

        return async_to_sync(run)()

    def test_an_anonymous_connection_is_refused(self):
        assert self.connect(AnonymousUser()) is False

    def test_a_connection_without_a_user_is_refused(self):
        assert self.connect(None) is False

    def test_a_signed_in_user_is_accepted(self):
        assert self.connect(self.users["socket@domain.invalid"]) is True

    def test_a_route_style_model_name_subscribes_to_the_model(self):
        registry = ObjectStreamRegistry()
        register_viewset(store_viewsets.CustomerOrderViewSet, registry=registry)
        communicator = WebsocketCommunicator(VuedaObjectStreamConsumer.as_asgi(registry=registry), "/ws/streams/")
        communicator.scope["user"] = self.users["socket@domain.invalid"]

        async def run():
            await communicator.connect()
            await communicator.send_json_to({"op": "subscribe", "kind": "model", "model": "store.customer_order"})
            reply = await communicator.receive_json_from()
            await communicator.disconnect()
            return reply

        reply = async_to_sync(run)()

        assert reply["type"] == "subscribed"
        assert reply["model"] == "store.CustomerOrder"


class TestCanonicalModelLabel:
    @pytest.mark.parametrize("name", ["store.customer_order", "store.customerorder", "store.CustomerOrder"])
    def test_a_route_style_name_becomes_the_model_label(self, name):
        assert canonical_model_label(name) == "store.CustomerOrder"

    @pytest.mark.parametrize("value", ["store.no_such_model", "no_such_app.thing", "store", 3, None])
    def test_a_value_that_names_no_model_is_unchanged(self, value):
        assert canonical_model_label(value) == value


@override_settings(ALLOWED_HOSTS=["api.example.com"], CORS_ALLOWED_ORIGINS=["https://app.example.com"])
def test_websocket_origins_include_the_cors_origins():
    assert allowed_websocket_origins() == ["api.example.com", "https://app.example.com"]


class TestCloseSessionSockets:
    """The ``user_logged_out`` receiver that closes a session's websockets."""

    class Layer:
        def __init__(self, error=None):
            self.sent = []
            self.error = error

        async def group_send(self, group, message):
            if self.error:
                raise self.error
            self.sent.append((group, message))

    def request(self, session_key):
        return SimpleNamespace(session=SimpleNamespace(session_key=session_key))

    def test_the_sessions_group_receives_the_logout_message(self, monkeypatch):
        layer = self.Layer()
        monkeypatch.setattr(receivers, "get_channel_layer", lambda: layer)

        receivers.close_session_sockets(sender=None, request=self.request("abc"), user=None)

        assert layer.sent == [(session_group_name("abc"), {"type": SESSION_LOGOUT_MESSAGE_TYPE})]
        assert "abc" not in layer.sent[0][0]

    def test_a_request_without_a_session_sends_nothing(self, monkeypatch):
        layer = self.Layer()
        monkeypatch.setattr(receivers, "get_channel_layer", lambda: layer)

        receivers.close_session_sockets(sender=None, request=SimpleNamespace(), user=None)
        receivers.close_session_sockets(sender=None, request=self.request(None), user=None)

        assert layer.sent == []

    def test_no_channel_layer_sends_nothing(self, monkeypatch):
        monkeypatch.setattr(receivers, "get_channel_layer", lambda: None)

        receivers.close_session_sockets(sender=None, request=self.request("abc"), user=None)

    def test_a_failing_channel_layer_does_not_stop_logout(self, monkeypatch, caplog):
        monkeypatch.setattr(receivers, "get_channel_layer", lambda: self.Layer(error=ConnectionError("down")))

        receivers.close_session_sockets(sender=None, request=self.request("abc"), user=None)

        assert "Could not close the websockets" in caplog.text

    def test_the_receiver_is_connected_to_user_logged_out(self):
        from django.contrib.auth.signals import user_logged_out

        assert any(entry[1]() is receivers.close_session_sockets for entry in user_logged_out.receivers)


class OwnOrdersViewSet(store_viewsets.CustomerOrderViewSet):
    """Scopes orders to the requesting user's own, the way a project scopes rows in ``get_queryset()``."""

    def get_queryset(self):
        return super().get_queryset().filter(customer__user=self.request.user)


@pytest.mark.django_db
class TestVisibilityChecks(BaseTestGroupMixin, BaseTestUserMixin):
    """Subscriptions see the rows that the REST API would let the subscriber read."""

    groups_to_create: ClassVar[dict] = {"Readers": []}
    users_to_create: ClassVar[dict] = {
        "reader@domain.invalid": {"name": "Reader", "password": "password", "groups": ["Readers"]},
        "other-reader@domain.invalid": {"name": "Other Reader", "password": "password", "groups": ["Readers"]},
        "no-perms@domain.invalid": {"name": "No Perms", "password": "password", "groups": []},
    }

    @property
    def groups(self):
        if hasattr(self, "_groups"):
            return self._groups

        group, _ = Group.objects.get_or_create(name="Readers")
        group.permissions.set(
            Permission.objects.filter(
                codename__in=["read_customerorder", "list_customerorder", "read_distributor", "list_distributor"]
            )
        )
        self._groups = [group]
        return self._groups

    @pytest.fixture
    def distributor(self):
        return store_models.Distributor.objects.create(name="Acme", description="")

    def order_for(self, user, number):
        customer = store_models.Customer.objects.create(user=user)
        order_state, _ = store_models.OrderState.objects.get_or_create(code="order_state_new", name="New")
        return store_models.CustomerOrder.objects.create(
            order_number=Decimal(number), customer=customer, order_state=order_state, shipping_method="free"
        )

    def test_a_model_without_a_workflow_needs_the_read_permission(self, distributor):
        policy = VuedaVisibilityPolicy()

        reader_rows = policy.get_queryset(self.users["reader@domain.invalid"], store_models.Distributor)
        assert reader_rows.filter(pk=distributor.pk).exists()
        assert not policy.get_queryset(self.users["no-perms@domain.invalid"], store_models.Distributor).exists()

    def test_an_object_subscription_without_the_read_permission_looks_like_a_missing_object(self, distributor):
        registry = ObjectStreamRegistry()
        register_viewset(store_viewsets.DistributorViewSet, registry=registry)
        session = SubscriptionSession(
            user=self.users["no-perms@domain.invalid"], transport=RecordingTransport(), registry=registry
        )

        session.subscribe({"op": "subscribe", "kind": "object", "model": "store.Distributor", "pk": distributor.pk})

        assert session.transport.subscribed == []
        assert [error["code"] for error in session.transport.errors] == ["not_found"]

    def test_a_state_grant_defers_to_the_workflow_rules(self, monkeypatch):
        order = self.order_for(self.users["reader@domain.invalid"], "1001")
        filtered = []
        monkeypatch.setattr(visibility, "has_matching_state_grant", lambda model, user, permissions: True)
        monkeypatch.setattr(
            visibility,
            "filter_rows_for_user",
            lambda queryset, user, perm_type: filtered.append(perm_type) or queryset,
        )

        rows = VuedaVisibilityPolicy().get_queryset(self.users["no-perms@domain.invalid"], store_models.CustomerOrder)

        assert list(rows) == [order]
        assert filtered == ["read"]

    def test_subscriptions_start_from_the_viewsets_get_queryset(self):
        reader = self.users["reader@domain.invalid"]
        own = self.order_for(reader, "1001")
        self.order_for(self.users["other-reader@domain.invalid"], "1002")
        registry = ObjectStreamRegistry()
        register_viewset(OwnOrdersViewSet, registry=registry)

        rows = registry.get(store_models.CustomerOrder).visibility.get_queryset(reader, store_models.CustomerOrder)

        assert list(rows) == [own]

    def test_an_explicit_queryset_replaces_get_queryset(self):
        reader = self.users["reader@domain.invalid"]
        own = self.order_for(reader, "1001")
        other = self.order_for(self.users["other-reader@domain.invalid"], "1002")
        registry = ObjectStreamRegistry()
        register_viewset(OwnOrdersViewSet, queryset=store_models.CustomerOrder.objects.all(), registry=registry)

        rows = registry.get(store_models.CustomerOrder).visibility.get_queryset(reader, store_models.CustomerOrder)

        assert sorted(row.pk for row in rows) == sorted([own.pk, other.pk])

    def test_a_viewset_without_a_queryset_attribute_needs_one_passed(self):
        class NoQuerysetViewSet(store_viewsets.CustomerOrderViewSet):
            queryset = None

        with pytest.raises(ValueError, match="Pass queryset="):
            register_viewset(NoQuerysetViewSet, registry=ObjectStreamRegistry())
