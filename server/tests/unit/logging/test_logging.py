import os
from copy import deepcopy
from http import HTTPStatus
from typing import ClassVar

import pytest
from django.db import connections
from django.urls import reverse
from django.utils.log import configure_logging

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.logging import models as logging_models
from tests.logging import viewsets
from tests.utils import use_test_router
from vueda.core.routers import IncludeAppInRouteNameRouter


# Changing the logging in settings does nothing.  So, instead
# we update the logging directly, and reset it back when done.
@pytest.fixture
def log_to_db(settings):
    new_logging = deepcopy(settings.LOGGING)

    new_logging["formatters"]["test_logging"] = {"format": "%(message)s"}
    new_logging["handlers"]["db"] = {
        "level": "ERROR",
        "class": "tests.logging.handlers.DBHandler",
        "formatter": "test_logging",
    }
    new_logging["handlers"]["file"]["class"] = "logging.FileHandler"
    new_logging["handlers"]["file"]["encoding"] = "UTF-8"
    new_logging["handlers"]["file"]["level"] = "ERROR"
    del new_logging["handlers"]["file"]["backupCount"]
    del new_logging["handlers"]["file"]["maxBytes"]
    new_logging["loggers"] = {
        "django": {
            "handlers": ["file", "db"],
            "level": "ERROR",
            "propagate": False,
        },
    }

    configure_logging(settings.LOGGING_CONFIG, new_logging)

    yield settings

    # Reset logging to Django's startup state. The "django" logger is defined by Django's
    # DEFAULT_LOGGING, not settings.LOGGING, and dictConfig runs with
    # disable_existing_loggers=False, so re-applying settings.LOGGING alone would leave this
    # fixture's db handler and ERROR level on the "django" logger. configure_logging reapplies
    # DEFAULT_LOGGING and settings.LOGGING together, the same way startup does, fully restoring it.
    configure_logging(settings.LOGGING_CONFIG, settings.LOGGING)


@pytest.fixture
def process_id_with_log_cleanup():
    """Yield this process's id, then delete the log records written for it and close db_logging.

    The DB handler writes on the db_logging connection outside the test's transaction, so its
    records survive the rollback. Cleaning up here rather than at the end of a test means a failing
    assert can't leave a record behind for the next test that looks for this process id. The ORM
    can't do the delete, so it is raw SQL. Closing the connection lets pytest drop the database.
    """
    process_id = os.getpid()

    yield process_id

    connection = connections["db_logging"]
    with connection.cursor() as cursor:
        cursor.execute(
            "BEGIN; DELETE FROM logging_logrecords WHERE process_id = %s; COMMIT;",
            (process_id,),
        )
    connection.close()


@pytest.mark.django_db(databases=("default", "db_logging"))
class TestVuedaValidationErrors(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Admin": [
            ("logging", "LogRecords", "create"),
            ("logging", "LogRecords", "read"),
            ("logging", "LogRecords", "update"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "test_admin@domain.invalid": {
            "name": "Test Admin",
            "password": "testpass",
            "groups": ["Admin"],
        },
    }

    def test_validation_errors_are_logged(self, api_client, log_to_db, process_id_with_log_cleanup):
        process_id = process_id_with_log_cleanup
        api_client.force_authenticate(user=self.users["test_admin@domain.invalid"])

        # Need a record that I can update, so I cause the validation to fail, which generates a log record.
        obj = logging_models.LogRecords.objects.create(
            message="Test",
            name="Test",
            process_id=0,
        )

        with use_test_router(IncludeAppInRouteNameRouter, "logging/", (("log_records", viewsets.LogRecordsViewSet),)):
            # Send an update to the serializer, so we can generate the validation errors for process id 1.
            # Refer to tests/logging/serializers.py -> LogRecordsSerializer -> def validate.
            response = api_client.put(
                reverse("logging.logrecords-detail", kwargs={"pk": obj.pk}),
                format="json",
                data={
                    "process_id": 1,
                },
            )

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert "Test Error 1" in str(response.data["non_field_errors"][0])
        assert "Test Error 2" in str(response.data["non_field_errors"][1])

        record = logging_models.LogRecords.objects.using("db_logging").get(process_id=process_id)

        assert "Test Error 1" in record.traceback
        assert "Test Error 2" in record.traceback

    def test_confirmation_required_is_not_logged(self, api_client, log_to_db, process_id_with_log_cleanup):
        process_id = process_id_with_log_cleanup
        api_client.force_authenticate(user=self.users["test_admin@domain.invalid"])

        # Need a record that I can update, so the request reaches the warnings gate.
        obj = logging_models.LogRecords.objects.create(
            message="Test",
            name="Test",
            process_id=0,
        )

        with use_test_router(IncludeAppInRouteNameRouter, "logging/", (("log_records", viewsets.LogRecordsViewSet),)):
            # Send an update to the serializer, so get_warnings() gates the write for process id 2.
            # Refer to tests/logging/serializers.py -> LogRecordsSerializer -> get_warnings.
            response = api_client.put(
                reverse("logging.logrecords-detail", kwargs={"pk": obj.pk}),
                format="json",
                data={
                    "process_id": 2,
                },
            )

        assert response.status_code == HTTPStatus.CONFLICT, response_body(response)
        assert response.data["confirmation_required"] is True
        assert "Test Confirmation Warning" in str(response.data["warnings"]["non_field_errors"][0])

        record = logging_models.LogRecords.objects.using("db_logging").filter(process_id=process_id).first()

        assert record is None
