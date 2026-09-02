"""Coverage for what the pghistory backend records: events per operation, and their action context.

The models here are ordinary VUEDA models with no history declaration, so they exercise the
default-on policy rather than an opt-in.
"""

import decimal

import pytest
from django.apps import apps
from django.db import DatabaseError
from django.db import connection

from tests.store import models as store_models
from vueda.core.audit import audited_action


pytestmark = pytest.mark.django_db


def events_for(instance):
    """Return the event rows for one object, oldest first."""
    event_model = apps.get_model(instance._meta.app_label, f"{instance.__class__.__name__}Event")
    return list(event_model.objects.filter(pgh_obj_id=instance.pk).order_by("pgh_id"))


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

    def test_an_event_row_cannot_be_deleted(self):
        invoice = make_invoice()
        event = events_for(invoice)[0]

        with pytest.raises(DatabaseError, match="Cannot update or delete rows"):
            with connection.cursor() as cursor:
                cursor.execute(
                    f"DELETE FROM {event._meta.db_table} WHERE pgh_id = %s",
                    [event.pgh_id],
                )
