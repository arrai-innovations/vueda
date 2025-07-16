import asyncio
import contextlib
import hashlib
import importlib
import io
import json
import os
from collections import OrderedDict
from urllib.parse import urlencode

import pytest
from django import db
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.core.management import call_command
from django.db import models
from django.urls import reverse
from psycopg import connect
from psycopg import sql
from rest_framework.test import APIClient


pytest_plugins = ["pytest_jsonreport"]


@pytest.fixture
def api_client():
    """
    Reuse the Django REST Framework API client for all tests intelligently (xdist will make a new one for each worker).
    """
    return APIClient()


@pytest.fixture(autouse=True, scope="function")
def suffix_each_test(request):
    """
    A `pytest` fixture to isolate the database state for each asynchronous Django test when using `pytest-django` with
    `pytest-xdist`, specifically for PostgreSQL.

    This fixture is automatically applied to each test function. It is designed to operate with Django's test framework
    in a `pytest` environment. It explicitly targets asynchronous test functions. It generates a unique db name to the
    base database name provided by `pytest-django`. This unique name ensures that each test is executed in database
    isolation, which makes parallel test execution using `pytest-xdist` more sane.

    The fixture takes care of both setting up and tearing down these individual test databases. It dynamically creates
    a new database for the test and drops it afterward. This is managed using PostgreSQL commands, with a consideration
    for the PostgreSQL limit of 63 characters on database names.

    Database connections are closed after each test to maintain a clean state.

    You must configure your Django settings to use the 'TEST_POSTGRES_DB' setting for the PostgreSQL server connection.
    """
    if not asyncio.iscoroutinefunction(request.function):
        # Skip synchronous tests
        return

    db.connections.close_all()

    template_name = settings.DATABASES.get("default").get("NAME")
    suffix = hashlib.sha1(request.function.__name__.encode("utf-8")).hexdigest()
    db_name = f"{template_name}_{suffix}"
    # PostgreSQL has a limit of 63 characters on db names.
    if len(db_name) > 63:
        db_name = db_name[:63]
    settings.DATABASES.get("default")["NAME"] = db_name

    def clean_up_db():
        from django import db

        db.connections.close_all()
        conn = connect(settings.TEST_POSTGRES_DB)
        try:
            conn.autocommit = True
            cur = conn.cursor()
            sql_str = sql.SQL("DROP DATABASE {};").format(sql.Identifier(db_name))
            cur.execute(sql_str)
            cur.close()
        finally:
            if conn is not None:
                conn.close()

        settings.DATABASES.get("default")["NAME"] = template_name

    conn = connect(settings.TEST_POSTGRES_DB)
    try:
        conn.autocommit = True
        cur = conn.cursor()
        sql_str = sql.SQL("CREATE DATABASE {} TEMPLATE {};").format(
            sql.Identifier(db_name), sql.Identifier(template_name)
        )
        cur.execute(sql_str)
        cur.close()

        request.addfinalizer(clean_up_db)
    finally:
        if conn is not None:
            conn.close()


class BaseTestAssertResponseMixin:
    def assert_response(self, response, expected_status_code):
        if response.status_code != expected_status_code:
            try:
                my_json = response.json()
                if "serverStack" in my_json:
                    print(
                        f"Unexpected response code: {response.status_code} != {expected_status_code}\nserver stack:\n{my_json['serverStack']}"
                    )
                else:
                    print(
                        f"Unexpected response code: {response.status_code} != {expected_status_code}\nresponse was:\n{response.data}"
                    )
            except ValueError:
                print(
                    f"Unexpected response code: {response.status_code} != {expected_status_code}\nresponse was:\n{response.data}"
                )
        assert response.status_code == expected_status_code, str(response.data)


