import datetime
import glob
import os
import pathlib
import shutil
import tempfile
from contextlib import contextmanager
from importlib import import_module
from importlib import reload

import django
from django.apps import apps
from django.http import QueryDict
from django.test.utils import TestContextDecorator
from django.test.utils import extend_sys_path
from django.urls import get_resolver
from django.urls import include
from django.urls import path
from django.utils.module_loading import module_dir

from tests.urls import urlpatterns
from vueda.info import registration


def set_email_backend(settings, backend):
    """
    For use with the pytest `settings` fixture, not the `override_settings`
    decorator (which requires a django.test.SimpleTestCase subclass to
    decorate a class, and can scope-bleed or fight other fixtures when
    decorating a plain pytest function).

    Django 6.1 deprecates EMAIL_BACKEND (RemovedInDjango70Warning) in favor of
    MAILERS. For tests, this helper always uses MAILERS on 6.1+.
    """
    if django.VERSION >= (6, 1):
        settings.MAILERS = {"default": {"BACKEND": backend}}
    else:
        settings.EMAIL_BACKEND = backend


# This is a decorator.
class clear_info_registry_before_test(TestContextDecorator):  # noqa: N801
    """
    Clears the info registry before the wrapped test runs.

    Appending to INSTALLED_APPS (see append_installed_apps) reruns the ready()
    function for all apps, which results in `register(TOTPDeviceSerializer,
    TOTPDeviceViewSet)` getting called a second time, which we don't allow. So
    this needs to run before append_installed_apps() does, clearing the
    registry so the re-run ready() calls land in an empty one.
    """

    def enable(self):
        registration.get_empty_registry()

    def disable(self):
        pass


def append_installed_apps(settings, *apps_to_append):
    """
    For use with the pytest `settings` fixture. Companion to
    clear_info_registry_before_test: appends to INSTALLED_APPS the way
    modify_settings(INSTALLED_APPS={"append": [...]}) used to as a decorator,
    but from inside the test body so call-order relative to
    clear_info_registry_before_test (and any other settings the test
    sets first, e.g. AUTH_USER_MODEL) is explicit rather than decorator-stack
    order.
    """
    settings.INSTALLED_APPS = [*settings.INSTALLED_APPS, *apps_to_append]


def expect_one_migration_generated_today(migration_dir, name):
    """Assert one migration in ``migration_dir`` is named ``<name>_<today>.py``, and return its file name.

    ``name`` may leave out the number prefix, such as ``group_permission_migrations``. The commands name
    a migration after the date they run, so a test that checks the name after midnight sees the
    previous day's date: yesterday's date is accepted too, and the name found on disk is returned
    rather than rebuilt from the clock.
    """
    today = datetime.date.today()
    found = sorted(
        os.path.basename(path)
        for date in (today, today - datetime.timedelta(days=1))
        for path in glob.glob(os.path.join(migration_dir, f"*{name}_{date.strftime('%Y_%m_%d')}.py"))
    )
    assert len(found) == 1, (
        f"expected one {name}_<today>.py migration in {migration_dir}, found {found} among {sorted(os.listdir(migration_dir))}"
    )
    return found[0]


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

    # Adapted from django, with MIGRATION_MODULES set through the pytest
    # `settings` fixture instead of override_settings:
    # //github.com/django/django/blob/14fb36e0b083ea963220602d01386cc0fb2c40e4/tests/migrations/test_base.py#L186-L222
    @contextmanager
    def temporary_migration_module(self, settings, app_label="migrations", module=None):
        """
        Allows testing management commands in a temporary migrations module.

        Wrap all invocations to makemigrations and squashmigrations with this
        context manager in order to avoid creating migration files in your
        source tree inadvertently.

        Takes the pytest `settings` fixture, the application label that will be
        passed to makemigrations or squashmigrations, and the Python path to a
        migrations module.

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
                original_migration_modules = settings.MIGRATION_MODULES
                settings.MIGRATION_MODULES = {**original_migration_modules, app_label: new_module}
                try:
                    yield target_migrations_dir
                finally:
                    settings.MIGRATION_MODULES = original_migration_modules


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


def object_revision_of(instance):
    """The revision token the API publishes for ``instance``, or None when it has no events yet.

    Mirrors ``vueda.history.revision``: the newest event id for the row, prefixed by the tracked
    model's label so a client can compare it against an event identifier directly.
    """
    event_model = getattr(type(instance), "pgh_event_model", None)
    if event_model is None:
        return None
    latest = event_model.objects.filter(pgh_obj_id=instance.pk).order_by("-pgh_id").first()
    if latest is None:
        return None
    return f"{type(instance)._meta.concrete_model._meta.label}:{latest.pgh_id}"
