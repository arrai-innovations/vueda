# These decorators and functions exist, so drf-spectacular can remain a
# dev package, but we can still decorate things for open api generation.


# Decorators
def conditional_extend_schema_decorator(*args, **kwargs):
    def wrapper(func):
        try:
            from drf_spectacular.utils import extend_schema

            imported = True
        except ImportError:
            imported = False

        if imported:
            return extend_schema(*args, **kwargs)(func)

        return func

    return wrapper


def conditional_extend_schema_field_decorator(*args, **kwargs):
    def wrapper(func):
        try:
            from drf_spectacular.utils import extend_schema_field

            imported = True
        except ImportError:
            imported = False

        if imported:
            return extend_schema_field(*args, **kwargs)(func)

        return func

    return wrapper


def conditional_extend_schema_serializer_decorator(*args, **kwargs):
    def wrapper(func):
        try:
            from drf_spectacular.utils import extend_schema_serializer

            imported = True
        except ImportError:
            imported = False

        if imported:
            return extend_schema_serializer(*args, **kwargs)(func)

        return func

    return wrapper


def conditional_extend_schema_view_decorator(*args, **kwargs):
    def wrapper(func):
        try:
            from drf_spectacular.utils import extend_schema_view

            imported = True
        except ImportError:
            imported = False

        if imported:
            return extend_schema_view(*args, **kwargs)(func)

        return func

    return wrapper


# Functions
def conditional_extend_schema_func(*args, **kwargs):
    try:
        from drf_spectacular.utils import extend_schema
    except ImportError:
        return

    return extend_schema(*args, **kwargs)


def conditional_extend_schema_field_func(*args, **kwargs):
    try:
        from drf_spectacular.utils import extend_schema_field
    except ImportError:
        return

    return extend_schema_field(*args, **kwargs)


def conditional_extend_schema_serializer_func(*args, **kwargs):
    try:
        from drf_spectacular.utils import extend_schema_serializer
    except ImportError:
        return

    return extend_schema_serializer(*args, **kwargs)


def conditional_extend_schema_view_func(*args, **kwargs):
    try:
        from drf_spectacular.utils import extend_schema_view
    except ImportError:
        return

    return extend_schema_view(*args, **kwargs)


def conditional_open_api_example(*args, **kwargs):
    try:
        from drf_spectacular.utils import OpenApiExample
    except ImportError:
        return

    return OpenApiExample(*args, **kwargs)


def conditional_open_api_parameter(*args, **kwargs):
    try:
        from drf_spectacular.utils import OpenApiParameter
    except ImportError:
        return

    return OpenApiParameter(*args, **kwargs)


def conditional_open_api_response(*args, **kwargs):
    try:
        from drf_spectacular.utils import OpenApiResponse
    except ImportError:
        return

    return OpenApiResponse(*args, **kwargs)


def conditional_open_api_request(*args, **kwargs):
    try:
        from drf_spectacular.utils import OpenApiRequest
    except ImportError:
        return

    return OpenApiRequest(*args, **kwargs)


def conditional_open_api_callback(*args, **kwargs):
    try:
        from drf_spectacular.utils import OpenApiCallback
    except ImportError:
        return

    return OpenApiCallback(*args, **kwargs)


def conditional_open_api_webhook(*args, **kwargs):
    try:
        from drf_spectacular.utils import OpenApiWebhook
    except ImportError:
        return

    return OpenApiWebhook(*args, **kwargs)


class AlwaysGetNone:
    def __getattribute__(self, name):
        return


def conditional_open_api_types():
    try:
        from drf_spectacular.utils import OpenApiTypes
    except ImportError:
        return AlwaysGetNone()

    return OpenApiTypes
