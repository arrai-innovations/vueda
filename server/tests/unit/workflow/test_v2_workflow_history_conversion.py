"""Coverage for copying VUEDA's simple-history workflow rows into the pghistory event tables.

The conversion runs inside ``vueda_workflow`` migration ``0009``, before that migration deletes the
``Historical*`` tables. These tests call it the way the migration does, with the app registry as it
stands after ``0008``. Each test creates the ``Historical*`` tables inside its own transaction, so the
database is back to its migrated shape afterwards. What matters is what the conversion writes: one
event per legacy row, its own action each, carrying the moment, the actor, the reason, and the
provenance that the source recorded, including for a row whose live object is gone.
"""

import importlib
import io
import uuid
from datetime import timedelta
from decimal import Decimal
from http import HTTPStatus
from types import SimpleNamespace

import pgtrigger
import pytest
from django.apps import apps
from django.core.management import call_command
from django.db import connection
from django.db.migrations.loader import MigrationLoader
from django.urls import reverse
from django.utils import timezone

from tests.store import models as store_models
from vueda.workflow import models
from vueda.workflow.management.commands import makeworkflowmigrations


migration_0009 = importlib.import_module(
    "vueda.workflow.migrations.0009_remove_historicalobjectstate_history_relation_and_more"
)
LEGACY_MODEL_NAMES = migration_0009.LEGACY_MODEL_NAMES
LEGACY_SOURCE = migration_0009.LEGACY_SOURCE
TRIGGER_MIGRATION = migration_0009.TRIGGER_MIGRATION
convert_legacy_workflow_history = migration_0009.convert_legacy_workflow_history
remove_converted_workflow_history = migration_0009.remove_converted_workflow_history


pytestmark = pytest.mark.django_db


LONG_AGO = timezone.now() - timedelta(days=400)


@pytest.fixture
def legacy_apps():
    """Return the app registry as ``0009`` sees it, with its ``Historical*`` tables in place."""
    registry = MigrationLoader(connection).project_state(("vueda_workflow", TRIGGER_MIGRATION)).apps
    with connection.schema_editor() as editor:
        for name in LEGACY_MODEL_NAMES:
            editor.create_model(registry.get_model("vueda_workflow", f"Historical{name}"))
    return registry


def clear_events(name):
    """Empty one event table, so a test starts from the history that the test wrote, not the triggers."""
    event_model = apps.get_model("vueda_workflow", f"{name}Event")
    with pgtrigger.ignore(f"{event_model._meta.label}:append_only"):
        event_model.objects.all().delete()


def legacy_state_row(
    legacy_apps, *, state_id, code, name, workflow_id, history_type, recorded_at, reason="", user_id=None
):
    """Write one HistoricalState row by hand, the way server v2 would have."""
    return legacy_apps.get_model("vueda_workflow", "HistoricalState").objects.create(
        id=state_id,
        history_relation_id=state_id,
        code=code,
        name=name,
        workflow_id=workflow_id,
        history_type=history_type,
        history_date=recorded_at,
        history_change_reason=reason,
        history_user_id=user_id,
    )


def converted_events(name="State"):
    event_model = apps.get_model("vueda_workflow", f"{name}Event")
    return list(event_model.objects.order_by("pgh_id"))


@pytest.fixture
def workflow():
    content_type = apps.get_model("contenttypes", "ContentType").objects.get_for_model(models.Workflow)
    return models.Workflow.objects.create(
        code=f"legacy_{uuid.uuid4().hex[:8]}",
        content_type=content_type,
        historical_app_label="vueda_workflow",
        historical_model="workflow",
    )


class TestMigration:
    def test_0009_converts_the_history_before_it_deletes_the_tables(self):
        first, *rest = migration_0009.Migration.operations

        assert first.code is convert_legacy_workflow_history
        assert first.reverse_code is remove_converted_workflow_history
        assert all(operation.__class__.__name__ in ("RemoveField", "DeleteModel") for operation in rest)


