"""Deploy path for enabling workflow: missing object states are reported, then backfilled."""

from decimal import Decimal
from io import StringIO
from typing import ClassVar

import pytest
from django.core.management import CommandError
from django.core.management import call_command

from tests.conftest import BaseTestUserMixin
from tests.erring import models as erring_models
from tests.store import models as store_models
from vueda.workflow.checks import check_workflow_definitions
from vueda.workflow.models import ObjectState


def backfill(*labels):
    stdout = StringIO()
    call_command("backfillworkflowstates", *labels, stdout=stdout, stderr=StringIO())
    return stdout.getvalue()


def warnings_for(model):
    return [warning.id for warning in check_workflow_definitions(databases=["default"]) if warning.obj is model]


@pytest.mark.django_db
class TestDeployWindow(BaseTestUserMixin):
    users_to_create: ClassVar[dict] = {
        "backfill-user@domain.invalid": {"name": "Backfill User", "password": "password", "groups": []},
    }

    @pytest.fixture
    def orders(self):
        customer = store_models.Customer.objects.create(user=self.users["backfill-user@domain.invalid"])
        order_state = store_models.OrderState.objects.create(code="order_state_new", name="New")
        return [
            store_models.CustomerOrder.objects.create(
                order_number=Decimal(number), customer=customer, order_state=order_state
            )
            for number in ("2001", "2002", "2003")
        ]

    @pytest.fixture
    def created_by_the_previous_release(self, orders):
        """Two orders the previous release created during the deploy, which never got an object state."""
        missing = orders[1:]
        ObjectState.objects.filter(object_id__in=[order.pk for order in missing]).delete()
        return missing

    def test_the_check_reports_objects_without_a_state(self, created_by_the_previous_release):
        assert warnings_for(store_models.CustomerOrder) == ["vueda_workflow.W002"]

    def test_the_backfill_gives_them_the_initial_state_and_clears_the_check(self, created_by_the_previous_release):
        output = backfill("store.CustomerOrder")

        assert "store.CustomerOrder: created 2 object state(s)." in output
        for order in created_by_the_previous_release:
            order.refresh_from_db()
            assert order.workflow_state.code == "new"
        assert warnings_for(store_models.CustomerOrder) == []

    def test_running_it_again_changes_nothing(self, created_by_the_previous_release):
        backfill("store.CustomerOrder")

        assert "store.CustomerOrder: created 0 object state(s)." in backfill("store.CustomerOrder")

    def test_an_existing_state_is_kept(self, orders, created_by_the_previous_release):
        packed = orders[0]
        packed.fast_transition("pack_order")

        backfill("store")

        packed.refresh_from_db()
        assert packed.workflow_state.code == "packed"


@pytest.mark.django_db
class TestSelection:
    def test_a_model_without_workflow_is_rejected(self):
        with pytest.raises(CommandError, match=r"store\.Customer is not a workflow-enabled model"):
            backfill("store.Customer")

    def test_an_unknown_app_is_rejected(self):
        with pytest.raises(CommandError, match="No installed app with label 'nowhere'"):
            backfill("nowhere")

    def test_a_missing_definition_fails_after_the_other_models_are_backfilled(self):
        stdout, stderr = StringIO(), StringIO()

        with pytest.raises(CommandError, match=r"model\(s\) could not be backfilled"):
            call_command("backfillworkflowstates", "erring", "store", stdout=stdout, stderr=stderr)

        assert "store.CustomerOrder: created 0 object state(s)." in stdout.getvalue()
        assert f"{erring_models.MoSoVoWx._meta.label} enables class Vueda.Workflow" in stderr.getvalue()

    def test_an_app_without_workflow_models_selects_nothing(self):
        assert "No workflow-enabled models selected." in backfill("vueda_user")

    def test_a_workflow_without_an_initial_state_is_reported(self):
        store_models.CustomerOrder.get_content_type().workflow.initial_state.delete()

        with pytest.raises(CommandError, match=r"model\(s\) could not be backfilled"):
            call_command(
                "backfillworkflowstates", "store.CustomerOrder", stdout=StringIO(), stderr=(stderr := StringIO())
            )

        assert "The workflow of store.CustomerOrder has no initial state." in stderr.getvalue()
        assert warnings_for(store_models.CustomerOrder) == ["vueda_workflow.W003"]
