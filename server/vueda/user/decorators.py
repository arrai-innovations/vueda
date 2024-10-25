from functools import wraps

from django.conf import settings
from django.middleware.csrf import get_token


def ensure_csrf_token(view_or_class):
    """
    Wraps a view function or class-based view to ensure a CSRF token is set on the request object
     if the user is authenticated.
    """

    def _add_csrf_token(request):
        if (
            "django.middleware.csrf.CsrfViewMiddleware" in settings.MIDDLEWARE
            and request.method == "GET"
            and request.user.is_authenticated
        ):
            get_token(request)

    if isinstance(view_or_class, type):
        original_dispatch = view_or_class.dispatch

        @wraps(original_dispatch)
        def new_dispatch(self, request, *args, **kwargs):
            _add_csrf_token(request)
            return original_dispatch(self, request, *args, **kwargs)

        view_or_class.dispatch = new_dispatch
        return view_or_class

    @wraps(view_or_class)
    def wrapped_view(request, *args, **kwargs):
        _add_csrf_token(request)
        return view_or_class(request, *args, **kwargs)

    return wrapped_view
