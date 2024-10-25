import decimal
from pathlib import Path

# the package name is django-environ
# noinspection PyPackageRequirements
from environ import environ  # noqa

from tests.utils import clean_migrations
from vueda.core.default_settings import get_defaults


ROOT_DIR = Path(__file__).resolve(strict=True).parent.parent
env = environ.Env()

# OS environment variables > .env.local > .env
env.read_env(str(ROOT_DIR / ".env.local"))
env.read_env(str(ROOT_DIR / ".env"))


locals().update(get_defaults(env))

decimal.setcontext(decimal.Context(rounding=decimal.ROUND_HALF_UP))  # Sensible decimal rounding

DATABASES = {"default": env.db("DATABASE_URL")}
DATABASES["default"]["ATOMIC_REQUESTS"] = True
TEST_POSTGRES_DB = env("TEST_POSTGRES_DB")

LOCAL_APPS = [
    "tests.apps.TestsConfig",
    "tests.erring.apps.ErringConfig",
    "tests.store.apps.StoreConfig",
    "tests.workflow_added.apps.WorkflowAddedConfig",
    "tests.workflow_changed.apps.WorkflowChangedConfig",
    "tests.workflow_deleted.apps.WorkflowDeletedConfig",
    "tests.workflow_multi.apps.WorkflowMultiConfig",
    "django_view_manager.utils",
]

# noinspection PyUnresolvedReferences
INSTALLED_APPS = DJANGO_APPS + VUEDA_APPS + THIRD_PARTY_APPS + LOCAL_APPS  # noqa: F405, F821

AUTH_USER_MODEL = "tests.User"
IN_TESTS = True
DEFAULT_AUTO_FIELD = "django.db.models.AutoField"
ROOT_URLCONF = "tests.root_urls"
SECRET_KEY = "test_secret_key"

# Settings needed to see the permissions and workflows views.
# Permissions have been removed from the view, since we don't have a way to login yet.
LOGIN_URL = "/routes/vueda.user/local-login/"
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


# Some tests create migrations.  This is an issue for local development, because if these
# migrations exist when you run tests, they will blow up, causing all the tests to fail.
# So, we need to clean them up before migrations are imported.  The only place I know of
# that runs before migrations are imported, is here.
clean_migrations()
