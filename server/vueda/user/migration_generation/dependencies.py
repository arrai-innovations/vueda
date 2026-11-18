"""Find the migrations that a generated migration depends on."""

__all__ = (
    "INSTALLED_PACKAGE_PATHS",
    "get_installed_package_paths",
    "is_installed_package_app",
    "is_installed_package_path",
    "is_vueda_app",
    "latest_migration_names",
    "project_app_labels",
    "user_app_label",
)

import importlib
import os
import site
import sys
import sysconfig

from django.apps import apps as django_apps
from django.conf import settings
from django.core.management import CommandError
from django.db.migrations.loader import MigrationLoader

from vueda.user.management.commands.utils import get_migrations_path


def get_installed_package_paths():
    """Return the directories packages are installed into, normalized for comparison.

    A migration under one of them belongs to a package, so the project cannot commit a rewrite of it,
    and reinstalling the package puts the original back. An editable install leaves its files in their
    source tree, so it is not under any of these.

    Besides the environment's own package directories, these include the base interpreter's, which a
    virtual environment created with ``--system-site-packages`` also imports from, and the user site
    directory that ``pip install --user`` installs into.

    On Windows, ``site.getsitepackages`` lists each prefix itself alongside its ``Lib\\site-packages``.
    A prefix holds far more than packages, so counting it would treat a project kept inside a Python
    install, such as a portable or embedded one, as installed. The prefixes are left out.
    """
    prefixes = (sys.base_prefix, sys.base_exec_prefix)
    paths = (
        sysconfig.get_path("purelib"),
        sysconfig.get_path("platlib"),
        *site.getsitepackages(prefixes),
        site.getusersitepackages(),
    )
    # Different spellings can name one directory, such as lib64 linked to lib, so duplicates are
    # dropped once each path is resolved.
    resolved_prefixes = {os.path.normcase(os.path.realpath(prefix)) for prefix in prefixes}
    resolved_paths = {os.path.normcase(os.path.realpath(path)): None for path in paths}
    return tuple(path for path in resolved_paths if path not in resolved_prefixes)


INSTALLED_PACKAGE_PATHS = get_installed_package_paths()


def is_installed_package_path(path):
    """Return whether a path is inside a directory packages are installed into."""
    path = os.path.normcase(os.path.realpath(path))
    return any(path == root or path.startswith(root + os.sep) for root in INSTALLED_PACKAGE_PATHS)


def is_installed_package_app(app_label):
    """Return whether the app ``app_label`` is installed as a package, so no command may write its migrations.

    It checks the app's migrations directory, which honors ``MIGRATION_MODULES``, against the directories that
    packages are installed into. An app without a migrations directory is checked by its own directory. A
    project cannot commit a migration written into a package, and a reinstall puts the package's own files back.
    """
    app_config = django_apps.get_app_config(app_label)
    return is_installed_package_path(get_migrations_path(app_config) or app_config.path)


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