class TestConversion:
    def test_one_legacy_row_becomes_one_event_at_its_recorded_time(self, legacy_apps, workflow, django_user_model):
        state = models.State.objects.create(code="legacy_new", name="Legacy New", workflow=workflow)
        clear_events("State")
        actor = django_user_model.objects.create(email="legacy-actor@domain.invalid", name="Legacy Actor")
        legacy_state_row(
            legacy_apps,
            state_id=state.pk,
            code="legacy_new",
            name="Legacy New",
            workflow_id=workflow.pk,
            history_type="+",
            recorded_at=LONG_AGO,
            user_id=actor.pk,
        )

        convert_legacy_workflow_history(legacy_apps, None)

        events = converted_events()
        assert [event.pgh_label for event in events] == ["insert"]
        assert events[0].pgh_obj_id == state.pk
        assert events[0].pgh_created_at == LONG_AGO
        assert events[0].code == "legacy_new"
        assert events[0].pgh_context.metadata["user"] == actor.pk
        assert events[0].pgh_context.metadata["source"] == LEGACY_SOURCE

    def test_every_converted_row_gets_an_action_of_its_own(self, legacy_apps, workflow):
        state = models.State.objects.create(code="legacy_grouped", name="Grouped", workflow=workflow)
        clear_events("State")
        reason = "Workflow Migration - 0002_workflow_migrations_2026_06_29"
        for index in range(3):
            legacy_state_row(
                legacy_apps,
                state_id=state.pk,
                code="legacy_grouped",
                name=f"Grouped {index}",
                workflow_id=workflow.pk,
                history_type="~",
                recorded_at=LONG_AGO + timedelta(minutes=index),
                reason=reason,
            )

        convert_legacy_workflow_history(legacy_apps, None)

        events = converted_events()
        assert len(events) == 3  # noqa: PLR2004
        assert len({event.pgh_context_id for event in events}) == 3  # noqa: PLR2004

    def test_a_migration_reason_is_recorded_as_provenance(self, legacy_apps, workflow):
        state = models.State.objects.create(code="legacy_migrated", name="Migrated", workflow=workflow)
        clear_events("State")
        reason = "Workflow Migration - 0002_workflow_migrations_2026_06_29"
        legacy_state_row(
            legacy_apps,
            state_id=state.pk,
            code="legacy_migrated",
            name="Migrated",
            workflow_id=workflow.pk,
            history_type="+",
            recorded_at=LONG_AGO,
            reason=reason,
        )

        convert_legacy_workflow_history(legacy_apps, None)

        metadata = converted_events()[0].pgh_context.metadata
        assert metadata["kind"] == "migration"
        assert metadata["reason"] == reason
        assert metadata["action"] == reason

    def test_a_row_with_no_reason_is_recorded_as_legacy(self, legacy_apps, workflow):
        state = models.State.objects.create(code="legacy_plain", name="Plain", workflow=workflow)
        clear_events("State")
        legacy_state_row(
            legacy_apps,
            state_id=state.pk,
            code="legacy_plain",
            name="Plain",
            workflow_id=workflow.pk,
            history_type="+",
            recorded_at=LONG_AGO,
        )

        convert_legacy_workflow_history(legacy_apps, None)

        metadata = converted_events()[0].pgh_context.metadata
        assert metadata["kind"] == "legacy"
        assert "reason" not in metadata
        assert "user" not in metadata

    def test_the_history_of_a_deleted_row_converts(self, legacy_apps, workflow):
        """The conversion reads the historical table, so the history of a row that no longer exists converts."""
        state = models.State.objects.create(code="legacy_gone", name="Gone", workflow=workflow)
        gone_pk = state.pk
        state.delete()
        clear_events("State")
        for history_type in ("+", "-"):
            legacy_state_row(
                legacy_apps,
                state_id=gone_pk,
                code="legacy_gone",
                name="Gone",
                workflow_id=workflow.pk,
                history_type=history_type,
                recorded_at=LONG_AGO,
            )

        convert_legacy_workflow_history(legacy_apps, None)

        events = converted_events()
        assert [event.pgh_label for event in events] == ["insert", "delete"]
        assert {event.pgh_obj_id for event in events} == {gone_pk}

    def test_running_it_again_copies_nothing_twice(self, legacy_apps, workflow):
        state = models.State.objects.create(code="legacy_twice", name="Twice", workflow=workflow)
        clear_events("State")
        legacy_state_row(
            legacy_apps,
            state_id=state.pk,
            code="legacy_twice",
            name="Twice",
            workflow_id=workflow.pk,
            history_type="+",
            recorded_at=LONG_AGO,
        )

        convert_legacy_workflow_history(legacy_apps, None)
        convert_legacy_workflow_history(legacy_apps, None)

        assert len(converted_events()) == 1

    def test_a_row_the_triggers_already_caught_is_not_copied(self, legacy_apps, workflow):
        """A write after the triggers existed recorded its own event. Copying its row would double it."""
        state = models.State.objects.create(code="legacy_recent", name="Recent", workflow=workflow)
        recorded_by_trigger = {event.pgh_id for event in converted_events()}
        assert recorded_by_trigger, "the trigger should have recorded the state this test just created"
        legacy_state_row(
            legacy_apps,
            state_id=state.pk,
            code="legacy_recent",
            name="Recent",
            workflow_id=workflow.pk,
            history_type="+",
            recorded_at=timezone.now(),
        )

        convert_legacy_workflow_history(legacy_apps, None)

        assert {event.pgh_id for event in converted_events()} == recorded_by_trigger


