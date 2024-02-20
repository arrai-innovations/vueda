from pathlib import Path

from environ import environ

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
    "tests.apps.TestsConfig",
]
AUTH_USER_MODEL = "tests.User"

IN_TESTS = True

DEFAULT_AUTO_FIELD = "django.db.models.AutoField"

ROOT_URLCONF = "tests.root_urls"

SECRET_KEY = "test_secret_key"
