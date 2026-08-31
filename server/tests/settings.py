import decimal
from copy import deepcopy
from pathlib import Path

from vueda.core.config import TomlEnv
from vueda.core.config import load_toml
from vueda.core.default_settings import get_defaults


ROOT_DIR = Path(__file__).resolve(strict=True).parent.parent


env = TomlEnv({**load_toml(ROOT_DIR / "config.toml"), **load_toml(ROOT_DIR / "config.local.toml")})


locals().update(get_defaults(env))

decimal.setcontext(decimal.Context(rounding=decimal.ROUND_HALF_UP))  # Sensible decimal rounding

DATABASES = {"default": env.dj_db_url("DATABASE_URL")}
DATABASES["default"]["ATOMIC_REQUESTS"] = True
TEST_POSTGRES_DB = env("TEST_POSTGRES_DB")

# Set up a second database connection, which is not atomic, so we can write logging
# through it when a test fails, so we can validate filtering logging messages.
DATABASES["db_logging"] = deepcopy(DATABASES["default"])
DATABASES["db_logging"]["ATOMIC_REQUESTS"] = False
DATABASES["db_logging"]["CONN_MAX_AGE"] = 0

LOCAL_APPS = [
    "tests.confirmation.apps.ConfirmationConfig",
    "tests.employee.apps.EmployeeConfig",
    "tests.erring.apps.ErringConfig",
    "tests.features.apps.FeaturesConfig",
    "tests.logging.apps.LoggingConfig",
    "tests.product.apps.ProductConfig",
    "tests.store.apps.StoreConfig",
    "tests.timesheet.apps.TimesheetConfig",
    "django_view_manager.utils",
]

MIGRATION_MODULES = {
    "no_migrations": None,
}

# noinspection PyUnresolvedReferences
INSTALLED_APPS = DJANGO_APPS + VUEDA_APPS + THIRD_PARTY_APPS + LOCAL_APPS  # noqa: F821

AUTH_USER_MODEL = "employee.User"
IN_TESTS = True
DEFAULT_AUTO_FIELD = "django.db.models.AutoField"
ROOT_URLCONF = "tests.root_urls"
SECRET_KEY = "test_secret_key"

# Settings needed to see the permissions and workflows views.
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "KEY_PREFIX": "vueda-",
        "LOCATION": "unique-snowflake",
    }
}
LOGIN_URL = "/routes/vueda.user/dev-login/"
SECURE_BROWSER_XSS_FILTER = True
SESSION_COOKIE_SECURE = False
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.contrib.auth.context_processors.auth",
                "django.template.context_processors.static",
                "django.template.context_processors.request",
                "django.contrib.messages.context_processors.messages",
            ],
            "debug": True,
            "string_if_invalid": "Invalid",
        },
    },
    {
        "BACKEND": "django.template.backends.jinja2.Jinja2",
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


# This needs to be imported after any customizations to the PERMISSION_NAMES_MAPPING, so
# all permission names can be mapped to the correct names before django starts using them.
from vueda.core import patch_django  # noqa F401