class TestReverse:
    def test_the_reverse_removes_what_the_conversion_wrote(self, legacy_apps, workflow):
        state = models.State.objects.create(code="legacy_reverse", name="Reverse", workflow=workflow)
        clear_events("State")
        legacy_state_row(
            legacy_apps,
            state_id=state.pk,
            code="legacy_reverse",
            name="Reverse",
            workflow_id=workflow.pk,
            history_type="+",
            recorded_at=LONG_AGO,
        )
        convert_legacy_workflow_history(legacy_apps, None)
        assert converted_events()

        remove_converted_workflow_history(legacy_apps, None)

        assert converted_events() == []
        context_model = apps.get_model("pghistory", "Context")
        assert not context_model.objects.filter(metadata__source=LEGACY_SOURCE).exists()


@pytest.fixture
def converted_order(legacy_apps, django_user_model):
    """Return an order whose v2 workflow state history exists only as converted events.

    In v2, the order was created in "new" and later moved to "packed". Only the legacy table recorded
    that, so the event table starts without it.
    """
    actor = django_user_model.objects.create_superuser(
        email="legacy-actor@domain.invalid", name="Legacy Actor", password="password"
    )
    order_state, _ = store_models.OrderState.objects.get_or_create(code="new", defaults={"name": "New"})
    order = store_models.CustomerOrder.objects.create(
        order_number=Decimal("4001"),
        customer=store_models.Customer.objects.create(user=actor),
        order_state=order_state,
        shipping_method="free",
    )
    object_state = order.object_state
    new = models.State.objects.get(code="new", workflow__code="order_fulfillment")
    packed = models.State.objects.get(code="packed", workflow__code="order_fulfillment")
    models.ObjectState.objects.filter(pk=object_state.pk).update(state=packed)
    clear_events("ObjectState")
    historical_object_state = legacy_apps.get_model("vueda_workflow", "HistoricalObjectState")
    for history_type, state, recorded_at in (("+", new, LONG_AGO), ("~", packed, LONG_AGO + timedelta(minutes=1))):
        historical_object_state.objects.create(
            id=object_state.pk,
            history_relation_id=object_state.pk,
            object_id=object_state.object_id,
            workflow_id=object_state.workflow_id,
            state_id=state.pk,
            history_type=history_type,
            history_date=recorded_at,
            history_user_id=actor.pk,
        )

    convert_legacy_workflow_history(legacy_apps, None)

    return SimpleNamespace(order=order, actor=actor, new=new, packed=packed)


class TestHistoryList:
    def test_a_converted_state_change_appears_in_the_objects_history(self, converted_order, api_client):
        order, actor, new, packed = (
            converted_order.order,
            converted_order.actor,
            converted_order.new,
            converted_order.packed,
        )
        api_client.force_authenticate(actor)
        response = api_client.get(reverse("store.customerorder-history-list", kwargs={"pk": order.pk}))
        assert response.status_code == HTTPStatus.OK
        state_groups = [
            group for group in response.data["results"] if [event["relation"] for event in group["events"]] == ["state"]
        ]
        assert len(state_groups) == 1
        group = state_groups[0]
        assert group["label"] == "workflow history"
        assert group["actor"]["id"] == actor.pk
        assert group["events"][0]["type"] == "updated"
        assert group["events"][0]["changes"] == [
            {
                "field": "state",
                "old": {"id": new.pk, "display": "New", "missing": False},
                "new": {"id": packed.pk, "display": "Packed", "missing": False},
            }
        ]


