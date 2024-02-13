import asyncio
import hashlib
import shutil

import pytest
from django import db
from django.conf import settings
from psycopg import connect
from psycopg import sql
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture(autouse=True, scope="function")
def suffix_each_test(request):
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


@pytest.fixture(autouse=True, scope="session")
def suffix_test_suite(request):
    def clean_up_tmp_media():
        shutil.rmtree("/tmp/media", ignore_errors=True)  # do not blowup if errors are encountered.

    request.addfinalizer(clean_up_tmp_media)
