import asyncio
import hashlib

import pytest
from django import db
from django.conf import settings
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
