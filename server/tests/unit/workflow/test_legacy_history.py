"""Coverage for copying VUEDA's simple-history workflow rows into the pghistory event tables.

The conversion runs as a shipped migration, so these tests call it the way the migration does, with
the live app registry standing in for the migration's own. What matters is what it writes: one event
per legacy row, its own action each, carrying the moment, the actor, the reason, and the provenance
the source recorded, including for a row whose live object is gone.
"""

import uuid
from datetime import timedelta

import pgtrigger
import pytest
from django.apps import apps
from django.utils import timezone

from vueda.workflow import models
from vueda.workflow.legacy_history import LEGACY_SOURCE
from vueda.workflow.legacy_history import convert_legacy_workflow_history
from vueda.workflow.legacy_history import remove_converted_workflow_history


pytestmark = pytest.mark.django_db


LONG_AGO = timezone.now() - timedelta(days=400)


def clear_events(name):
    """Empty one event table, so a test starts from the history the fixtures wrote, not the triggers."""
    event_model = apps.get_model("vueda_workflow", f"{name}Event")
    with pgtrigger.ignore(f"{event_model._meta.label}:append_only"):
        event_model.objects.all().delete()


def legacy_state_row(*, state_id, code, name, workflow_id, history_type, recorded_at, reason="", user_id=None):
    """Write one HistoricalState row by hand, the way a pre-pghistory VUEDA would have."""
    return models.HistoricalState.objects.create(
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


class TestConversion:
    def test_one_legacy_row_becomes_one_event_at_its_recorded_time(self, workflow, django_user_model):
        state = models.State.objects.create(code="legacy_new", name="Legacy New", workflow=workflow)
        clear_events("State")
        models.HistoricalState.objects.all().delete()
        actor = django_user_model.objects.create(email="legacy-actor@domain.invalid", name="Legacy Actor")
        legacy_state_row(
            state_id=state.pk,
            code="legacy_new",
            name="Legacy New",
            workflow_id=workflow.pk,
            history_type="+",
            recorded_at=LONG_AGO,
            user_id=actor.pk,
        )

        convert_legacy_workflow_history(apps, None)

        events = converted_events()
        assert [event.pgh_label for event in events] == ["insert"]
        assert events[0].pgh_obj_id == state.pk
        assert events[0].pgh_created_at == LONG_AGO
        assert events[0].code == "legacy_new"
        assert events[0].pgh_context.metadata["user"] == actor.pk
        assert events[0].pgh_context.metadata["source"] == LEGACY_SOURCE

    def test_every_converted_row_gets_an_action_of_its_own(self, workflow):
        state = models.State.objects.create(code="legacy_grouped", name="Grouped", workflow=workflow)
        clear_events("State")
        models.HistoricalState.objects.all().delete()
        reason = "Workflow Migration - 0002_workflow_migrations_2026_06_29"
        for index in range(3):
            legacy_state_row(
                state_id=state.pk,
                code="legacy_grouped",
                name=f"Grouped {index}",
                workflow_id=workflow.pk,
                history_type="~",
                recorded_at=LONG_AGO + timedelta(minutes=index),
                reason=reason,
            )

        convert_legacy_workflow_history(apps, None)

        events = converted_events()
        assert len(events) == 3  # noqa: PLR2004
        assert len({event.pgh_context_id for event in events}) == 3  # noqa: PLR2004

    def test_a_migration_reason_is_recorded_as_provenance(self, workflow):
        state = models.State.objects.create(code="legacy_migrated", name="Migrated", workflow=workflow)
        clear_events("State")
        models.HistoricalState.objects.all().delete()
        reason = "Workflow Migration - 0002_workflow_migrations_2026_06_29"
        legacy_state_row(
            state_id=state.pk,
            code="legacy_migrated",
            name="Migrated",
            workflow_id=workflow.pk,
            history_type="+",
            recorded_at=LONG_AGO,
            reason=reason,
        )

        convert_legacy_workflow_history(apps, None)

        metadata = converted_events()[0].pgh_context.metadata
        assert metadata["kind"] == "migration"
        assert metadata["reason"] == reason
        assert metadata["action"] == reason

    def test_a_row_with_no_reason_is_recorded_as_legacy(self, workflow):
        state = models.State.objects.create(code="legacy_plain", name="Plain", workflow=workflow)
        clear_events("State")
        models.HistoricalState.objects.all().delete()
        legacy_state_row(
            state_id=state.pk,
            code="legacy_plain",
            name="Plain",
            workflow_id=workflow.pk,
            history_type="+",
            recorded_at=LONG_AGO,
        )

        convert_legacy_workflow_history(apps, None)

        metadata = converted_events()[0].pgh_context.metadata
        assert metadata["kind"] == "legacy"
        assert "reason" not in metadata
        assert "user" not in metadata

    def test_the_history_of_a_deleted_row_converts(self, workflow):
        """Live-object iteration would lose this row. Reading the historical table directly keeps it."""
        state = models.State.objects.create(code="legacy_gone", name="Gone", workflow=workflow)
        gone_pk = state.pk
        state.delete()
        clear_events("State")
        models.HistoricalState.objects.all().delete()
        for history_type in ("+", "-"):
            legacy_state_row(
                state_id=gone_pk,
                code="legacy_gone",
                name="Gone",
                workflow_id=workflow.pk,
                history_type=history_type,
                recorded_at=LONG_AGO,
            )

        convert_legacy_workflow_history(apps, None)

        events = converted_events()
        assert [event.pgh_label for event in events] == ["insert", "delete"]
        assert {event.pgh_obj_id for event in events} == {gone_pk}

    def test_running_it_again_copies_nothing_twice(self, workflow):
        state = models.State.objects.create(code="legacy_twice", name="Twice", workflow=workflow)
        clear_events("State")
        models.HistoricalState.objects.all().delete()
        legacy_state_row(
            state_id=state.pk,
            code="legacy_twice",
            name="Twice",
            workflow_id=workflow.pk,
            history_type="+",
            recorded_at=LONG_AGO,
        )

        convert_legacy_workflow_history(apps, None)
        convert_legacy_workflow_history(apps, None)

        assert len(converted_events()) == 1

    def test_a_row_the_triggers_already_caught_is_not_copied(self, workflow):
        """A write after the triggers existed recorded its own event. Copying its row would double it."""
        state = models.State.objects.create(code="legacy_recent", name="Recent", workflow=workflow)
        recorded_by_trigger = {event.pgh_id for event in converted_events()}
        assert recorded_by_trigger, "the trigger should have recorded the state this test just created"
        models.HistoricalState.objects.all().delete()
        legacy_state_row(
            state_id=state.pk,
            code="legacy_recent",
            name="Recent",
            workflow_id=workflow.pk,
            history_type="+",
            recorded_at=timezone.now(),
        )

        convert_legacy_workflow_history(apps, None)

        assert {event.pgh_id for event in converted_events()} == recorded_by_trigger


class TestReverse:
    def test_the_reverse_removes_what_the_conversion_wrote(self, workflow):
        state = models.State.objects.create(code="legacy_reverse", name="Reverse", workflow=workflow)
        clear_events("State")
        models.HistoricalState.objects.all().delete()
        legacy_state_row(
            state_id=state.pk,
            code="legacy_reverse",
            name="Reverse",
            workflow_id=workflow.pk,
            history_type="+",
            recorded_at=LONG_AGO,
        )
        convert_legacy_workflow_history(apps, None)
        assert converted_events()

        remove_converted_workflow_history(apps, None)

        assert converted_events() == []
        context_model = apps.get_model("pghistory", "Context")
        assert not context_model.objects.filter(metadata__source=LEGACY_SOURCE).exists()