class BaseTestGroupMixin:
    groups_to_create = {
        "Timesheet Reader": [
            ("tests", "Timesheet", "read"),
            ("tests", "TimesheetEntry", "read"),
        ],
        "Timesheet Creator": [
            ("tests", "Timesheet", "create"),
            ("tests", "TimesheetEntry", "create"),
        ],
        "Timesheet Updater": [
            ("tests", "Timesheet", "update"),
            ("tests", "TimesheetEntry", "update"),
        ],
        "Timesheet Deleter": [
            ("tests", "Timesheet", "delete"),
            ("tests", "TimesheetEntry", "delete"),
        ],
        "Timesheet Lister": [
            ("tests", "Timesheet", "list"),
            ("tests", "TimesheetEntry", "list"),
        ],
    }

    @property
    def groups(self):
        if not hasattr(self, "_groups"):
            self._groups = []
            for group_name, permissions in self.groups_to_create.items():
                group, _ = Group.objects.get_or_create(name=group_name)
                _permissions = []
                for permission in permissions:
                    app_label, model, perm_name = permission
                    content_type = ContentType.objects.get(app_label=app_label, model=model.lower())
                    model_class = content_type.model_class()
                    permission_obj, _ = Permission.objects.get_or_create(
                        content_type=content_type,
                        codename=f"{perm_name}_{model_class.__name__.lower()}",
                        defaults={"name": f"Can {' '.join(perm_name.split('_'))} {model_class._meta.verbose_name}"},
                    )
                    _permissions.append(permission_obj)
                group.permissions.set(_permissions)
                self._groups.append(group)
        return self._groups


class BaseTestUserMixin:
    users_to_create = {
        "testuser@example.com": {
            "name": "Test User",
            "password": "testpass",
            "groups": ["Timesheet Reader"],
        }
    }

    @property
    def users(self):
        if not hasattr(self, "_users"):
            if hasattr(self, "groups_to_create"):
                # Ensure groups are created
                self.groups  # noqa
            self._users = {}
            for email, user_data in self.users_to_create.items():
                user, _ = get_user_model().objects.get_or_create(
                    email=email,
                    defaults={
                        "name": user_data["name"],
                        "is_active": True,
                        "is_superuser": user_data.get("is_superuser", False),
                    },
                )
                user.set_password(user_data["password"])
                user.save()
                for group_name in user_data["groups"]:
                    group = Group.objects.get(name=group_name)
                    user.groups.add(group)
                self._users[email] = user
        return self._users


class BaseTestCommonModelViewSet(BaseTestAssertResponseMixin, BaseTestUserMixin, BaseTestGroupMixin):
    model: models.Model = None
    page_data_arguments = ()

    def list_url(self):
        return reverse(f"{self.model._meta.label_lower}-list")

    def detail_url(self, pk):
        return reverse(f"{self.model._meta.label_lower}-detail", kwargs={"pk": pk})

    @pytest.fixture
    def page_data(self):
        for data in self.page_data_arguments:
            self.model.objects.create(**data)
        return self.model.objects.all()

    @staticmethod
    def convert_response(response):
        # the response.data nested serializers can be OrderedDicts, since tests skip JSON serialization.
        # we need to convert them to dicts
        return {k: dict(v) if isinstance(v, OrderedDict) else v for k, v in response.data.items()}

    def get_default_response(self, arguments):
        return {key: arguments[key] for key in arguments}


class BaseTestListModelViewSet:
    list_keys_arguments = set()

    @pytest.fixture
    def list_querystring(self):
        return {}

    # page_data is needed for object creation, even though it isn't used directly in test_list.
    def test_list(self, page_data, authenticated_client, list_querystring):
        keys = {"id", "current_history_id", "formatted_name", "available_actions"}.union(self.list_keys_arguments)

        # Do we have a workflow?
        if hasattr(self.model, "workflow"):
            keys.update(
                {
                    "workflow_state_code": "draft",
                    "workflow_state_name": "Draft",
                }
            )

        response = authenticated_client.get(self.list_url(), data=list_querystring, format="json")
        assert response.status_code == 200, f"{response.status_code} != 200, response.data: {response.data}"
        response_info = {x: y for x, y in response.data.items() if x == "results"}
        current_history_id = response_info["results"][0]["current_history_id"]
        assert current_history_id is not None
        assert keys == set(response_info["results"][0].keys())
        assert {x["id"] for x in response_info["results"]} == set(list_querystring["id"])


class BaseTestDetailModelViewSet:
    @pytest.fixture
    def detail_querystring(self):
        return {}


