"""An enabled model without a workflow definition reports one configuration error everywhere."""

from typing import ClassVar

import pytest
from rest_framework import status
from rest_framework.reverse import reverse

from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.erring import models as erring_models
from vueda.core.permissions import filter_rows_for_user
from vueda.core.permissions import has_row_dependent_authorization
from vueda.workflow.checks import check_workflow_definitions
from vueda.workflow.exceptions import WorkflowNotConfiguredError
from vueda.workflow.models import Transition
from vueda.workflow.models import get_workflow_for_model


# Enables class Vueda.Workflow, and no migration creates a workflow for it.
UNCONFIGURED = erring_models.EnabledWithoutWorkflow
# Does not enable class Vueda.Workflow, although a migration creates a workflow for it.
ROW_WITHOUT_POLICY = erring_models.NotEnabledWithWorkflow


@pytest.mark.django_db
class TestConfigurationError(BaseTestUserMixin):
    users_to_create: ClassVar[dict] = {
        "superuser@domain.invalid": {"name": "Superuser", "password": "password", "groups": [], "is_superuser": True},
        "member@domain.invalid": {"name": "Member", "password": "password", "groups": []},
    }

    def test_the_lookup_raises(self):
        with pytest.raises(
            WorkflowNotConfiguredError, match=r"erring\.EnabledWithoutWorkflow enables class Vueda\.Workflow"
        ):
            get_workflow_for_model(UNCONFIGURED)

    def test_saving_an_object_raises(self):
        with pytest.raises(WorkflowNotConfiguredError):
            UNCONFIGURED.objects.create(name="probe")

    def test_transition_discovery_raises_instead_of_denying(self):
        user = self.users["member@domain.invalid"]

        with pytest.raises(WorkflowNotConfiguredError):
            UNCONFIGURED(name="probe").available_transitions(user)
        with pytest.raises(WorkflowNotConfiguredError):
            UNCONFIGURED(name="probe").allow_transition(Transition(), user)
        with pytest.raises(WorkflowNotConfiguredError):
            UNCONFIGURED.available_transitions_for([], user)

    def test_authorization_raises_instead_of_ignoring_state_rules(self):
        user = self.users["member@domain.invalid"]

        with pytest.raises(WorkflowNotConfiguredError):
            user.has_perm("erring.read_enabledwithoutworkflow", UNCONFIGURED(name="probe"))
        with pytest.raises(WorkflowNotConfiguredError):
            filter_rows_for_user(UNCONFIGURED.objects.all(), user)
        with pytest.raises(WorkflowNotConfiguredError):
            has_row_dependent_authorization(UNCONFIGURED)

    def test_the_workflow_endpoint_reports_the_error(self, api_client):
        api_client.force_authenticate(self.users["superuser@domain.invalid"])

        response = api_client.get(
            reverse(
                "workflow.workflow-permitted-transitions",
                kwargs={"app_label": "erring", "model": UNCONFIGURED._meta.model_name},
            ),
            format="json",
        )

        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR, response_body(response)
        assert response.data["detail"] == list(WorkflowNotConfiguredError(UNCONFIGURED).args)

    def test_the_state_history_endpoint_reports_the_error(self, settings, api_client):
        settings.ROOT_URLCONF = "tests.unit.history.urls_workflow_state_history"
        # bulk_create skips post_save, which would otherwise raise before the object exists.
        (instance,) = UNCONFIGURED.objects.bulk_create([UNCONFIGURED(name="probe")])
        api_client.force_authenticate(self.users["superuser@domain.invalid"])

        response = api_client.get(
            reverse(
                "workflow-state-history",
                kwargs={"app_label": "erring", "model": UNCONFIGURED._meta.model_name, "object_id": instance.pk},
            ),
            format="json",
        )

        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR, response_body(response)
        assert response.data["detail"] == list(WorkflowNotConfiguredError(UNCONFIGURED).args)


@pytest.mark.django_db
class TestRowWithoutPolicy(BaseTestUserMixin):
    """A workflow row is not the participation flag, so a model that does not enable workflow has none."""

    users_to_create: ClassVar[dict] = {
        "superuser@domain.invalid": {"name": "Superuser", "password": "password", "groups": [], "is_superuser": True},
    }

    def test_discovery_reports_no_transitions(self, api_client):
        api_client.force_authenticate(self.users["superuser@domain.invalid"])

        response = api_client.get(
            reverse(
                "workflow.workflow-permitted-transitions",
                kwargs={"app_label": "erring", "model": ROW_WITHOUT_POLICY._meta.model_name},
            ),
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK, response_body(response)
        assert response.data == []

    def test_object_state_is_not_found(self, api_client):
        api_client.force_authenticate(self.users["superuser@domain.invalid"])
        instance = ROW_WITHOUT_POLICY.objects.create(name="probe")

        response = api_client.get(
            reverse(
                "workflow.workflow-object-state",
                kwargs={"app_label": "erring", "model": ROW_WITHOUT_POLICY._meta.model_name, "object_id": instance.pk},
            ),
            format="json",
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND, response_body(response)


@pytest.mark.django_db
class TestDefinitionCheck:
    def test_reports_each_enabled_model_without_a_definition(self):
        warnings = check_workflow_definitions(databases=["default"])
        reported = {warning.obj for warning in warnings if warning.obj._meta.app_label == "erring"}

        assert {warning.id for warning in warnings} == {"vueda_workflow.W001"}
        assert reported == {erring_models.EnabledWithoutWorkflow}

    def test_does_not_run_without_a_database(self):
        assert check_workflow_definitions(databases=None) == []

    def test_limits_itself_to_the_given_apps(self):
        from django.apps import apps

        assert check_workflow_definitions(app_configs=[apps.get_app_config("vueda_user")], databases=["default"]) == []
