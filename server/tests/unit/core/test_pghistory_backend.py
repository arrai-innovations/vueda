"""Coverage for what the pghistory backend records: events per operation, and their action context.

The models here are ordinary VUEDA models with no history declaration, so they exercise the
default-on policy rather than an opt-in.
"""

import decimal

import pytest
from django.apps import apps
from django.contrib.auth.models import AnonymousUser
from django.db import DatabaseError
from django.db import connection

from tests.conftest import BaseTestCallCommand
from tests.store import models as store_models
from vueda.core.audit import audited_action
from vueda.history.middleware import VuedaHistoryMiddleware


pytestmark = pytest.mark.django_db


class ProjectHistoryMiddleware(VuedaHistoryMiddleware):
    """Stands in for a project that extends the middleware rather than using it as shipped."""

    def get_context(self, request):
        return {**super().get_context(request), "tenant": "acme"}


def events_for(instance):
    """Return the event rows for one object, oldest first."""
    event_model = apps.get_model(instance._meta.app_label, f"{instance.__class__.__name__}Event")
    return list(event_model.objects.filter(pgh_obj_id=instance.pk).order_by("pgh_id"))


def _trigger_names(table):
    """Return the triggers PostgreSQL currently has on ``table``."""
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT tgname FROM pg_trigger JOIN pg_class ON pg_class.oid = tgrelid "
            "WHERE relname = %s AND NOT tgisinternal",
            [table],
        )
        return sorted(row[0] for row in cursor.fetchall())


def make_invoice(name="Invoice A"):
    return store_models.Invoice.objects.create(name=name)


def make_line(invoice, name="Line", amount="1.00"):
    return store_models.InvoiceLine.objects.create(invoice=invoice, name=name, amount=decimal.Decimal(amount))


class TestTrackedOperations:
    """Every write path a trigger sees must produce the events it is supposed to."""

    def test_an_insert_records_one_event(self):
        invoice = make_invoice()

        events = events_for(invoice)
        assert [event.pgh_label for event in events] == ["insert"]
        assert events[0].name == "Invoice A"

    def test_an_update_records_the_new_row(self):
        invoice = make_invoice()
        invoice.name = "Renamed"
        invoice.save()

        events = events_for(invoice)
        assert [event.pgh_label for event in events] == ["insert", "update"]
        assert events[-1].name == "Renamed"

    def test_repeated_updates_stay_separate_events(self):
        invoice = make_invoice()
        for name in ("Second", "Third"):
            invoice.name = name
            invoice.save()

        events = events_for(invoice)
        assert [event.pgh_label for event in events] == ["insert", "update", "update"]
        assert [event.name for event in events] == ["Invoice A", "Second", "Third"]

    def test_a_delete_records_the_row_it_removed(self):
        invoice = make_invoice()
        pk = invoice.pk
        invoice.delete()

        event_model = apps.get_model("store", "InvoiceEvent")
        events = list(event_model.objects.filter(pgh_obj_id=pk).order_by("pgh_id"))
        assert [event.pgh_label for event in events] == ["insert", "delete"]
        assert events[-1].name == "Invoice A"

    def test_a_queryset_update_records_one_event_per_row(self):
        invoices = [make_invoice(f"Invoice {index}") for index in range(3)]

        store_models.Invoice.objects.filter(pk__in=[invoice.pk for invoice in invoices]).update(name="Bulk")

        for invoice in invoices:
            assert [event.pgh_label for event in events_for(invoice)] == ["insert", "update"]

    def test_a_reverse_relation_update_records_events(self):
        invoice = make_invoice()
        line = make_line(invoice)

        invoice.invoice_lines.update(name="Reverse")

        assert [event.pgh_label for event in events_for(line)] == ["insert", "update"]


