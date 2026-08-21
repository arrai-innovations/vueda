"""Default Django settings factory for VUEDA applications."""

from __future__ import annotations


__all__ = (
    "EnvLike",
    "get_defaults",
    "get_production_defaults",
)

import logging
import os
from collections.abc import Callable
from typing import Any
from typing import Protocol
from typing import TypeVar

import django
from django.core.exceptions import ImproperlyConfigured
from django.db.backends.postgresql.psycopg_any import IsolationLevel


_T = TypeVar("_T")


class EnvLike(Protocol):  # pragma: no cover
    def __call__(self, key: str, default: Any = ...) -> Any: ...
    def bool(self, key: str, default: Any = ...) -> bool: ...
    def str(self, key: str, default: Any = ...) -> str: ...
    def int(self, key: str, default: Any = ...) -> int: ...
    def float(self, key: str, default: Any = ...) -> float: ...
    def decimal(self, key: str, default: Any = ...) -> Any: ...
    def dict(
        self,
        key: str,
        default: Any = ...,
        *,
        delimiter: str = ...,
        key_value_delimiter: str = ...,
        subcast_keys: Callable[[Any], Any] | None = ...,
        subcast_key: Callable[[Any], Any] | None = ...,
        subcast_values: Callable[[Any], Any] | None = ...,
    ) -> dict[Any, Any]: ...
    def tuple(
        self,
        key: str,
        default: Any = ...,
        *,
        delimiter: str = ...,
        subcast: Callable[[Any], Any] | None = ...,
    ) -> tuple[Any, ...]: ...
    def json(self, key: str, default: Any = ...) -> Any: ...
    def datetime(self, key: str, default: Any = ...) -> Any: ...
    def date(self, key: str, default: Any = ...) -> Any: ...
    def time(self, key: str, default: Any = ...) -> Any: ...
    def timedelta(self, key: str, default: Any = ...) -> Any: ...
    def path(self, key: str, default: Any = ...) -> Any: ...
    def url(self, key: str, default: Any = ...) -> Any: ...
    def uuid(self, key: str, default: Any = ...) -> Any: ...
    def log_level(self, key: str, default: Any = ...) -> int: ...
    def enum(
        self,
        key: str,
        enum_cls: type[_T],
        default: Any = ...,
        *,
        by_value: bool = ...,
        case_sensitive: bool = ...,
    ) -> _T: ...
    def list(
        self,
        key: str,
        default: Any = ...,
        *,
        delimiter: str = ...,
        subcast: Callable[[Any], Any] | None = ...,
    ) -> list[Any]: ...
    def dj_db_url(self, key: str, default: Any = ..., **kwargs: Any) -> dict[str, Any]: ...
    def dj_email_url(self, key: str, default: Any = ..., **kwargs: Any) -> dict[str, Any]: ...
    def dj_cache_url(self, key: str, default: Any = ..., **kwargs: Any) -> dict[str, Any]: ...


