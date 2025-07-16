# These settings are only used when we create a new tests db during testing, to run workflow
# management command (makeworkflowmigrations) created migrations.  They need a different
# database to run migrations against, so we can skip the run sql operations that we used to
# create the workflow migration.
# We can't import from settings, because we do not want to clean up the workflow migration
# files, because we are going to be testing them.  So, this is a copy of the settings we need.

import decimal
import os
from pathlib import Path

from environs import Env

from vueda.core.default_settings import get_defaults


ROOT_DIR = Path(__file__).resolve(strict=True).parent.parent
env = Env()

# OS environment variables > .env.local > .env
env.read_env(str(ROOT_DIR / ".env.local"))
env.read_env(str(ROOT_DIR / ".env"))


locals().update(get_defaults(env))

decimal.setcontext(decimal.Context(rounding=decimal.ROUND_HALF_UP))  # Sensible decimal rounding

DATABASES = {"default": env.dj_db_url("DATABASE_URL")}
DATABASES["default"]["ATOMIC_REQUESTS"] = True
TEST_POSTGRES_DB = env("TEST_POSTGRES_DB")

LOCAL_APPS = [
    "tests.apps.TestsConfig",
    "tests.store.apps.StoreConfig",
    "tests.workflow_added.apps.WorkflowAddedConfig",
    "tests.workflow_changed.apps.WorkflowChangedConfig",
    "tests.workflow_deleted.apps.WorkflowDeletedConfig",
    "tests.workflow_duplicates.apps.WorkflowDuplicatesConfig",
]

# noinspection PyUnresolvedReferences
INSTALLED_APPS = DJANGO_APPS + VUEDA_APPS + THIRD_PARTY_APPS + LOCAL_APPS  # noqa: F821

AUTH_USER_MODEL = "tests.User"
IN_TESTS = True
DEFAULT_AUTO_FIELD = "django.db.models.AutoField"
ROOT_URLCONF = "tests.root_urls"
SECRET_KEY = "test_secret_key"

# Since the added, changed, and deleted tests could be trying to
# run at the same time, we need a separate database for each.
DATABASES["default"]["TEST"] = {
    "NAME": "vueda_workflow_management_command_migration_testing_" + os.environ.get("workflow_test_type", ""),
}

# This needs to be imported after any customizations to the PERMISSION_NAMES_MAPPING, so
# all permission names can be mapped to the correct names before django starts using them.
from vueda.core import patch_django  # noqa F401
