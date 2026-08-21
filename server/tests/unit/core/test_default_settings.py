from pathlib import Path
from unittest import mock

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
    defaults = get_defaults(_env())

    assert defaults["EMAIL_BACKEND"] == "django.core.mail.backends.console.EmailBackend"
    assert defaults["EMAIL_TIMEOUT"] == 5  # noqa PLR2004
    assert "MAILERS" not in defaults


def test_use_mailers_configures_mailers_instead_of_email_backend():
    defaults = get_defaults(_env(), use_mailers=True)

    assert defaults["MAILERS"] == {
        "default": {
            "BACKEND": "django.core.mail.backends.console.EmailBackend",
            "OPTIONS": {"timeout": 5},
        }
    }
    assert "EMAIL_BACKEND" not in defaults
    assert "EMAIL_TIMEOUT" not in defaults


def test_use_mailers_respects_email_backend_override():
    env = _env(
        EMAIL_BACKEND="anymail.backends.mailgun.EmailBackend",
        ANYMAIL_MAILGUN_API_KEY="key",
        ANYMAIL_MAILGUN_SENDER_DOMAIN="domain.invalid",
        ANYMAIL_MAILGUN_WEBHOOK_SIGNING_KEY="signing-key",
    )

    defaults = get_defaults(env, use_mailers=True)

    assert defaults["MAILERS"]["default"]["BACKEND"] == "anymail.backends.mailgun.EmailBackend"
    assert defaults["ANYMAIL_MAILGUN_API_KEY"] == "key"


@pytest.mark.parametrize("version", [(6, 0, 8, "final", 0), (5, 2, 0, "final", 0)])
def test_use_mailers_rejected_before_django_6_1(version):
    with mock.patch.object(django, "VERSION", version), pytest.raises(ImproperlyConfigured, match="MAILERS"):
        get_defaults(_env(), use_mailers=True)
