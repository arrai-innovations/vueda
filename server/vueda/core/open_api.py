from copy import deepcopy

from rest_framework import serializers

from vueda.info.registration import get_registered_content_types


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


class ModelBase:
    def _get_instance(self, serializer):
        content_types = get_registered_content_types()
        return serializer.Meta.model.objects.get(pk=tuple(content_types)[0])

    def _get_field_type(self, key, value):
        value_type = type(value)
        if value_type is str:
            return serializers.CharField(read_only=True)

        elif value_type is bool:
            return serializers.BooleanField(read_only=True)

        elif value_type in (list, tuple):
            sub_value = value[0]
            if type(sub_value) is dict:
                from drf_spectacular.utils import inline_serializer

                sub_value_fields = {}
                for value_key, value_value in sub_value.items():
                    sub_value_fields[value_key] = self._get_field_type(value_key, value_value)

                serializer = inline_serializer(key, fields=sub_value_fields)
                return serializer

            else:
                return serializers.ListField(child=self._get_field_type(key, sub_value))

    def _generate_fields(self, field_data):
        field_data = deepcopy(field_data)

        for key, value in field_data.items():
            field_data[key] = self._get_field_type(key, value)

        return field_data

    def get_serializer_function(self):
        return None

    def get_fields(self):
        model_info_serializer = self.parent.parent
        instance = self._get_instance(model_info_serializer)
        model_info_serializer.instance = instance
        func = self._get_serializer_function_name()
        model_func = getattr(model_info_serializer, func)
        data = model_func(instance)
        model_info_serializer.instance = None
        return self._generate_fields(data[0])


class ModelActions(ModelBase, serializers.Serializer):
    def _get_serializer_function_name(self):
        return "get_model_actions"


class ModelExpands(ModelBase, serializers.Serializer):
    def _get_serializer_function_name(self):
        return "get_model_expands"


class ModelFields(ModelBase, serializers.Serializer):
    def _get_serializer_function_name(self):
        return "get_model_fields"


class ModelFiltering(ModelBase, serializers.Serializer):
    def _get_serializer_function_name(self):
        return "get_model_filtering"


class ModelOrdering(ModelBase, serializers.Serializer):
    def _get_serializer_function_name(self):
        return "get_model_ordering"


class ModelPermissions(ModelBase, serializers.Serializer):
    def _get_serializer_function_name(self):
        return "get_model_permissions"
