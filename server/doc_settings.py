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
        "SUPPORT_EMAIL": "support@domain.invalid",
        "NO_REPLY_EMAIL": "no-reply@domain.invalid",
        "STATIC_ROOT": str(ROOT_DIR / "static"),
        "STATICFILES_DIRS": [],
        "AUTH_USER_MODEL": "doc_app.User",
        "DATABASE_URL": f"sqlite:///{ROOT_DIR / 'docs.sqlite3'}",
        "CACHE_URL": "locmem://",  # A docs build runs in one process and reaches no cache service.
        "DATABASE_BACKUP_DIR": str(ROOT_DIR / "tmp"),
        "ANYMAIL_MAILGUN_API_KEY": "docs",
        "ANYMAIL_MAILGUN_SENDER_DOMAIN": "domain.invalid",
        "ANYMAIL_MAILGUN_WEBHOOK_SIGNING_KEY": "docs",
        "ANYMAIL_WEBHOOK_SECRET": "docs",
        "SENTRY_DSN": "",
        "LOCAL_APPS": ["doc_app"],
    },
    prefer_env=False,
)

locals().update(get_defaults(env))

# Override the default URLConf for documentation builds.
ROOT_URLCONF = "doc_urls"

spectacular_settings = globals().get("SPECTACULAR_SETTINGS")
if spectacular_settings is not None:
    SPECTACULAR_SETTINGS = dict(spectacular_settings)
    SPECTACULAR_SETTINGS["PREPROCESSING_HOOKS"] = [
        hook
        for hook in SPECTACULAR_SETTINGS.get("PREPROCESSING_HOOKS", [])
        if hook != "vueda.core.spectacular_hooks.register_cart_with_model_info"
    ]