class TestActionContext:
    """One user action groups its writes without merging them into a single event."""

    def test_related_writes_share_one_action(self):
        with audited_action("invoice.create"):
            invoice = make_invoice()
            line = make_line(invoice)

        contexts = {events_for(invoice)[0].pgh_context_id, events_for(line)[0].pgh_context_id}
        assert len(contexts) == 1
        assert None not in contexts

    def test_repeated_writes_share_the_action_and_stay_distinct(self):
        with audited_action("invoice.rename"):
            invoice = make_invoice()
            invoice.name = "Renamed"
            invoice.save()

        events = events_for(invoice)
        assert [event.pgh_label for event in events] == ["insert", "update"]
        assert events[0].pgh_id != events[1].pgh_id
        assert events[0].pgh_context_id == events[1].pgh_context_id

    def test_the_action_metadata_reaches_the_context_row(self):
        with audited_action("invoice.create", source="test"):
            invoice = make_invoice()

        context = events_for(invoice)[0].pgh_context
        assert context.metadata["action"] == "invoice.create"
        assert context.metadata["source"] == "test"

    def test_separate_actions_do_not_share_an_identity(self):
        with audited_action("first"):
            one = make_invoice("One")
        with audited_action("second"):
            two = make_invoice("Two")

        assert events_for(one)[0].pgh_context_id != events_for(two)[0].pgh_context_id

    def test_a_nested_action_adds_to_the_metadata_of_the_outer_one(self):
        with audited_action("outer"):
            with audited_action("inner", detail="nested"):
                invoice = make_invoice()

        metadata = events_for(invoice)[0].pgh_context.metadata
        assert metadata["action"] == "inner"
        assert metadata["detail"] == "nested"

    def test_an_action_with_no_request_defaults_to_the_system_kind(self):
        with audited_action("invoice.create"):
            invoice = make_invoice()

        assert events_for(invoice)[0].pgh_context.metadata["kind"] == "system"

    def test_an_action_records_the_kind_it_names(self):
        with audited_action("history.purge", kind="command"):
            invoice = make_invoice()

        assert events_for(invoice)[0].pgh_context.metadata["kind"] == "command"

    def test_a_nested_action_keeps_the_kind_of_the_outer_one(self):
        """A service operation called from a command is still part of that command."""
        with audited_action("outer", kind="command"):
            with audited_action("inner"):
                invoice = make_invoice()

        metadata = events_for(invoice)[0].pgh_context.metadata
        assert metadata["action"] == "inner"
        assert metadata["kind"] == "command"

    def test_an_event_records_its_own_write_time_not_the_transactions(self):
        """One transaction's events must not collapse onto the moment it began.

        pghistory's default stamps every event with the transaction's start time, which would give
        each event of one request an identical time and leave nothing to order them by.
        """
        with connection.cursor() as cursor:
            cursor.execute("SELECT NOW()")
            transaction_start = cursor.fetchone()[0]

        with audited_action("invoice.create"):
            invoice = make_invoice()
            line = make_line(invoice)

        invoice_event = events_for(invoice)[0]
        line_event = events_for(line)[0]

        assert invoice_event.pgh_created_at > transaction_start
        assert line_event.pgh_created_at >= invoice_event.pgh_created_at
        assert invoice_event.pgh_context_id == line_event.pgh_context_id, "still one action"

    def test_a_write_outside_any_action_still_records_an_event(self):
        """Losing the context loses the grouping, not the history."""
        invoice = make_invoice()

        events = events_for(invoice)
        assert [event.pgh_label for event in events] == ["insert"]
        assert events[0].pgh_context_id is None


