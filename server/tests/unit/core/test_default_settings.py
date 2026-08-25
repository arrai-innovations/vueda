from pathlib import Path

import django
import pytest
from django.core.exceptions import ImproperlyConfigured

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
