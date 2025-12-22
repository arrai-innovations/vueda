from functools import wraps

from django.db import transaction
from rest_framework.decorators import action as rf_action
from rest_framework.permissions import SAFE_METHODS


DRY_RUN_HEADER = "Dry-Run"


def action(methods=None, detail=None, bulk=False, url_path=None, url_name=None, **kwargs):
    """
    Decorator that adds the ability to specify whether the action is a bulk action or not.
    """
    rf_decorator = rf_action(methods=methods, detail=detail, url_path=url_path, url_name=url_name, **kwargs)

    def decorator(func):
        @wraps(func)
        def wrapped_func(view_set_instance, request, *args, **kwargs):
            is_mutation_request = request.method not in SAFE_METHODS
            dry_run = request.headers.get(DRY_RUN_HEADER, "false").lower() == "true"

            if not is_mutation_request or not dry_run:
                request.dry_run = False
                return func(view_set_instance, request, *args, **kwargs)
            already_in_dry_run = getattr(request, "dry_run", False)
            request.dry_run = dry_run

            response = func(view_set_instance, request, *args, **kwargs)
            if not already_in_dry_run:
                transaction.set_rollback(True)

            return response

        wrapped_func = rf_decorator(wrapped_func)
        wrapped_func.bulk = bulk
        return wrapped_func

    return decorator
