import asyncio
import contextlib
import hashlib
import importlib
import io
from collections.abc import Iterable
from http import HTTPStatus
from pprint import pformat
from typing import ClassVar

import pytest
from django import db
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.core.management import call_command
from django.db import models
from django.db.models import Q
from django.test import TransactionTestCase
from django.urls import reverse
from psycopg import connect
from psycopg import sql
from rest_framework.test import APIClient

from tests.utils import object_revision_of


POSTGRES_MAX_DB_NAME_LENGTH = 63


def response_body(response):
    """Return the best available representation of a response body for assertion messages."""
    if hasattr(response, "data"):
        if isinstance(response.data, str) and "Traceback" in response.data:
            return response.data
        return pformat(response.data)
    try:
        return response.json()
    except (ValueError, AttributeError):
        return response.content


def cached_filterset_field_names(filterset_class):
    """
    The names of the filters on ``filterset_class`` itself that are holding a built form field.

    ``django_filters.Filter.field`` caches the form field it builds on whichever filter it is read
    from, and a filterset's own ``base_filters`` are shared by every request the process handles.
    Value-derived filters (``AllValuesFilter`` and ``AllValuesMultipleFilter``) read their choices
    out of the database while building that field, so a field cached there freezes those choices for
    the life of the process: values added afterwards are rejected as invalid choices, and model-info
    reports the stale set.

    Read filters from a filterset instance, whose ``filters`` are per-request copies, rather than
    from the ``get_filters()`` classmethod, and this stays empty.
    """
    return sorted(name for name, filter_obj in filterset_class.base_filters.items() if "_field" in filter_obj.__dict__)


def clear_cached_filterset_fields(filterset_class):
    """
    Drop any form field cached on ``filterset_class``'s own filters, so a test starts from the state
    a fresh process would be in rather than from whatever earlier tests left behind. See
    ``cached_filterset_field_names`` for why those filters are shared.
    """
    for filter_obj in filterset_class.base_filters.values():
        filter_obj.__dict__.pop("_field", None)


def use_plain_base_manager(model, monkeypatch):
    """
    Stand Django's own fallback base manager in front of ``model`` for the duration of one test.

    This is what ``Model._base_manager`` is on a model that selected none: a plain
    ``models.Manager``, auto-created, named "_base_manager". Everything that reads a base manager
    reads ``_meta.base_manager`` — ``FormattedNameBaseModel._check_ordering`` and
    ``Collector.related_objects`` both — so replacing the cached value there exercises the same path
    a missing ``Meta.base_manager_name`` produces.

    Patched rather than declared because a fixture model whose real base manager couldn't resolve its
    own ``Meta.ordering`` would report ``vueda_core.E017`` for every ``manage.py check`` the project
    runs.
    """
    plain = models.Manager()
    plain.name = "_base_manager"
    plain.model = model
    plain.auto_created = True

    monkeypatch.setitem(model._meta.__dict__, "base_manager", plain)


def use_plain_default_manager(model, monkeypatch):
    """
    Stand a plain ``models.Manager`` in front of ``model`` as its default manager for the duration of
    one test, in place of whichever manager (typically ``FormattedNameManager``) it actually declares.

    ``Model._default_manager`` reads ``_meta.default_manager``, a ``cached_property``, so replacing
    the cached value here is what a caller reading ``model._default_manager`` sees — including
    ``build_prefetch_plan``, which builds a to-many expand's ``Prefetch`` queryset from exactly that
    manager. A model whose own default manager already prepares ``formatted_name`` (annotates a
    lookup expression, applies ``formatted_name_select_related``, or both) would make every queryset
    built from it look prepared whether or not the code under test did anything -- this is how a test
    starts from a queryset that manager has not already prepared, so a missing call downstream still
    shows up as unprepared rather than being masked by the manager.

    Patched rather than declared because a fixture model whose real default manager did not prepare
    ``formatted_name`` would carry that gap into every other test that touches it, rather than only
    the one that wants it.
    """
    plain = models.Manager()
    plain.name = "_default_manager"
    plain.model = model
    plain.auto_created = True

    monkeypatch.setitem(model._meta.__dict__, "default_manager", plain)


pytest_plugins = ["celery.contrib.pytest"]

# Avoid truncating the test database between after each transactional tests, we'll handle it ourselves in suffix_each_test.
TransactionTestCase._fixture_teardown = lambda self: None


