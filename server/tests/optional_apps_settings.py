"""Django settings for optional VUEDA app boundary subprocess tests."""

import os
from pathlib import Path

from vueda.core.config import TomlEnv
from vueda.core.config import load_toml
from vueda.core.default_settings import get_defaults


ROOT_DIR = Path(__file__).resolve(strict=True).parent.parent

INCLUDE_HISTORY = os.environ.get("VUEDA_INCLUDE_HISTORY", "true").lower() not in {"0", "false", "no", "off"}

VUEDA_APPS = [
    "vueda.core",
    "vueda.info",
    "vueda.user",
    "vueda.release",
]
if INCLUDE_HISTORY:
    VUEDA_APPS.append("vueda.history")

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