class BaseTestCreateModelViewSet:
    expected_create_status_code = 201

    @pytest.fixture
    def create_arguments(self):
        raise NotImplementedError

    @pytest.fixture
    def expected_create_response(self, create_arguments):
        return dict(create_arguments)

    def update_expected_create_response(self, expected_create_response, new_instance):
        if self.has_delete_permission:
            available_actions = [
                "list",
                "retrieve",
                "update",
                "partial_update",
                "destroy",
                "current",
                "history-list",
            ]
        else:
            available_actions = [
                "list",
                "retrieve",
                "update",
                "partial_update",
                "current",
                "history-list",
            ]
        expected_create_response.update(
            {
                "available_actions": available_actions,
                "current_history_id": new_instance.history.latest().history_id,
                "id": new_instance.id,
            }
        )

        # Do we have a workflow?
        if hasattr(new_instance, "workflow") and "workflow_state_code" not in expected_create_response:
            expected_create_response.update(
                {
                    "workflow_state_code": "draft",
                    "workflow_state_name": "Draft",
                }
            )

    def after_create(self, new_instance, expected_create_response):
        pass

    # page_data is needed for object creation, even though it isn't used directly in test_list.
    def test_create(
        self, page_data, authenticated_client, create_arguments, expected_create_response, detail_querystring
    ):
        status_code = self.expected_create_status_code
        qs = f"?{urlencode(detail_querystring, doseq=True)}" if detail_querystring else ""
        response = authenticated_client.post(self.list_url() + qs, data=create_arguments, format="json")
        new_instance = self.model.objects.latest("pk")
        assert response.status_code == status_code, (
            f"{response.status_code} != {status_code}, response.data: {response.data}"
        )
        assert new_instance is not None
        self.update_expected_create_response(expected_create_response, new_instance)
        if status_code == 201:
            assert self.convert_response(response) == expected_create_response
        self.after_create(new_instance, expected_create_response)


class BaseTestRetrieveModelViewSet:
    @pytest.fixture
    def expected_retrieve_response(self, page_data):
        raise NotImplementedError

    def update_expected_retrieve_response(self, expected_retrieve_response, instance):
        if self.has_delete_permission:
            available_actions = [
                "list",
                "retrieve",
                "update",
                "partial_update",
                "destroy",
                "current",
                "history-list",
            ]
        else:
            available_actions = [
                "list",
                "retrieve",
                "update",
                "partial_update",
                "current",
                "history-list",
            ]
        expected_retrieve_response["available_actions"] = available_actions
        # Do we have a workflow?
        if hasattr(instance, "workflow") and "workflow_state_code" not in expected_retrieve_response:
            expected_retrieve_response.update(
                {
                    "workflow_state_code": "draft",
                    "workflow_state_name": "Draft",
                }
            )

    def test_retrieve(self, page_data, authenticated_client, expected_retrieve_response, detail_querystring):
        instance = page_data.first()
        response = authenticated_client.get(self.detail_url(instance.id), data=detail_querystring)
        self.update_expected_retrieve_response(expected_retrieve_response, instance)
        assert response.status_code == 200, f"{response.status_code} != 200, response.data: {response.data}"
        assert response.data == expected_retrieve_response


class BaseTestDestroyModelViewSet:
    def test_destroy(self, page_data, authenticated_client):
        pk = page_data.first().id
        response = authenticated_client.delete(self.detail_url(pk))
        if self.has_delete_permission:
            assert response.status_code == 204, f"{response.status_code} != 204, response.data: {response.data}"
            assert not self.model.objects.filter(pk=pk).exists()
        else:
            assert response.status_code == 403, f"{response.status_code} != 403, response.data: {response.data}"
            assert self.model.objects.filter(pk=pk).exists()