@pytest.fixture
def api_client():
    """
    Reuse the Django REST Framework API client for all tests intelligently (xdist will make a new one for each worker).
    """
    return APIClient()


@pytest.fixture(autouse=True, scope="function")
def discard_orphaned_event_models():
    """Drop event models that history registered for a model ``isolate_apps`` has since rolled back.

    ``pghistory.track`` attaches the event model it generates to the tracked model's app ``models``
    module and registers its triggers in the process-wide ``pgtrigger`` registry. ``isolate_apps``
    restores the app registry when its block exits, but restores neither of those, so the generated
    class and its trigger names outlive the model they track. A later test that reuses the model
    name then fails, because pghistory refuses to overwrite an existing module attribute and
    pgtrigger refuses a duplicate trigger name on a table.

    Removing only the orphans keeps both protections intact for a real name collision.
    """
    yield

    from django.apps import apps
    from pgtrigger import registry as pgtrigger_registry

    def is_orphaned(model):
        app_models = apps.all_models.get(model._meta.app_label, {})
        return app_models.get(model._meta.model_name) is not model

    for app_config in apps.get_app_configs():
        models_module = getattr(app_config, "models_module", None)
        if models_module is None:
            continue
        registered = apps.all_models[app_config.label]
        for name, value in list(vars(models_module).items()):
            if not isinstance(value, type) or getattr(value, "pgh_tracked_model", None) is None:
                continue
            if registered.get(name.lower()) is not value:
                delattr(models_module, name)

    for uri, (model, _trigger) in list(pgtrigger_registry._registry.items()):
        if is_orphaned(model):
            pgtrigger_registry.delete(uri)


@pytest.fixture(autouse=True, scope="function")
def suffix_each_test(request):
    """
    A `pytest` fixture to isolate the database state for each asynchronous Django test when using `pytest-django` with
    `pytest-xdist`, specifically for PostgreSQL.

    This fixture is automatically applied to each test function. It is designed to operate with Django's test framework
    in a `pytest` environment. It explicitly targets asynchronous test functions or transactional tests. It generates a unique db name to the
    base database name provided by `pytest-django`. This unique name ensures that each test is executed in database
    isolation, which makes parallel test execution using `pytest-xdist` more sane.

    The fixture takes care of both setting up and tearing down these individual test databases. It dynamically creates
    a new database for the test and drops it afterward. This is managed using PostgreSQL commands, with a consideration
    for the PostgreSQL limit of 63 characters on database names.

    Database connections are closed after each test to maintain a clean state.

    You must configure your Django settings to use the 'TEST_POSTGRES_DB' setting for the PostgreSQL server connection.
    """

    marker = request.node.get_closest_marker("django_db")
    is_transactional = marker.kwargs.get("transaction", False) if marker else False

    if not asyncio.iscoroutinefunction(request.function) and not is_transactional:
        # Skip synchronous tests
        return

    db.connections.close_all()

    template_name = settings.DATABASES.get("default").get("NAME")
    suffix = hashlib.sha1(request.function.__name__.encode("utf-8")).hexdigest()
    db_name = f"{template_name}_{suffix}"
    # PostgreSQL has a limit of 63 characters on db names.
    if len(db_name) > POSTGRES_MAX_DB_NAME_LENGTH:
        db_name = db_name[:POSTGRES_MAX_DB_NAME_LENGTH]
    settings.DATABASES.get("default")["NAME"] = db_name

    def clean_up_db():
        from django import db

        db.connections.close_all()
        conn = connect(settings.TEST_POSTGRES_DB)
        try:
            conn.autocommit = True
            cur = conn.cursor()
            sql_str = sql.SQL("DROP DATABASE {} with (force);").format(sql.Identifier(db_name))
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
                        f"Unexpected response code: {response.status_code} != {expected_status_code}\nresponse was:\n{response_body(response)}"
                    )
            except ValueError:
                print(
                    f"Unexpected response code: {response.status_code} != {expected_status_code}\nresponse was:\n{response_body(response)}"
                )
        assert response.status_code == expected_status_code, response_body(response)


