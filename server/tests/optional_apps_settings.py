"""Django settings for optional VUEDA app boundary subprocess tests."""

import os
from pathlib import Path

from vueda.core.config import TomlEnv
from vueda.core.config import load_toml
from vueda.core.default_settings import get_defaults


ROOT_DIR = Path(__file__).resolve(strict=True).parent.parent


def _env_flag(name, default="true"):
    return os.environ.get(name, default).lower() not in {"0", "false", "no", "off"}


INCLUDE_HISTORY = _env_flag("VUEDA_INCLUDE_HISTORY")
INCLUDE_WORKFLOW = _env_flag("VUEDA_INCLUDE_WORKFLOW", "false")

VUEDA_APPS = [
    "vueda.core",
    "vueda.info",
    "vueda.user",
    "vueda.release",
]
if INCLUDE_HISTORY:
    VUEDA_APPS.append("vueda.history")
if INCLUDE_WORKFLOW:
    VUEDA_APPS.append("vueda.workflow")

env = TomlEnv(
    {**load_toml(ROOT_DIR / "config.toml"), **load_toml(ROOT_DIR / "config.local.toml")},
    environ={
        **os.environ,
        "AUTH_USER_MODEL": "optional_apps.User",
        "DATABASE_URL": "sqlite:///:memory:",
        "VUEDA_APPS": ",".join(VUEDA_APPS),
    },
)

locals().update(get_defaults(env))

LOCAL_APPS = [
    "tests.optional_apps.apps.OptionalAppsConfig",
]
INSTALLED_APPS = DJANGO_APPS + VUEDA_APPS + THIRD_PARTY_APPS + LOCAL_APPS  # noqa F821

AUTH_USER_MODEL = "optional_apps.User"
DEFAULT_AUTO_FIELD = "django.db.models.AutoField"
IN_TESTS = True
ROOT_URLCONF = "tests.optional_apps_urls"
SECRET_KEY = "test_secret_key"

MIGRATION_MODULES = {
    "optional_apps": None,
}

from vueda.core import patch_django  # noqa F401 E402