class BaseTestUpdateModelViewSet:
    expected_update_status_code = 200

    @pytest.fixture
    def update_arguments(self, page_data):
        raise NotImplementedError

    @pytest.fixture
    def expected_update_response(self, update_arguments):
        return dict(update_arguments)

    @pytest.fixture
    def authenticated_client(self, api_client):
        raise NotImplementedError

    def update_expected_update_response(self, expected_update_response, updated_instance):
        expected_update_response["current_history_id"] = updated_instance.history.latest().history_id

        if self.has_delete_permission:
            available_actions = [
                "list",
                "retrieve",
                "update",
                "partial_update",
                "destroy",
                "current",
                "history-list",
            ]
        else:
            available_actions = [
                "list",
                "retrieve",
                "update",
                "partial_update",
                "current",
                "history-list",
            ]
        expected_update_response["available_actions"] = available_actions

        # Do we have a workflow?
        if hasattr(updated_instance, "workflow") and "workflow_state_code" not in expected_update_response:
            expected_update_response.update(
                {
                    "workflow_state_code": "draft",
                    "workflow_state_name": "Draft",
                }
            )

    def after_update(self, updated_instance, expected_update_response):
        pass

    def test_update(
        self,
        page_data,
        authenticated_client,
        update_arguments,
        expected_update_response,
        detail_querystring,
    ):
        status_code = self.expected_update_status_code
        qs = f"?{urlencode(detail_querystring, doseq=True)}" if detail_querystring else ""
        response = authenticated_client.put(
            self.detail_url(page_data.first().id) + qs, data=update_arguments, format="json"
        )
        updated_instance = self.model.objects.all().first()
        assert response.status_code == status_code, (
            f"{response.status_code} != {status_code}, response.data: {response.data}"
        )
        assert updated_instance is not None
        self.update_expected_update_response(expected_update_response, updated_instance)
        if status_code == 200:
            assert self.convert_response(response) == expected_update_response
        self.after_update(updated_instance, expected_update_response)


class BaseTestModelViewSet(
    BaseTestListModelViewSet,
    BaseTestDetailModelViewSet,
    BaseTestCreateModelViewSet,
    BaseTestRetrieveModelViewSet,
    BaseTestDestroyModelViewSet,
    BaseTestUpdateModelViewSet,
    BaseTestCommonModelViewSet,
):
    has_delete_permission = False


class BaseTestCallCommand:
    # @staticmethod
    def call_command(self, *args):
        """
        Call a management command and capture the results.

        Args:
            *args: All arguments are passed to call command.

        Returns:
            tuple:
                boolean: False if erred calling the command, True otherwise.
                string: The captured results or error text.
        """
        err = io.StringIO()
        out = io.StringIO()

        # If we don't do this, sometimes we can't import a newly created migration.
        # Do it here, so we don't need to know which calls require it, and which don't.
        importlib.invalidate_caches()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            call_command(*args)

        # Did an error occur?
        if err.tell():
            err.seek(0)
            return False, err.read()

        # Return the results.
        out.seek(0)
        return True, out.readlines()


class BasePyTestJsonResults:
    @staticmethod
    def handle_json_results(json_report_file, subprocess_exception_text):
        with open(json_report_file, "rb") as f:
            json_results = json.load(f)

        if os.path.exists(json_report_file):
            os.remove(json_report_file)

        if "error" in json_results["summary"]:
            for test in json_results["tests"]:
                if test["outcome"] == "error":
                    if "longrepr" in test["setup"]:
                        pytest.fail(subprocess_exception_text + test["setup"]["longrepr"])

                    elif "longrepr" in test["call"]:
                        pytest.fail(subprocess_exception_text + test["call"]["longrepr"])

                    elif "longrepr" in test["teardown"]:
                        pytest.fail(subprocess_exception_text + test["teardown"]["longrepr"])

                    else:
                        # Not sure what the error was in, so give the entire error object back.
                        pytest.fail(subprocess_exception_text + str(test))

        if "failed" in json_results["summary"]:
            for test in json_results["tests"]:
                if test["outcome"] == "failed":
                    if "longrepr" in test["setup"]:
                        pytest.fail(subprocess_exception_text + test["setup"]["longrepr"])

                    elif "longrepr" in test["call"]:
                        pytest.fail(subprocess_exception_text + test["call"]["longrepr"])

                    elif "longrepr" in test["teardown"]:
                        pytest.fail(subprocess_exception_text + test["teardown"]["longrepr"])

                    else:
                        # Not sure what the error was in, so give the entire dictionary as the error.
                        pytest.fail(subprocess_exception_text + str(test))
