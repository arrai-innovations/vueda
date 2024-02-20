from environ import environ


env = environ.Env()
DATABASES = {"default": env.db("DATABASE_URL", default="postgres://vueda@/vueda")}
DATABASES["default"]["ATOMIC_REQUESTS"] = True

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.common.BrokenLinkEmailsMiddleware",
    "simple_history.middleware.HistoryRequestMiddleware",
]

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.sites",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.postgres",
    "rest_framework",
    "simple_history",
    "django_filters",
]

REST_FRAMEWORK = {
    "NON_FIELD_ERRORS_KEY": "non_field_errors",
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PAGINATION_CLASS": "vueda.core.pagination.VUEDAPageNumberPagination",
    "PAGE_SIZE": 100,
    "SEARCH_PARAM": "s",
    "DEFAULT_FILTER_BACKENDS": (
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
        "django_filters.rest_framework.DjangoFilterBackend",
    ),
    "UPLOADED_FILES_USE_URL": True,
    "EXCEPTION_HANDLER": "vueda.core.exceptions.debug_stack_exception_handler",
    "ORDERING_PARAM": "o",
}
REST_FLEX_FIELDS = {
    "EXPAND_PARAM": "e",
    "FIELDS_PARAM": "f",
    "OMIT_PARAM": "om",
}

TEST_POSTGRES_DB = env("TEST_POSTGRES_DB", default="dbname=postgres user=postgres")
MEDIA_ROOT = "/tmp/media"
PRIVATE_STORAGE_ROOT = "/tmp/media/secure"

# pagination class settings
MAX_PAGE_SIZE = 200
PAGE_SIZE_QUERY_PARAM = "ps"
PAGE_QUERY_PARAM = "p"
