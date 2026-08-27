import sqlite3
from pathlib import Path

import django
import pytest
from django.core.exceptions import ImproperlyConfigured
from django.db.backends.postgresql.psycopg_any import IsolationLevel
from django.db.backends.sqlite3.base import DatabaseWrapper

from vueda.core.config import TomlEnv
from vueda.core.config import load_toml
from vueda.core.default_settings import get_defaults


ROOT_DIR = Path(__file__).resolve(strict=True).parent.parent.parent.parent


def _env(**environ_overrides):
    config = {**load_toml(ROOT_DIR / "config.toml"), **load_toml(ROOT_DIR / "config.local.toml")}
    return TomlEnv(config, environ=environ_overrides)


def test_email_backend_is_used_by_default():
    # use_mailers defaults to False, so the EMAIL_BACKEND/EMAIL_TIMEOUT configuration is
    # returned on every supported Django version, unlike the use_mailers=True tests below.
    defaults = get_defaults(_env())

    assert defaults["EMAIL_BACKEND"] == "django.core.mail.backends.console.EmailBackend"
    assert defaults["EMAIL_TIMEOUT"] == 5  # noqa PLR2004
    assert "MAILERS" not in defaults


def test_use_mailers_configures_mailers_or_rejects_by_django_version():
    # Django < 6.1 ignores MAILERS entirely, so get_defaults refuses to produce a config that
    # would silently fall back to the default SMTP backend instead of the one requested.
    if django.VERSION < (6, 1):
        with pytest.raises(ImproperlyConfigured, match="MAILERS"):
            get_defaults(_env(), use_mailers=True)
        return

    defaults = get_defaults(_env(), use_mailers=True)

    assert defaults["MAILERS"] == {
        "default": {
            "BACKEND": "django.core.mail.backends.console.EmailBackend",
            "OPTIONS": {"timeout": 5},
        }
    }
    assert "EMAIL_BACKEND" not in defaults
    assert "EMAIL_TIMEOUT" not in defaults


def test_use_mailers_respects_email_backend_override_or_rejects_by_django_version():
    env = _env(
        EMAIL_BACKEND="anymail.backends.mailgun.EmailBackend",
        ANYMAIL_MAILGUN_API_KEY="key",
        ANYMAIL_MAILGUN_SENDER_DOMAIN="domain.invalid",
        ANYMAIL_MAILGUN_WEBHOOK_SIGNING_KEY="signing-key",
    )

    if django.VERSION < (6, 1):
        with pytest.raises(ImproperlyConfigured, match="MAILERS"):
            get_defaults(env, use_mailers=True)
        return

    defaults = get_defaults(env, use_mailers=True)

    assert defaults["MAILERS"]["default"]["BACKEND"] == "anymail.backends.mailgun.EmailBackend"
    assert defaults["ANYMAIL_MAILGUN_API_KEY"] == "key"


def test_isolation_level_is_set_for_postgres():
    defaults = get_defaults(_env(DATABASE_URL="postgres://vueda@localhost:5432/vueda"))

    assert defaults["DATABASES"]["default"]["ENGINE"] == "django.db.backends.postgresql"
    assert defaults["DATABASES"]["default"]["OPTIONS"]["isolation_level"] == IsolationLevel.REPEATABLE_READ


def test_isolation_level_is_omitted_for_sqlite():
    # isolation_level is a psycopg enum; sqlite3.connect rejects it with
    # "isolation_level must be str or None", which broke every management command run against
    # the sqlite settings used for documentation builds.
    defaults = get_defaults(_env(DATABASE_URL="sqlite:///db.sqlite3"))

    assert defaults["DATABASES"]["default"]["ENGINE"] == "django.db.backends.sqlite3"
    assert "isolation_level" not in defaults["DATABASES"]["default"]["OPTIONS"]


def test_sqlite_connection_params_are_accepted_by_the_driver(tmp_path):
    defaults = get_defaults(_env(DATABASE_URL=f"sqlite:///{tmp_path / 'db.sqlite3'}"))

    connection = DatabaseWrapper({**defaults["DATABASES"]["default"], "TIME_ZONE": None})
    sqlite3.connect(**connection.get_connection_params()).close()
