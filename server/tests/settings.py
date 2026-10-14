import decimal
import hashlib
from copy import deepcopy
from pathlib import Path

from vueda.core.config import TomlEnv
from vueda.core.config import load_toml
from vueda.core.default_settings import get_defaults


ROOT_DIR = Path(__file__).resolve(strict=True).parent.parent


env = TomlEnv({**load_toml(ROOT_DIR / "config.toml"), **load_toml(ROOT_DIR / "config.local.toml")})


locals().update(get_defaults(env))

# MD5 is intentionally test-only. It exercises Django's password API without paying the production Scrypt cost.
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

decimal.setcontext(decimal.Context(rounding=decimal.ROUND_HALF_UP))  # Sensible decimal rounding

DATABASES = {"default": env.dj_db_url("DATABASE_URL")}
DATABASES["default"]["ATOMIC_REQUESTS"] = True
TEST_POSTGRES_DB = env("TEST_POSTGRES_DB")

# Give each checkout its own test database, so a run in one worktree cannot drop or truncate the
# database a run in another worktree is using. The suffix comes from this checkout's path, so it is
# stable between runs and needs no setup. Set VUEDA_TEST_DB_SUFFIX to choose the suffix yourself, or
# to an empty string to use the unsuffixed name.
#
# Keep the suffix short. `suffix_each_test` in `tests/conftest.py` clones this database once per test
# as `<name>_<40 hex digits>`, and PostgreSQL truncates database names at 63 characters. Six
# characters stays inside that limit for up to 100 xdist workers.
TEST_DB_SUFFIX = env("VUEDA_TEST_DB_SUFFIX", default=hashlib.sha1(str(ROOT_DIR).encode()).hexdigest()[:6])
TEST_DB_NAME = f"test_{DATABASES['default']['NAME']}"
if TEST_DB_SUFFIX:
    TEST_DB_NAME = f"{TEST_DB_NAME}_{TEST_DB_SUFFIX}"
DATABASES["default"]["TEST"] = {"NAME": TEST_DB_NAME}

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

# Tests authenticate with `force_authenticate` or `check_password`, never by verifying a slow hash.
# The project default (scrypt) costs ~150ms per call, which dominated setup in every test class
# that builds users. Override it here rather than in `vueda.core.default_settings`, which ships.
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

# CACHES comes from CACHE_URL in config.toml, through get_defaults.
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
from vueda.core import patch_django  # noqa: E402, F401
