import decimal
from pathlib import Path

# the package name is django-environ
# noinspection PyPackageRequirements
from environ import environ  # noqa

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
    "tests.store.apps.StoreConfig",
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
LOGIN_URL = "/routes/tests/login/"
SECURE_BROWSER_XSS_FILTER = True
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.contrib.auth.context_processors.auth",
                "django.template.context_processors.static",
                "django.template.context_processors.request",
            ],
            "debug": True,
            "string_if_invalid": "Invalid",
        },
    },
]
