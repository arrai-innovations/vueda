"""Find the migrations that a generated migration depends on."""

__all__ = (
    "INSTALLED_PACKAGE_DIRECTORIES",
    "is_installed_package_app",
    "is_vueda_app",
    "latest_migration_names",
    "project_app_labels",
    "user_app_label",
)

import importlib
from pathlib import Path

from django.apps import apps as django_apps
from django.conf import settings
from django.core.management import CommandError
from django.db.migrations.loader import MigrationLoader


# The directory names that Python installs third-party packages into.
INSTALLED_PACKAGE_DIRECTORIES = frozenset(("site-packages", "dist-packages"))


def is_installed_package_app(app_label):
    """Return whether the app ``app_label`` is installed as a package, under ``site-packages`` or ``dist-packages``.

    A project cannot commit a migration written into such an app, and a reinstall puts the package's own files
    back.
    """
    return bool(INSTALLED_PACKAGE_DIRECTORIES & set(Path(django_apps.get_app_config(app_label).path).parts))


def is_vueda_app(app_label):
    """Return whether the app ``app_label`` belongs to the ``vueda`` package, so VUEDA ships its migrations.

    In a project, VUEDA is installed as a package, so only a run in VUEDA's own repository writes into such an app.
    """
    name = django_apps.get_app_config(app_label).name
    return name == "vueda" or name.startswith("vueda.")


def project_app_labels():
    """Return the labels of the installed apps that belong to the project, in installed order.

    An app installed under ``site-packages``, or ``dist-packages`` on Debian's system Python, is a third-party
    package, so it is left out.
    """
    return tuple(
        app_config.label
        for app_config in django_apps.get_app_configs()
        if not is_installed_package_app(app_config.label)
    )


def user_app_label():
    """Return the label of the app of ``AUTH_USER_MODEL``, which holds every group migration."""
    return django_apps.get_model(settings.AUTH_USER_MODEL)._meta.app_label


def latest_migration_names(app_labels):
    """Return a mapping of each app in ``app_labels`` to the name of its latest migration, read from disk now.

    An app without migrations is left out. The migration files are read again on every call, so a migration
    written since the last call is found.

    Raises ``CommandError`` for an app with more than one latest migration. Django's ``makemigrations --merge``
    joins them.
    """
    # A file written since Python last looked at its directory is otherwise missed.
    importlib.invalidate_caches()
    loader = MigrationLoader(None, ignore_no_migrations=True)
    wanted = frozenset(app_labels)
    latest = {}
    for app_label, migration_name in loader.graph.leaf_nodes():
        if app_label not in wanted:
            continue
        if app_label in latest:
            raise CommandError(
                f"The app {app_label!r} has more than one latest migration, and a new migration would depend on "
                "it. Run 'makemigrations --merge' first."
            )
        latest[app_label] = migration_name

    return latest
