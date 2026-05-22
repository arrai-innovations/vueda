import logging
import os
from copy import deepcopy
from http import HTTPStatus
from pprint import pformat
from typing import ClassVar

import pytest
from django.db import connections

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.logging import models as logging_models
from tests.logging import viewsets
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
        "filters": ["ignore_validation_warnings"],
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

    logging.config.dictConfig(new_logging)

    yield settings

    logging.config.dictConfig(settings.LOGGING)


@pytest.mark.django_db(databases=("default", "db_logging"))
class TestVuedaValidationErrors(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Admin": [
            ("contenttypes", "ContentType", "list"),
            ("contenttypes", "ContentType", "read"),
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

    def test_warnings_ignored_from_log_mixed_errors_and_warnings(self, api_client, log_to_db):
        process_id = os.getpid()
        api_client.force_authenticate(user=self.users["test_admin@domain.invalid"])

        router = IncludeAppInRouteNameRouter()
        router.register("log_records", viewsets.LogRecordsViewSet)

        # Need a record that I can update, so I cause the validation to fail, which generates a log record.
        obj = logging_models.LogRecords.objects.create(
            message="Test",
            name="Test",
            process_id=0,
        )

        # Send an update to the serializer, so we can generate the validation errors for process id 1.
        # Refer to tests/logging/serializers.py -> LogRecordsSerializer -> def validate -> 'case 1'.
        response = api_client.put(
            f"/routes/tests/logging/log_records/{obj.pk}/",
            format="json",
            data={
                "process_id": 1,
            },
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST, pformat(response.data)
        assert "Test Error 1" in str(response.data["non_field_errors"][0])
        assert "Test Warning 1" in str(response.data["non_field_errors"][1])
        assert "Test Error 2" in str(response.data["non_field_errors"][2])
        assert "Test Warning 2" in str(response.data["non_field_errors"][3])

        record = logging_models.LogRecords.objects.using("db_logging").get(process_id=process_id)

        assert "Test Error 1" in record.traceback
        assert "Test Warning 1" in record.traceback
        assert "Test Error 2" in record.traceback
        assert "Test Warning 2" in record.traceback

        # Remove records we no longer need, in case we are running the tests locally
        # and not in parallel.  This doesn't work if we do it through the ORM.
        connection = connections["db_logging"]
        with connection.cursor() as cursor:
            cursor.execute(
                "BEGIN; DELETE FROM logging_logrecords WHERE process_id = %s; COMMIT;",
                (process_id,),
            )

        # Close the connection, so it isn't still connected to the database when pytest tries to drop it.
        connection = connections["db_logging"]
        connection.close()

    def test_warnings_ignored_from_log_only_errors(self, api_client, log_to_db):
        process_id = os.getpid()
        api_client.force_authenticate(user=self.users["test_admin@domain.invalid"])

        router = IncludeAppInRouteNameRouter()
        router.register("log_records", viewsets.LogRecordsViewSet)

        # Need a record that I can update, so I cause the validation to fail, which generates a log record.
        obj = logging_models.LogRecords.objects.create(
            message="Test",
            name="Test",
            process_id=0,
        )

        # Send an update to the serializer, so we can generate the validation errors for process id 2.
        # Refer to tests/logging/serializers.py -> LogRecordsSerializer -> def validate -> 'case 2'.
        response = api_client.put(
            f"/routes/tests/logging/log_records/{obj.pk}/",
            format="json",
            data={
                "process_id": 2,
            },
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST, pformat(response.data)
        assert "Test Error 1" in str(response.data["non_field_errors"][0])
        assert "Test Error 2" in str(response.data["non_field_errors"][1])

        record = logging_models.LogRecords.objects.using("db_logging").get(process_id=process_id)

        assert "Test Error 1" in record.traceback
        assert "Test Error 2" in record.traceback

        # Remove records we no longer need, in case we are running the tests locally
        # and not in parallel.  This doesn't work if we do it through the ORM.
        connection = connections["db_logging"]
        with connection.cursor() as cursor:
            cursor.execute(
                "BEGIN; DELETE FROM logging_logrecords WHERE process_id = %s; COMMIT;",
                (process_id,),
            )

        # Close the connection, so it isn't still connected to the database when pytest tries to drop it.
        connection = connections["db_logging"]
        connection.close()

    def test_warnings_ignored_from_log_only_warnings(self, api_client, log_to_db):
        process_id = os.getpid()
        api_client.force_authenticate(user=self.users["test_admin@domain.invalid"])

        router = IncludeAppInRouteNameRouter()
        router.register("log_records", viewsets.LogRecordsViewSet)

        # Need a record that I can update, so I cause the validation to fail, which generates a log record.
        obj = logging_models.LogRecords.objects.create(
            message="Test",
            name="Test",
            process_id=0,
        )

        # Send an update to the serializer, so we can generate the validation errors for process id 3.
        # Refer to tests/logging/serializers.py -> LogRecordsSerializer -> def validate -> 'case 3'.
        response = api_client.put(
            f"/routes/tests/logging/log_records/{obj.pk}/",
            format="json",
            data={
                "process_id": 3,
            },
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST, pformat(response.data)
        assert "Test Warning 1" in str(response.data["non_field_errors"][0])
        assert "Test Warning 2" in str(response.data["non_field_errors"][1])

        record = logging_models.LogRecords.objects.using("db_logging").filter(process_id=process_id).first()

        assert record is None

        # Close the connection, so it isn't still connected to the database when pytest tries to drop it.
        connection = connections["db_logging"]
        connection.close()
