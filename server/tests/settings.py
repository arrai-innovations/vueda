from pathlib import Path

from environ import environ  # noqa

from vueda.core.default_settings import *  # noqa


env = environ.Env()

ROOT_DIR = Path(__file__).resolve(strict=True).parent.parent

# OS environment variables > .env.local > .env
env.read_env(str(ROOT_DIR / ".env.local"))
env.read_env(str(ROOT_DIR / ".env"))

DATABASES = {"default": env.db("DATABASE_URL")}
DATABASES["default"]["ATOMIC_REQUESTS"] = True
TEST_POSTGRES_DB = env("TEST_POSTGRES_DB")

INSTALLED_APPS += [  # noqa: F405
    "django_extensions",
    "tests.apps.TestsConfig",
    "tests.store.apps.StoreConfig",
]
AUTH_USER_MODEL = "tests.User"

IN_TESTS = True

DEFAULT_AUTO_FIELD = "django.db.models.AutoField"

ROOT_URLCONF = "tests.root_urls"

SECRET_KEY = "test_secret_key"

# Settings needed to see the permissions and workflows views.
# Permissions have been removed from the view, since we don't have a way to login yet.
DEBUG = True
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=[])
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "KEY_PREFIX": "pacms-",
        "LOCATION": env("REDIS_URL"),
        "OPTIONS": {
            "pool_class": "redis.BlockingConnectionPool",
        },
    }
}
CSRF_COOKIE_HTTPONLY = True
LOGIN_URL = "/routes/tests/login/"
SECURE_BROWSER_XSS_FILTER = True
SESSION_ENGINE = "django.contrib.sessions.backends.cache"
SITE_ID = 1
STATIC_ROOT = env("STATIC_ROOT", default="")
STATIC_URL = "static/"
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
