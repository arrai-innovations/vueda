"""Minimal Django settings for documentation builds."""

from pathlib import Path

from vueda.core.config import TomlEnv
from vueda.core.default_settings import get_defaults


ROOT_DIR = Path(__file__).resolve().parent

env = TomlEnv(
    {
        "SECRET_KEY": "vueda-docs-secret",
        "ALLOWED_HOSTS": ["docs.local"],
        "CORS_ALLOWED_ORIGINS": ["http://docs.local"],
        "CSRF_TRUSTED_ORIGINS": ["http://docs.local"],
        "FRONTEND_DOMAIN": "docs.local",
        "FRONTEND_LOGIN_URL": "/login",
        "TIME_ZONE": "UTC",
        "SITE_NAME": "VUEDA",
        "SUPPORT_EMAIL": "support@example.com",
        "STATIC_ROOT": str(ROOT_DIR / "static"),
        "STATICFILES_DIRS": [],
        "AUTH_USER_MODEL": "doc_app.User",
        "DATABASE_URL": f"sqlite:///{ROOT_DIR / 'docs.sqlite3'}",
        "DATABASE_BACKUP_DIR": str(ROOT_DIR / "tmp"),
        "REDIS_URL": "redis://localhost:6379/0",
        "ANYMAIL_MAILGUN_API_KEY": "docs",
        "ANYMAIL_MAILGUN_SENDER_DOMAIN": "example.com",
        "ANYMAIL_MAILGUN_WEBHOOK_SIGNING_KEY": "docs",
        "ANYMAIL_WEBHOOK_SECRET": "docs",
        "SENTRY_DSN": "",
        "LOCAL_APPS": ["doc_app"],
    },
    prefer_env=False,
)

locals().update(get_defaults(env))
