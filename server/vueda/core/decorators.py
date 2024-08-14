from functools import wraps

from rest_framework.decorators import action as rf_action


def action(methods=None, detail=None, bulk=False, url_path=None, url_name=None, **kwargs):
    rf_decorator = rf_action(methods=methods, detail=detail, url_path=url_path, url_name=url_name, **kwargs)

    def decorator(func):
        @wraps(func)
        def wrapped_func(*args, **kwargs):
            return func(*args, **kwargs)

        wrapped_func = rf_decorator(wrapped_func)
        wrapped_func.bulk = bulk
        return wrapped_func

    return decorator