class TestWorkflowStateHistory:
    @pytest.mark.django_db(databases=("default", "db_logging"))
    def test_converted_state_changes_appear_in_the_workflow_state_history(self, converted_order, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.history.urls_workflow_state_history"
        api_client.force_authenticate(converted_order.actor)

        response = api_client.get(
            reverse(
                "workflow-state-history",
                kwargs={"app_label": "store", "model": "customerorder", "object_id": converted_order.order.pk},
            )
        )

        assert response.status_code == HTTPStatus.OK
        assert [(entry["state"], entry["recorded_at"], entry["actor"]) for entry in response.data] == [
            ("new", LONG_AGO, converted_order.actor.pk),
            ("packed", LONG_AGO + timedelta(minutes=1), converted_order.actor.pk),
        ]


def legacy_row_for(legacy_apps, obj, *, history_type, recorded_at, reason=""):
    """Write one ``Historical*`` row holding a live workflow row's current values, the way v2 recorded it."""
    historical_model = legacy_apps.get_model("vueda_workflow", f"Historical{type(obj).__name__}")
    historical_fields = {field.attname for field in historical_model._meta.concrete_fields}
    values = {
        field.attname: getattr(obj, field.attname)
        for field in type(obj)._meta.concrete_fields
        if field.attname in historical_fields
    }
    if "history_relation_id" in historical_fields:
        values["history_relation_id"] = obj.pk
    return historical_model.objects.create(
        **values,
        history_type=history_type,
        history_date=recorded_at,
        history_change_reason=reason,
    )


def exported_workflow_changes(monkeypatch, app_label):
    """Run makeworkflowmigrations as a dry run and return the changes that it would write for one app."""
    exported = {}
    monkeypatch.setattr(
        makeworkflowmigrations.Command,
        "_create_migration_per_app",
        lambda self, changes_by_app: exported.update(changes_by_app),
    )
    call_command("makeworkflowmigrations", app_label, dry_run=True, stdout=io.StringIO())
    return exported[app_label]["changes"] if app_label in exported else []


ORDER_FULFILLMENT_ID = {
    "code": "order_fulfillment",
    "historical_app_label": "store",
    "historical_model": "customerorder",
}

STORE_MIGRATION_REASON = "Workflow Migration - 0002_workflow_migrations_2024_08_13"


class TestMakeWorkflowMigrations:
    def test_an_edit_to_a_converted_workflow_is_exported_as_a_change(self, legacy_apps, monkeypatch):
        """makeworkflowmigrations finds a workflow's rows through their events and diffs an edit against the
        row's previous event. A workflow carried over from v2 has both only through the conversion."""
        workflow = models.Workflow.objects.get(code="order_fulfillment")
        packed = models.State.objects.get(code="packed", workflow=workflow)
        for name in LEGACY_MODEL_NAMES:
            clear_events(name)
        # In v2, the store's generated workflow migration created the workflow and its "packed" state.
        legacy_row_for(legacy_apps, workflow, history_type="+", recorded_at=LONG_AGO, reason=STORE_MIGRATION_REASON)
        legacy_row_for(legacy_apps, packed, history_type="+", recorded_at=LONG_AGO, reason=STORE_MIGRATION_REASON)
        convert_legacy_workflow_history(legacy_apps, None)

        # After the upgrade, a developer renames the state.
        packed.name = "Packed and Labelled"
        packed.save()

        changes = exported_workflow_changes(monkeypatch, "store")
        assert len(changes) == 1
        change = changes[0]
        assert change["model_name"] == "state"
        assert change["history_type"] == makeworkflowmigrations.WorkflowChangeTypes.CHANGED.value
        assert change["changes"]["name"] == ("Packed", "Packed and Labelled")
        assert change["changes"]["id"] == {"code": "packed", "workflow_id": ORDER_FULFILLMENT_ID}

    def test_a_v2_edit_that_no_migration_holds_is_exported(self, legacy_apps, monkeypatch):
        """A v2 edit without a generated migration's change reason is still waiting to be exported."""
        workflow = models.Workflow.objects.get(code="order_fulfillment")
        packed = models.State.objects.get(code="packed", workflow=workflow)
        on_hold = models.State.objects.create(code="legacy_on_hold", name="On Hold", workflow=workflow)
        for name in LEGACY_MODEL_NAMES:
            clear_events(name)
        # In v2, the store's generated workflow migration created the workflow and its "packed" state.
        legacy_row_for(legacy_apps, workflow, history_type="+", recorded_at=LONG_AGO, reason=STORE_MIGRATION_REASON)
        legacy_row_for(legacy_apps, packed, history_type="+", recorded_at=LONG_AGO, reason=STORE_MIGRATION_REASON)
        # Later, a developer added a state and upgraded before exporting it into a migration.
        legacy_row_for(legacy_apps, on_hold, history_type="+", recorded_at=LONG_AGO + timedelta(minutes=1))
        convert_legacy_workflow_history(legacy_apps, None)

        changes = exported_workflow_changes(monkeypatch, "store")

        assert len(changes) == 1
        change = changes[0]
        assert change["model_name"] == "state"
        assert change["history_type"] == makeworkflowmigrations.WorkflowChangeTypes.ADDED.value
        assert change["changes"]["id"] == {"code": "legacy_on_hold", "workflow_id": ORDER_FULFILLMENT_ID}
        assert change["changes"]["name"] == "On Hold"