def get_defaults(env: EnvLike, *, use_mailers: bool = False):
    """
    Get a sane and consistent set of default django settings, dotenv lookup keys & defaults and return them as a dict.

    You can put this in your settings modules like so:

    ```python
    # Environs-style adapter:
    # from environs import Env
    # env = Env()
    # env.read_env(str(ROOT_DIR / ".env.local"))
    # env.read_env(str(ROOT_DIR / ".env"))

    # TOML adapter:
    from vueda.core.config import TomlEnv, load_toml
    from vueda.core.default_settings import get_defaults
    env = TomlEnv({**load_toml(ROOT_DIR / "config.toml"), **load_toml(ROOT_DIR / "config.local.toml")})

    locals().update(get_defaults(env))
    ```

    `env` is an env-like adapter providing `__call__`, `bool`, `int`, `float`, `list`, and `dj_db_url`,
    among others.

    Email is configured through Django's deprecated `EMAIL_BACKEND` and `EMAIL_TIMEOUT` settings by
    default, since `EMAIL_BACKEND` still works on Django 6.1 and `MAILERS` doesn't exist before it. Pass
    `use_mailers=True` to configure Django 6.1+'s `MAILERS` setting instead; see the
    [MAILERS migration guide](https://docs.djangoproject.com/en/6.1/howto/mailers-migration/). `use_mailers=True`
    raises `ImproperlyConfigured` on Django < 6.1, since those versions ignore `MAILERS` and would otherwise
    silently fall back to Django's default SMTP backend instead of the configured one.
    """
    if use_mailers and django.VERSION < (6, 1):
        raise ImproperlyConfigured(
            f"get_defaults(use_mailers=True) requires Django 6.1+; Django {django.get_version()} ignores "
            "MAILERS and would silently use the default SMTP EmailBackend instead of the configured one. "
            "Pass use_mailers=False (the default) on this Django version to configure EMAIL_BACKEND instead."
        )
    email_backend = env("EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend")
    # most envs will not have defaults, so we force them to be set
    return_dict = {
        "CELERY_BROKER_URL": env("CELERY_BROKER_URL", default=""),
        "TWILIO_ACCOUNT_SID": env("TWILIO_ACCOUNT_SID", default=""),
        "TWILIO_CALLER_ID": env("TWILIO_CALLER_ID", default=""),
        "TWILIO_AUTH_TOKEN": env("TWILIO_AUTH_TOKEN", default=""),
        "DEBUG": env.bool("DEBUG", default=False),
        "SECRET_KEY": env("SECRET_KEY"),  # important to not have a default
        "LOGGING": {
            "version": 1,
            "disable_existing_loggers": False,
            "filters": {
                "ignore_validation_warnings": {
                    "()": "vueda.core.logging_filters.FilterOutVuedaValidationWarnings",
                }
            },
            "formatters": {
                "verbose": {
                    "format": "%(levelname)s %(asctime)s %(module)s %(process)d %(thread)d %(message)s",
                },
                "simple_verbose": {
                    "format": "%(levelname)s %(module)s %(thread)d %(message)s",
                },
                "simple": {"format": "%(levelname)s %(message)s"},
            },
            "handlers": {
                "console": {
                    "level": "INFO",
                    "class": "logging.StreamHandler",
                    "formatter": "simple",
                },
                "file": {
                    "level": "INFO",
                    "class": "logging.handlers.RotatingFileHandler",
                    "filename": os.path.join(env("LOGS_FOLDER", default="."), "django.log"),
                    "maxBytes": 1024 * 1024 * 100,  # 100 MB
                    "backupCount": 5,
                    "formatter": "verbose",
                    "filters": ["ignore_validation_warnings"],
                    "delay": True,
                },
            },
            "root": {
                "level": "INFO",
                "handlers": ["console"],
            },
        },
        "PASSWORD_HASHERS": [
            "django.contrib.auth.hashers.ScryptPasswordHasher",
        ],
        "FRONTEND_DOMAIN": env("FRONTEND_DOMAIN"),
        "FRONTEND_LOGIN_URL": env("FRONTEND_LOGIN_URL"),
        "FRONTEND_RESET_URL": env("FRONTEND_RESET_URL", "/reset-password"),
        "SITE_ID": env.int("SITE_ID", default=1),
        "LANGUAGE_CODE": env("LANGUAGE_CODE", default="en-us"),
        "TIME_ZONE": env("TIME_ZONE"),  # like "UTC" or "America/Edmonton"
        "USE_I18N": True,
        "USE_TZ": True,
        "ALLOWED_HOSTS": env.list("ALLOWED_HOSTS"),  # like "host", not "host:port" or "http(s)://host"
        "DATABASES": {"default": env.dj_db_url("DATABASE_URL")},  # like "postgres://user:password@host:5432/dbname"
        "EMAIL_SUBJECT_PREFIX": env("EMAIL_SUBJECT_PREFIX", default=""),
        "SESSION_ENGINE": "django.contrib.sessions.backends.cache",
        "SESSION_COOKIE_HTTPONLY": True,
        "SESSION_COOKIE_SECURE": True,
        "SESSION_COOKIE_SAMESITE": "Strict",
        "SECURE_CONTENT_TYPE_NOSNIFF": env.bool("SECURE_CONTENT_TYPE_NOSNIFF", default=True),
        "SECURE_CROSS_ORIGIN_OPENER_POLICY": env("SECURE_CROSS_ORIGIN_OPENER_POLICY", default="same-origin") or None,
        "SECURE_HSTS_SECONDS": env.int("SECURE_HSTS_SECONDS", default=31536000),  # 1 year
        "SECURE_PROXY_SSL_HEADER": ("HTTP_X_FORWARDED_PROTO", "https"),
        "SECURE_REFERRER_POLICY": env("SECURE_REFERRER_POLICY", default="same-origin") or None,
        "SITE_NAME": env("SITE_NAME"),
        "SUPPORT_EMAIL": env("SUPPORT_EMAIL"),
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
            "allauth.account.auth_backends.AuthenticationBackend",
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
            "allauth.account.middleware.AccountMiddleware",
        ],
        "DJANGO_APPS": env.list(  # some env loaders don't do multiline lists, and the values here would be unwieldy
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
                "vueda.vdq",
                "vueda.release",
            ],
        ),
        "VUEDA_USER_ADAPTER": env("VUEDA_USER_ADAPTER", default="vueda.user.adapters.DefaultUserAdapter"),
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
                "phonenumber_field",
                "anymail",
                "allauth",
                "allauth.account",
                "allauth.headless",
                "allauth.mfa",
            ],
        ),
        "LOCAL_APPS": env.list("LOCAL_APPS", default=[]),
        "MFA_ALLOW_UNVERIFIED_EMAIL": True,
        "HEADLESS_ONLY": True,
        "HEADLESS_ADAPTER": env("ALLAUTH_HEADLESS_ADAPTER", default="vueda.user.adapters.VuedaAllAuthHeadlessAdapter"),
        "ACCOUNT_ADAPTER": env("ALLAUTH_ACCOUNT_ADAPTER", default="vueda.user.adapters.VuedaAllAuthAccountAdapter"),
        "MFA_ADAPTER": env("ALLAUTH_MFA_ADAPTER", default="vueda.user.adapters.VuedaAllAuthMFAAdapter"),
        "HEADLESS_CLIENTS": ("browser",),
        "ACCOUNT_USER_MODEL_USERNAME_FIELD": None,
        "ACCOUNT_REAUTHENTICATION_TIMEOUT": env("ACCOUNT_REAUTHENTICATION_TIMEOUT", default=300),
        "ACCOUNT_EMAIL_VERIFICATION": "none",
        "ACCOUNT_LOGIN_METHODS": {"email"},
        "ACCOUNT_SIGNUP_FIELDS": ["email*", "password1*", "password2*"],
        "MFA_TOTP_TOLERANCE": 5,
        "REST_FRAMEWORK": {
            "DEFAULT_THROTTLE_RATES": {
                "forgot_password": "20/hour",
                "anon": "1000/day",
                "user": "10000/day",
                "dj_rest_auth": "10000/day",
            },
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
                "rest_framework.filters.OrderingFilter",
                # VuedaSearchFilterBackend needs to be after OrderingFilter, or ranked results will get reordered.
                "vueda.core.filters.VuedaSearchFilterBackend",
                "django_filters.rest_framework.DjangoFilterBackend",
            ),
            "DEFAULT_PERMISSION_CLASSES": ["vueda.core.permissions.ObjectPermissions"],
            "UPLOADED_FILES_USE_URL": True,
            "EXCEPTION_HANDLER": "vueda.core.exceptions.debug_stack_exception_handler",
            "ORDERING_PARAM": "o",
        },
        "REST_AUTH": {
            "LOGIN_SERIALIZER": "vueda.user.serializers.LoginSerializer",
            "USER_DETAILS_SERIALIZER": "vueda.user.serializers.WhoIsSerializer",
            "TOKEN_MODEL": None,
            "TOKEN_SERIALIZER": "vueda.user.serializers.VuedaTokenSerializer",
            "OLD_PASSWORD_FIELD_ENABLED": True,
        },
        "REST_FLEX_FIELDS": {
            "EXPAND_PARAM": "e",
            "FIELDS_PARAM": "f",
            "OMIT_PARAM": "om",
            "MAXIMUM_EXPANSION_DEPTH": 4,
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
                "dry-run",
                "acknowledge-warnings",
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
            "PACKAGE_MANAGER": env("PACKAGE_MANAGER", default="auto"),  # auto, uv, pipenv
        },
    }
    if use_mailers:
        return_dict["MAILERS"] = {"default": {"BACKEND": email_backend, "OPTIONS": {"timeout": 5}}}
    else:
        return_dict["EMAIL_BACKEND"] = email_backend
        return_dict["EMAIL_TIMEOUT"] = 5
    if email_backend == "anymail.backends.mailgun.EmailBackend":
        return_dict.update(
            {
                "ANYMAIL_MAILGUN_API_KEY": env("ANYMAIL_MAILGUN_API_KEY"),
                "ANYMAIL_MAILGUN_SENDER_DOMAIN": env("ANYMAIL_MAILGUN_SENDER_DOMAIN"),
                "ANYMAIL_MAILGUN_API_URL": env("ANYMAIL_MAILGUN_API_URL", default="https://api.mailgun.net/v3"),
                "ANYMAIL_MAILGUN_WEBHOOK_SIGNING_KEY": env("ANYMAIL_MAILGUN_WEBHOOK_SIGNING_KEY"),
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
            "TITLE": "VUEDA API",
            "DESCRIPTION": "VUEDA is designed for projects that integrate Vue.js frontends with Django REST Framework backends. This server library enhances Django's native authentication and permissions systems with default DRF classes and optimizes integration with django-filter, drf-flex-fields, and drf-writable-nested. It offers essential out-of-the-box functionalities such as custom workflow management, audit trails (with DRF support for django-simple-history), and row-level permissions. Additionally, vueda-server provides DRF classes to expose Django model details to the frontend, filtered by user permissions. It is built with customization in mind, offering most features as base classes that can be extended in your application, ensuring both control and adaptability.",
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


def get_production_defaults(env: EnvLike):
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
