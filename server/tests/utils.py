import os
import pathlib
import shutil
import tempfile
from contextlib import contextmanager
from importlib import import_module
from importlib import reload

from django.apps import apps
from django.conf import settings
from django.http import QueryDict
from django.test import modify_settings
from django.test import override_settings
from django.test.utils import extend_sys_path
from django.urls import get_resolver
from django.urls import include
from django.urls import path
from django.utils.module_loading import module_dir

from tests.urls import urlpatterns
from vueda.info import registration


# This is a decorator.
class info_register_aware_modify_settings(modify_settings):  # noqa N801
    """
    When django calls enable, it reruns the ready functions for all apps. This
    results in `register(TOTPDeviceSerializer, TOTPDeviceViewSet)` getting
    called a second time, which we don't allow. So, we need to clear the
    registry before we enable the second time.
    """

    def enable(self):
        registration.get_empty_registry()
        super().enable()


class BaseTestMigrations:
    @staticmethod
    def reload_module(results, migration_dir):
        for item in results:
            if item.find(migration_dir) != -1:
                item = item.strip().rsplit(".", 1)[0]
                item_path = pathlib.Path(item)
                path_parts = item_path.parts[-3:]
                path = ".".join(path_parts)
                module = import_module(path)
                reload(module)
                return module

    # Copied from django with no changes:
    # https://github.com/django/django/blob/14fb36e0b083ea963220602d01386cc0fb2c40e4/django/test/testcases.py#L393-L398
    def settings(self, **kwargs):
        """
        A context manager that temporarily sets a setting and reverts to the
        original value when exiting the context.
        """
        return override_settings(**kwargs)

    # Copied from django with no changes:
    # //github.com/django/django/blob/14fb36e0b083ea963220602d01386cc0fb2c40e4/tests/migrations/test_base.py#L186-L222
    @contextmanager
    def temporary_migration_module(self, app_label="migrations", module=None):
        """
        Allows testing management commands in a temporary migrations module.

        Wrap all invocations to makemigrations and squashmigrations with this
        context manager in order to avoid creating migration files in your
        source tree inadvertently.

        Takes the application label that will be passed to makemigrations or
        squashmigrations and the Python path to a migrations module.

        The migrations module is used as a template for creating the temporary
        migrations module. If it isn't provided, the application's migrations
        module is used, if it exists.

        Returns the filesystem path to the temporary migrations module.
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            target_dir = tempfile.mkdtemp(dir=temp_dir)
            with open(os.path.join(target_dir, "__init__.py"), "w"):
                pass
            target_migrations_dir = os.path.join(target_dir, "migrations")

            if module is None:
                module = apps.get_app_config(app_label).name + ".migrations"

            try:
                source_migrations_dir = module_dir(import_module(module))
            except (ImportError, ValueError):
                pass
            else:
                shutil.copytree(source_migrations_dir, target_migrations_dir)

            # TODO: Test this change in django with all tests.  If it is fine, a pull request and
            #   new test could get created for django, and then this wouldn't be a customization.
            with extend_sys_path(temp_dir):
                new_module = os.path.basename(target_dir) + ".migrations"
                migration_modules = {**settings.MIGRATION_MODULES, app_label: new_module}
                with self.settings(MIGRATION_MODULES=migration_modules):
                    yield target_migrations_dir


class FakeRequest:
    def __init__(self, query_params=None, data=None, method="GET", user=None):
        if query_params is None:
            query_params = {}

        # GET
        # a dictionary-like class customized to deal with multiple values for the same key
        self.query_params = QueryDict("", mutable=True)

        for key, value in query_params.items():
            self.query_params.setlist(key, [value] if isinstance(value, str) else value)
        # POST, PUT, PATCH
        self.data = data
        self.method = method
        self.user = user


class FakeView:
    def __init__(
        self,
        request,
        serializer_class,
        action=None,
        queryset=None,
        allowed_extra_actions=frozenset(("current", "history-list")),
    ):
        self.request = request
        self.serializer_class = serializer_class
        self.action = action
        self.queryset = queryset
        self.allowed_extra_actions = allowed_extra_actions

    def get_serializer_class(self):
        return self.serializer_class

    def get_queryset(self):
        if callable(self.queryset):
            return self.queryset()
        return self.queryset

    def get_allowed_extra_actions(self, request, *, instance=None):
        return set(self.allowed_extra_actions)


# Because rest framework loads settings on class import there's no way to
# override through 'settings', but we will do it regardless, to be thorough.
@contextmanager
def adjust_page_size(settings, value):
    orig_value = settings.REST_FRAMEWORK["PAGE_SIZE"]
    settings.REST_FRAMEWORK["PAGE_SIZE"] = value
    try:
        yield
    finally:
        settings.REST_FRAMEWORK["PAGE_SIZE"] = orig_value


@contextmanager
def use_test_router(router_class, url_path, registrations):
    """
    Creates a router.
    Registers viewsets with the router.
    And removes the urlpatterns when done, to prevent urlpattern bleed into other tests.
    """
    try:
        router = router_class()
        for name, viewset in registrations:
            router.register(name, viewset)
        urlpatterns.append(
            path(url_path, include(router.urls)),
        )
        resolver = get_resolver()
        resolver._populated = False  # Modified url patterns, to force _populate to refresh the resolvers cached data.
        yield router
    finally:
        urlpatterns.pop()
        resolver._populated = False  # Modified url patterns, to force _populate to refresh the resolvers cached data.