class BaseTestGroupMixin:
    groups_to_create: ClassVar[dict]

    @property
    def groups(self):
        """
        Create the groups in ``groups_to_create`` and give them their permissions.

        The content types and permissions for every group are each fetched in a single query, rather
        than a pair of queries per permission entry. Almost every test builds groups during setup and
        some name a hundred permissions, so those per-entry lookups were a large share of the setup
        cost. ``ContentType.objects.get()`` does not use the content type cache, so none of them were
        being saved by it either.
        """
        if hasattr(self, "_groups"):
            return self._groups

        wanted_content_types = {
            (app_label, model.lower())
            for permissions in self.groups_to_create.values()
            for app_label, model, _perm_name in permissions
        }

        content_types = {}
        if wanted_content_types:
            query = Q()
            for app_label, model_name in wanted_content_types:
                query |= Q(app_label=app_label, model=model_name)
            content_types = {
                (content_type.app_label, content_type.model): content_type
                for content_type in ContentType.objects.filter(query)
            }

            missing = wanted_content_types - set(content_types)
            if missing:
                names = ", ".join(f"{app_label}.{model}" for app_label, model in sorted(missing))
                raise ContentType.DoesNotExist(f"No content type for {names}.")

        # Permissions for a model are few, so fetching all of them for the content types in play is
        # cheaper than asking for each (content type, codename) pair individually.
        permissions_by_content_type_and_codename = {
            (permission.content_type_id, permission.codename): permission
            for permission in Permission.objects.filter(content_type__in=list(content_types.values()))
        }

        self._groups = []
        for group_name, permissions in self.groups_to_create.items():
            group, _ = Group.objects.get_or_create(name=group_name)
            group_permissions = []
            for app_label, model, perm_name in permissions:
                content_type = content_types[(app_label, model.lower())]
                # A content type's `model` is the model's `_meta.model_name`, which is its class name
                # lowercased, so it gives the same codename as resolving the model class would.
                codename = f"{perm_name}_{content_type.model}"
                permission = permissions_by_content_type_and_codename.get((content_type.pk, codename))
                if permission is None:
                    raise Permission.DoesNotExist(f"No permission with codename {codename!r} on {app_label}.{model}.")
                group_permissions.append(permission)
            group.permissions.set(group_permissions)
            self._groups.append(group)

        return self._groups


class BaseTestUserMixin:
    users_to_create: ClassVar[dict]

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
                # "groups" is optional, for users that only exist to be associated with test objects.
                for group_name in user_data.get("groups", ()):
                    group = Group.objects.get(name=group_name)
                    user.groups.add(group)
                self._users[email] = user
        return self._users


class BaseTestCommonModelViewSet(BaseTestAssertResponseMixin, BaseTestUserMixin, BaseTestGroupMixin):
    model: models.Model = None
    page_data_arguments = ()

    def list_url(self, query=None):
        return reverse(f"{self.model._meta.label_lower}-list", query=query)

    def detail_url(self, pk, query=None):
        return reverse(f"{self.model._meta.label_lower}-detail", kwargs={"pk": pk}, query=query)

    @pytest.fixture
    def page_data(self):
        for data in self.page_data_arguments:
            self.model.objects.create(**data)
        return self.model.objects.all()

    @staticmethod
    def convert_response(response):
        # the response.data nested serializers can be OrderedDicts or ReturnDict, since tests skip JSON serialization
        # we need to convert them to dicts
        return {k: dict(v) if isinstance(v, dict) else v for k, v in response.data.items()}


class BaseTestListModelViewSet:
    list_keys_arguments = set()

    @pytest.fixture
    def list_querystring(self):
        return {}

    # page_data is needed for object creation, even though it isn't used directly in test_list.
    def test_list(self, page_data, authenticated_client, list_querystring):
        keys = {"id", "object_revision", "formatted_name"}.union(self.list_keys_arguments)

        # Do we have a workflow?
        if hasattr(self.model, "workflow"):
            keys.update(
                {
                    "workflow_state_code": "draft",
                    "workflow_state_name": "Draft",
                }
            )

        response = authenticated_client.get(self.list_url(), data=list_querystring, format="json")
        assert response.status_code == HTTPStatus.OK, response_body(response)
        # Find the record being validated by matching its values rather than assuming it is first in
        # the results, because other rows can sort before it.
        response_info = response.json()
        index_of_page_data_arguments_item = None
        for index, result in enumerate(response_info["results"]):
            if index_of_page_data_arguments_item is not None:
                break
            if not self.page_data_arguments:
                index_of_page_data_arguments_item = 0
            else:
                all_match = set()
                for key, value in self.page_data_arguments[0].items():
                    # Make sure iterables are the same type.
                    if isinstance(value, Iterable) and not isinstance(value, str):
                        value = tuple(value)
                    if isinstance(result[key], Iterable) and not isinstance(result[key], str):
                        result[key] = tuple(result[key])
                    all_match.add(result[key] == value)
                if all(all_match):
                    index_of_page_data_arguments_item = index

        # If the index is still none, then we need the results to figure out why.
        assert index_of_page_data_arguments_item is not None, response_info["results"]

        object_revision = response_info["results"][index_of_page_data_arguments_item]["object_revision"]
        assert object_revision is not None
        assert keys == set(response_info["results"][index_of_page_data_arguments_item].keys())
        assert {x["id"] for x in response_info["results"]} == set(list_querystring["id"])


