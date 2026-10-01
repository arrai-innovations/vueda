import pytest
from django.contrib.auth import get_user_model


@pytest.fixture
def frontend_settings(settings):
    settings.FRONTEND_DOMAIN = "https://app.domain.invalid"
    settings.FRONTEND_LOGIN_URL = "/sign-in"
    settings.FRONTEND_RESET_URL = "/reset-password"
    return settings


@pytest.mark.django_db
def test_generate_reset_url_starts_with_frontend_domain(frontend_settings):
    user = get_user_model().objects.create_user(email="reset-url@domain.invalid", name="Reset Url", password="testpass")

    url = user.generate_reset_url()

    assert url.startswith("https://app.domain.invalid/reset-password/")
    assert "?token=" in url


@pytest.mark.django_db
def test_send_welcome_email_links_frontend_domain(frontend_settings, monkeypatch):
    user = get_user_model().objects.create_user(email="welcome@domain.invalid", name="Welcome", password="testpass")
    sent = []
    monkeypatch.setattr(
        "vueda.user.adapters.DefaultUserAdapter.send_mail",
        lambda self, email, name, template, context: sent.append(context),
    )

    user.send_welcome_email()

    assert sent[0]["login_url"] == "https://app.domain.invalid/sign-in"
    assert sent[0]["reset_url"].startswith("https://app.domain.invalid/reset-password/")
