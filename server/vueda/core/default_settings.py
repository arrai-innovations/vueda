import logging

from django.db.backends.postgresql.psycopg_any import IsolationLevel
from environ import Env


def get_defaults(env: Env):
    """
    Get a sane and consistent set of default django settings, dotenv lookup keys & defaults and return them as a dict.

    You can put this in your settings modules like so:

    ```python
    from environ import Env
    from vueda.core.default_settings import get_defaults
    env = Env
    env.read_env(str(ROOT_DIR / ".env.local"))
    env.read_env(str(ROOT_DIR / ".env"))

    locals().update(get_defaults(env))
    ```

    :param env:
    :return: dict of default settings
    """
    # most envs will not have defaults, so we force them to be set
    return_dict = {
        "DEBUG": env.bool("DEBUG", default=False),
        "SECRET_KEY": env("SECRET_KEY"),  # important to not have a default
        "PASSWORD_HASHERS": [
            "django.contrib.auth.hashers.ScryptPasswordHasher",
        ],
        "SITE_ID": env.int("SITE_ID", default=1),
        "LANGUAGE_CODE": env("LANGUAGE_CODE", default="en-us"),
        "TIME_ZONE": env("TIME_ZONE"),  # like "UTC" or "America/Edmonton"
        "USE_I18N": True,
        "USE_TZ": True,
        "ALLOWED_HOSTS": env.list("ALLOWED_HOSTS"),  # like "host", not "host:port" or "http(s)://host"
        "DATABASES": {"default": env.db("DATABASE_URL")},  # like "postgres://user:password@host:5432/dbname"
        "EMAIL_BACKEND": env("EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend"),
        "EMAIL_TIMEOUT": 5,
        "SESSION_ENGINE": "django.contrib.sessions.backends.cache",
        "SESSION_COOKIE_HTTPONLY": True,
        "SESSION_COOKIE_SECURE": True,
        "SESSION_COOKIE_SAMESITE": "Strict",
        "SECURE_CONTENT_TYPE_NOSNIFF": env.bool("SECURE_CONTENT_TYPE_NOSNIFF", default=True),
        "SECURE_CROSS_ORIGIN_OPENER_POLICY": env("SECURE_CROSS_ORIGIN_OPENER_POLICY", default="same-origin") or None,
        "SECURE_HSTS_SECONDS": env.int("SECURE_HSTS_SECONDS", default=31536000),  # 1 year
        "SECURE_PROXY_SSL_HEADER": ("HTTP_X_FORWARDED_PROTO", "https"),
        "SECURE_REFERRER_POLICY": env("SECURE_REFERRER_POLICY", default="same-origin") or None,
        "CSRF_COOKIE_HTTPONLY": False,  # csrf expects this value in post requests, so our client's js needs to be able to read it
        "CSRF_TRUSTED_ORIGINS": env.list("CSRF_TRUSTED_ORIGINS"),
        "CSRF_COOKIE_SECURE": True,
        "ROOT_URLCONF": "config.urls",
        "STATIC_ROOT": env("STATIC_ROOT"),
        "STATIC_URL": env("STATIC_URL", default="/static/"),
        "STATICFILES_DIRS": env.list("STATICFILES_DIRS"),
        "STATICFILES_FINDERS": [
            "django.contrib.staticfiles.finders.FileSystemFinder",
            "django.contrib.staticfiles.finders.AppDirectoriesFinder",
        ],
        "MEDIA_ROOT": env("MEDIA_ROOT", default="/tmp/media"),
        "MEDIA_URL": env("MEDIA_URL", default="/media/"),
        "DEFAULT_AUTO_FIELD": "django.db.models.AutoField",
        "AUTHENTICATION_BACKENDS": [
            "django.contrib.auth.backends.ModelBackend",
        ],
        "AUTH_USER_MODEL": env("AUTH_USER_MODEL"),
        "AUTH_PASSWORD_VALIDATORS": [
            {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
            {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
            {
                "NAME": "pwned_passwords_django.validators.PwnedPasswordsValidator",
                "OPTIONS": {
                    "error_message": "This password is compromised (view at pwnedpasswords.com).",
                    "help_message": "Please choose another password",
                },
            },
        ],
        # Convert permissions from key to value.  ie. 'view_object' looks in the db for 'read_object'.
        "PERMISSION_NAMES_MAPPING": {
            "add": "create",
            "change": "update",
            "view": "read",
        },
        "PASSWORD_RESET_TIMEOUT": 60 * 60 * 24,  # 1 day in seconds
        "MIDDLEWARE": [
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
        ],
        "DJANGO_APPS": env.list(  # django-environ doesn't do multiline lists, and the values here would be a bit unwieldy
            "DJANGO_APPS",
            default=[
                "django.contrib.auth",
                "django.contrib.contenttypes",
                "django.contrib.sessions",
                "django.contrib.sites",
                "django.contrib.messages",
                "django.contrib.staticfiles",
                "django.contrib.postgres",
            ],
        ),
        "VUEDA_APPS": env.list(
            "VUEDA_APPS",
            default=[
                "vueda.core",
                "vueda.history",
                "vueda.info",
                "vueda.user",
                "vueda.workflow",
            ],
        ),
        "THIRD_PARTY_APPS": env.list(
            "THIRD_PARTY_APPS",
            default=[
                "rest_framework",
                "corsheaders",
                "django_extensions",
                "private_storage",
                "simple_history",
                "django_filters",
                "generic_relations",
            ],
        ),
        "LOCAL_APPS": env.list("LOCAL_APPS", default=[]),
        "CACHES": {
            "default": {
                "BACKEND": "django.core.cache.backends.redis.RedisCache",
                "KEY_PREFIX": "vueda-",
                "LOCATION": env("REDIS_URL"),
                "OPTIONS": {
                    "pool_class": "redis.BlockingConnectionPool",
                },
            }
        },
        "REST_FRAMEWORK": {
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
                # "rest_framework.filters.SearchFilter",
                "vueda.core.filters.VuedaSearchFilterBackend",
                "rest_framework.filters.OrderingFilter",
                "django_filters.rest_framework.DjangoFilterBackend",
            ),
            "UPLOADED_FILES_USE_URL": True,
            "EXCEPTION_HANDLER": "vueda.core.exceptions.debug_stack_exception_handler",
            "ORDERING_PARAM": "o",
        },
        "REST_AUTH": {
            "LOGIN_SERIALIZER": "vueda.user.serializers.LoginSerializer",
            "USER_DETAILS_SERIALIZER": "vueda.user.serializers.WhoIsSerializer",
            "TOKEN_MODEL": None,
            "TOKEN_SERIALIZER": "vueda.user.serializers.VuedaTokenSerializer",
        },
        "REST_FLEX_FIELDS": {
            "EXPAND_PARAM": "e",
            "FIELDS_PARAM": "f",
            "OMIT_PARAM": "om",
        },
        "TEST_RUNNER": "django.test.runner.DiscoverRunner",
        "TEST_POSTGRES_DB": env("TEST_POSTGRES_DB", default="dbname=postgres user=postgres"),
        **{
            "PRIVATE_STORAGE_AUTH_FUNCTION": "private_storage.permissions.allow_authenticated",
            "PRIVATE_STORAGE_ROOT": "/tmp/media/secure",
        },
        **{  # our custom pagination settings
            "MAX_PAGE_SIZE": 200,
            "PAGE_SIZE_QUERY_PARAM": "ps",
            "PAGE_QUERY_PARAM": "p",
        },
        **{  # CORS settings, which we use for both django-cors-headers and asgi-cors-middleware
            "CORS_ALLOWED_ORIGINS": env.list("CORS_ALLOWED_ORIGINS"),
            "CORS_ALLOW_METHODS": [
                "DELETE",
                "GET",
                "OPTIONS",
                "PATCH",
                "POST",
                "PUT",
            ],
            "CORS_ALLOW_HEADERS": [
                "accept",
                "accept-encoding",
                "content-type",
                "user-agent",
                "x-csrftoken",
                "x-requested-with",
            ],
            "CORS_EXPOSE_HEADERS": [
                "content-disposition",
            ],
            "CORS_PREFLIGHT_MAX_AGE": 86400,  # 24 hours
            "CORS_ALLOW_CREDENTIALS": True,
        },
        **{  # django-simple-history settings
            "SIMPLE_HISTORY_FILEFIELD_TO_CHARFIELD": True,
        },
        **{  # our own settings regarding to `vueda update` cli.
            "DATABASE_BACKUP_DIR": env("DATABASE_BACKUP_DIR"),
        },
    }
    if return_dict["EMAIL_BACKEND"] == "anymail.backends.mailgun.EmailBackend":
        return_dict.update(
            {
                "MAILGUN_API_KEY": env("MAILGUN_API_KEY"),
                "MAILGUN_SENDER_DOMAIN": env("MAILGUN_SENDER_DOMAIN"),
                "MAILGUN_API_URL": env("MAILGUN_API_URL", default="https://api.mailgun.net/v3"),
                "MAILGUN_WEBHOOK_SIGNING_KEY": env("MAILGUN_WEBHOOK_SIGNING_KEY"),
                "WEBHOOK_SECRET": env("ANYMAIL_WEBHOOK_SECRET"),
            }
        )
    if return_dict["DEBUG"]:
        return_dict["CORS_PREFLIGHT_MAX_AGE"] = 600  # 10 minutes

    try:
        import drf_spectacular  # noqa F401
    except ImportError:
        pass
    else:
        return_dict["THIRD_PARTY_APPS"] += ["drf_spectacular"]
        return_dict["REST_FRAMEWORK"]["DEFAULT_SCHEMA_CLASS"] = "vueda.core.open_api.VuedaAutoSchema"
        return_dict["SPECTACULAR_SETTINGS"] = {
            "TITLE": "Vueda API",
            "DESCRIPTION": "Vueda is designed for projects that integrate Vue.js frontends with Django REST Framework backends. This server library enhances Django's native authentication and permissions systems with default DRF classes and optimizes integration with django-filter, drf-flex-fields, and drf-writable-nested. It offers essential out-of-the-box functionalities such as custom workflow management, audit trails (with DRF support for django-simple-history), and row-level permissions. Additionally, vueda-server provides DRF classes to expose Django model details to the frontend, filtered by user permissions. It is built with customization in mind, offering most features as base classes that can be extended in your application, ensuring both control and adaptability.",
            "VERSION": "1.0.0",
            "TAGS": [
                {
                    "name": "vueda.info",
                    "x-displayName": "Info",
                    "description": "This model is used to fetch information about models in the project.  It can return information about fields, permissions, actions, expands, filtering, and ordering.",
                },
                {
                    "name": "vueda.workflow",
                    "x-displayName": "Workflow",
                    "description": "This model is used to provide workflow for models in the project that need it.  It provides a way to get information about the workflow, states, transitions, and the state an object is in.  It also provides a way to execute a transition on an object.",
                },
                {
                    "name": "vueda.user",
                    "x-displayName": "User",
                    "description": "This model is used to provide a way to login, logout, and retrieve the logged in users details.",
                },
            ],
            "COMPONENT_SPLIT_PATCH": False,
            "SHOW_REQUEST_BODY": True,
            "SHOW_RESPONSE_BODY": True,
            "DEFAULT_MODEL_DEPTH": None,
            "SERVE_INCLUDE_SCHEMA": False,
            "PARSER_WHITELIST": ["rest_framework.parsers.JSONParser"],
            "PREPROCESSING_HOOKS": [
                "vueda.core.spectacular_hooks.preprocessing_hooks",
                "vueda.core.spectacular_hooks.register_cart_with_model_info",
            ],
            "POSTPROCESSING_HOOKS": [
                "drf_spectacular.hooks.postprocess_schema_enums",
                "vueda.core.spectacular_hooks.postprocess_schema_components",
            ],
            # We want to sort everying except the path parameters, so we do this manually in the VuedaAutoSchema.
            "SORT_OPERATION_PARAMETERS": False,
        }

    return_dict["DATABASES"]["default"]["ATOMIC_REQUESTS"] = True
    if "OPTIONS" not in return_dict["DATABASES"]["default"]:
        return_dict["DATABASES"]["default"]["OPTIONS"] = {}
    return_dict["DATABASES"]["default"]["OPTIONS"]["isolation_level"] = IsolationLevel.REPEATABLE_READ
    # non-zero has been known to cause issues with some databases with timeouts
    return_dict["DATABASES"]["default"]["CONN_MAX_AGE"] = 0
    return_dict["INSTALLED_APPS"] = (
        return_dict["DJANGO_APPS"]
        + return_dict["VUEDA_APPS"]
        + return_dict["THIRD_PARTY_APPS"]
        + return_dict["LOCAL_APPS"]
    )
    return return_dict


def get_production_defaults(env: Env):
    """
    Additional settings for production environments, causing env to require things that aren't required in development.
    """
    return {
        **{  # sentry settings
            "SENTRY_DSN": env("SENTRY_DSN"),  # like "https://{longhash}@{shorthash}.ingest.us.sentry.io/{someid}"
            "SENTRY_LOG_LEVEL": env.int("SENTRY_LOG_LEVEL", default=logging.INFO),
            "SENTRY_ENVIRONMENT": env("SENTRY_ENVIRONMENT", default="production"),
            "SENTRY_TRACES_SAMPLE_RATE": env.float("SENTRY_TRACES_SAMPLE_RATE", default=0.1),
        },
    }