class TestRequestContext:
    """A request names its own action, so nothing inside it has to."""

    def test_a_request_groups_its_writes_and_records_who_made_them(self, django_user_model):
        from django.http import HttpResponse
        from django.test import RequestFactory

        from vueda.history.middleware import VuedaHistoryMiddleware

        user = django_user_model.objects.create(email="auditor@domain.invalid", name="Auditor", is_active=True)
        written = {}

        def view(request):
            written["invoice"] = make_invoice()
            written["line"] = make_line(written["invoice"])
            return HttpResponse()

        request = RequestFactory().post("/api/invoices/")
        request.user = user
        VuedaHistoryMiddleware(view)(request)

        invoice_event = events_for(written["invoice"])[0]
        line_event = events_for(written["line"])[0]
        assert invoice_event.pgh_context_id == line_event.pgh_context_id

        metadata = invoice_event.pgh_context.metadata
        assert metadata["user"] == user.pk
        assert metadata["url"] == "/api/invoices/"
        assert metadata["method"] == "POST"
        assert metadata["kind"] == "request"

    def test_an_action_named_inside_a_request_stays_a_request(self):
        from django.http import HttpResponse
        from django.test import RequestFactory

        written = {}

        def view(request):
            with audited_action("invoice.import"):
                written["invoice"] = make_invoice()
            return HttpResponse()

        request = RequestFactory().post("/api/invoices/import/")
        request.user = AnonymousUser()
        VuedaHistoryMiddleware(view)(request)

        metadata = events_for(written["invoice"])[0].pgh_context.metadata
        assert metadata["action"] == "invoice.import"
        assert metadata["kind"] == "request"

    def test_an_anonymous_request_records_the_action_without_a_user(self):
        from django.contrib.auth.models import AnonymousUser
        from django.http import HttpResponse
        from django.test import RequestFactory

        from vueda.history.middleware import VuedaHistoryMiddleware

        written = {}

        def view(request):
            written["invoice"] = make_invoice()
            return HttpResponse()

        request = RequestFactory().get("/api/invoices/")
        request.user = AnonymousUser()
        VuedaHistoryMiddleware(view)(request)

        metadata = events_for(written["invoice"])[0].pgh_context.metadata
        assert metadata["user"] is None
        assert metadata["method"] == "GET"


class TestPolicyArtifacts:
    """What a model's policy produces, and just as importantly what it does not."""

    def test_an_opted_out_model_has_no_event_model(self):
        with pytest.raises(LookupError):
            apps.get_model("features", "ProbeUntrackedEvent")

    @pytest.mark.django_db
    def test_an_opted_out_model_has_no_triggers(self):
        table = apps.get_model("features", "ProbeUntracked")._meta.db_table

        # Assert the table exists first, so a missing migration cannot pass this test vacuously.
        assert table in connection.introspection.table_names()
        assert _trigger_names(table) == []

    def test_a_mandatory_exclusion_is_not_snapshotted(self):
        """The floor holds for a model that declares nothing about history."""
        event_fields = [field.name for field in apps.get_model("employee", "UserEvent")._meta.concrete_fields]

        assert "password" not in event_fields
        assert "email" in event_fields

    def test_an_author_declaration_cannot_restore_a_mandatory_exclusion(self):
        """A declaration replaces the inherited value, so the floor cannot live in author policy."""
        from vueda.history.apps import _resolve_exclusions

        user_model = apps.get_model("employee", "User")

        assert _resolve_exclusions(user_model, ("email",)) == ["email", "password"]

    def test_a_proxy_has_no_event_model_of_its_own(self):
        with pytest.raises(LookupError):
            apps.get_model("features", "ProbeProxyEvent")

    @pytest.mark.django_db
    def test_a_proxy_write_lands_in_the_concrete_event_model(self):
        from tests.features import models as feature_models

        instance = feature_models.ProbeProxy.objects.create(name="Through the proxy")

        event_model = apps.get_model("features", "ProbeTrackedEvent")
        events = event_model.objects.filter(pgh_obj_id=instance.pk)
        assert [event.pgh_label for event in events] == ["insert"]

    def test_an_unmanaged_model_is_skipped(self):
        """VUEDA does not own an unmanaged model's table, so it must not install triggers on it."""
        with pytest.raises(LookupError):
            apps.get_model("erring", "PropertyFormattedNameEvent")


class TestMigrationState:
    @pytest.mark.django_db
    def test_no_migration_is_missing(self):
        """Registration is deterministic, so a fresh run must find nothing left to write."""
        from io import StringIO

        from django.core.management import call_command

        out = StringIO()
        try:
            call_command("makemigrations", "--check", "--dry-run", stdout=out)
        except SystemExit:
            pytest.fail(f"Models and migrations disagree:\n{out.getvalue()}")


