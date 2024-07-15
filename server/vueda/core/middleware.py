import sentry_sdk
from asgi_cors_middleware import CorsASGIApp
from channels.auth import AuthMiddleware
from channels.middleware import BaseMiddleware
from channels.sessions import CookieMiddleware
from channels.sessions import SessionMiddleware


def update_sentry_user(user):
    if user is None:
        sentry_sdk.set_user(None)
    else:
        user_details = {"ip_address": "{{auto}}"}
        if user.pk:
            user_details["id"] = user.pk
            user_details["email"] = user.email
        sentry_sdk.set_user(user_details)


class SentryUserMiddleware(BaseMiddleware):
    """
    Lets Sentry know about the user.
    """

    async def __call__(self, scope, receive, send):
        user = scope["user"]
        update_sentry_user(user)
        try:
            return await super().__call__(scope, receive, send)
        finally:
            update_sentry_user(None)


# noinspection PyPep8Naming
def AsgiMiddlewareStack(inner):  # noqa: N802
    """
    AllowedHostsOriginValidator isn't here since it is websocket specific, the rest can be used on
     both http and websocket connections.
    """
    from django.conf import settings

    # modern sentry integrations patch the asgi handler, so we should not need to do it here

    return CorsASGIApp(
        CookieMiddleware(
            SessionMiddleware(
                AuthMiddleware(
                    SentryUserMiddleware(
                        # ...
                        inner
                    )
                )
            )
        ),
        # use django-cors-header's settings for asgi-cors-middleware
        origins=settings.CORS_ALLOWED_ORIGINS,
        allow_headers=settings.CORS_ALLOW_HEADERS,
        expose_headers=settings.CORS_EXPOSE_HEADERS,
        allow_methods=settings.CORS_ALLOW_METHODS,
        allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
        max_age=settings.CORS_PREFLIGHT_MAX_AGE,
    )