class BaseTestDetailModelViewSet:
    @pytest.fixture
    def detail_querystring(self):
        return {}


class BaseTestCreateModelViewSet:
    expected_create_status_code = HTTPStatus.CREATED

    @pytest.fixture
    def create_arguments(self):
        raise NotImplementedError

    @pytest.fixture
    def expected_create_response(self, create_arguments):
        return dict(create_arguments)

    def update_expected_create_response(self, expected_create_response, new_instance):
        expected_create_response.update(
            {
                "object_revision": object_revision_of(new_instance),
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

    # page_data is needed for object creation, even though it isn't used directly in test_list.
    def test_create(
        self, page_data, authenticated_client, create_arguments, expected_create_response, detail_querystring
    ):
        status_code = self.expected_create_status_code
        response = authenticated_client.post(self.list_url(detail_querystring), data=create_arguments, format="json")
        new_instance = self.model.objects.latest("pk")
        assert response.status_code == status_code, response_body(response)
        assert new_instance is not None
        self.update_expected_create_response(expected_create_response, new_instance)
        if status_code == HTTPStatus.CREATED:
            assert self.convert_response(response) == expected_create_response


class BaseTestRetrieveModelViewSet:
    @pytest.fixture
    def expected_retrieve_response(self, page_data):
        raise NotImplementedError

    def update_expected_retrieve_response(self, expected_retrieve_response, instance):
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
        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data == expected_retrieve_response


class BaseTestDestroyModelViewSet:
    def test_destroy(self, page_data, authenticated_client):
        pk = page_data.first().id
        response = authenticated_client.delete(self.detail_url(pk))
        if self.has_delete_permission:
            assert response.status_code == HTTPStatus.NO_CONTENT, response_body(response)
            assert not self.model.objects.filter(pk=pk).exists()
        else:
            assert response.status_code == HTTPStatus.FORBIDDEN, response_body(response)
            assert self.model.objects.filter(pk=pk).exists()


class BaseTestUpdateModelViewSet:
    expected_update_status_code = HTTPStatus.OK

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
        expected_update_response["object_revision"] = object_revision_of(updated_instance)

        # Do we have a workflow?
        if hasattr(updated_instance, "workflow") and "workflow_state_code" not in expected_update_response:
            expected_update_response.update(
                {
                    "workflow_state_code": "draft",
                    "workflow_state_name": "Draft",
                }
            )

    def test_update(
        self,
        page_data,
        authenticated_client,
        update_arguments,
        expected_update_response,
        detail_querystring,
    ):
        status_code = self.expected_update_status_code
        response = authenticated_client.put(
            self.detail_url(page_data.first().id, detail_querystring), data=update_arguments, format="json"
        )
        updated_instance = self.model.objects.first()
        assert response.status_code == status_code, response_body(response)
        assert updated_instance is not None
        self.update_expected_update_response(expected_update_response, updated_instance)
        if status_code == HTTPStatus.OK:
            assert self.convert_response(response) == expected_update_response


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
    def call_command_capturing_output(self, *args, stdout=None, stderr=None):
        """
        Call a management command and capture the results.

        Args:
            *args: All arguments are passed to call command.

        Returns:
            tuple:
                boolean: False if erred calling the command, True otherwise.
                string: The captured results or error text.
        """
        err = io.StringIO() if stderr is None else stderr
        out = io.StringIO() if stdout is None else stdout

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