class TestBackendChecks:
    """The middleware is a default, and a project can replace the list that carries it."""

    def test_the_configured_middleware_satisfies_the_check(self):
        from vueda.history.checks import check_history_middleware

        assert check_history_middleware(app_configs=None) == []

    def test_a_stack_without_history_middleware_is_reported(self, settings):
        from vueda.history.checks import check_history_middleware

        settings.MIDDLEWARE = [
            entry for entry in settings.MIDDLEWARE if entry != "vueda.history.middleware.VuedaHistoryMiddleware"
        ]

        warnings = check_history_middleware(app_configs=None)

        assert [warning.id for warning in warnings] == ["vueda_history.W001"]

    def test_middleware_before_authentication_is_reported(self, settings):
        """It reads request.user, which nothing has set before AuthenticationMiddleware runs."""
        from vueda.history.checks import check_history_middleware

        settings.MIDDLEWARE = [
            "vueda.history.middleware.VuedaHistoryMiddleware",
            "django.contrib.auth.middleware.AuthenticationMiddleware",
        ]

        warnings = check_history_middleware(app_configs=None)

        assert [warning.id for warning in warnings] == ["vueda_history.W002"]

    def test_the_default_stack_places_the_middleware_after_authentication(self, settings):
        history = settings.MIDDLEWARE.index("vueda.history.middleware.VuedaHistoryMiddleware")
        auth = settings.MIDDLEWARE.index("django.contrib.auth.middleware.AuthenticationMiddleware")

        assert auth < history

    def test_a_project_subclass_satisfies_the_check(self, settings):
        """A project may extend the middleware to record metadata of its own."""
        settings.MIDDLEWARE = ["tests.unit.core.test_pghistory_backend.ProjectHistoryMiddleware"]

        from vueda.history.checks import check_history_middleware

        assert check_history_middleware(app_configs=None) == []


class TestMigrationPaths(BaseTestCallCommand):
    """Event models and triggers are ordinary migration state, and must behave like it.

    Every test run already proves the forward path, because each test database is built from the
    migrations. What is left to prove is that the path runs backwards and forwards again.
    """

    @pytest.mark.django_db
    def test_the_event_migration_rolls_back_and_forward_again(self):
        """One round trip, because migrating this app twice is the expensive part of the test."""
        succeeded, results = self.call_command("migrate", "store", "0008")
        if not succeeded:
            pytest.fail("".join(results))

        assert "store_invoiceevent" not in connection.introspection.table_names()
        assert _trigger_names("store_invoice") == []

        succeeded, results = self.call_command("migrate", "store")
        if not succeeded:
            pytest.fail("".join(results))

        assert "store_invoiceevent" in connection.introspection.table_names()
        assert _trigger_names("store_invoice")

        invoice = make_invoice()
        assert [event.pgh_label for event in events_for(invoice)] == ["insert"]


class TestAppendOnly:
    """The audit claim is enforced by the database, not by convention."""

    def test_an_event_row_cannot_be_updated(self):
        invoice = make_invoice()
        event = events_for(invoice)[0]

        with pytest.raises(DatabaseError, match="Cannot update or delete rows"):
            with connection.cursor() as cursor:
                cursor.execute(
                    f"UPDATE {event._meta.db_table} SET name = %s WHERE pgh_id = %s",
                    ["Tampered", event.pgh_id],
                )

    def test_the_documented_purge_path_removes_event_rows(self):
        """Retention is the integrator's to define, so append-only must have a way through."""
        import pgtrigger

        invoice = make_invoice()
        invoice.name = "Renamed"
        invoice.save()
        event_model = apps.get_model("store", "InvoiceEvent")
        recorded = events_for(invoice)

        with pgtrigger.ignore(f"{event_model._meta.label}:append_only"):
            deleted, _ = event_model.objects.filter(pgh_obj_id=invoice.pk).delete()

        assert [event.pgh_label for event in recorded] == ["insert", "update"]
        assert deleted == len(recorded)
        assert events_for(invoice) == []

    def test_an_event_row_cannot_be_deleted(self):
        invoice = make_invoice()
        event = events_for(invoice)[0]

        with pytest.raises(DatabaseError, match="Cannot update or delete rows"):
            with connection.cursor() as cursor:
                cursor.execute(
                    f"DELETE FROM {event._meta.db_table} WHERE pgh_id = %s",
                    [event.pgh_id],
                )
