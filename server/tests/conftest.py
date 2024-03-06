import asyncio
import hashlib

import pytest
from django import db
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from psycopg import connect
from psycopg import sql
from rest_framework.test import APIClient


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
    suffix = hashlib.sha1(request.function.__name__.encode("utf-8")).hexdigest()  # noqa: DUO130
    db_name = "{}_{}".format(template_name, suffix)
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
        assert response.status_code == expected_status_code, response.data


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
                        name=f"Can {' '.join(perm_name.split('_'))} {model_class._meta.verbose_name}",
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
                    },
                )
                user.set_password(user_data["password"])
                user.save()
                for group_name in user_data["groups"]:
                    group = Group.objects.get(name=group_name)
                    user.groups.add(group)
                self._users[email] = user
        return self._users
