from copy import deepcopy

from rest_framework import serializers

from vueda.info.registration import get_registered_content_types
from vueda.info.serializers import METHOD_MAPPING


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


def conditional_inline_serializer(*args, **kwargs):
    try:
        from drf_spectacular.utils import inline_serializer
    except ImportError:
        return

    return inline_serializer(*args, **kwargs)


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

    def alter_fields(self, fields):
        return fields

    def get_fields(self):
        model_info_serializer = self.parent.parent
        instance = self._get_instance(model_info_serializer)
        model_info_serializer.instance = instance
        func = self._get_serializer_function_name()
        model_func = getattr(model_info_serializer, func)
        data = model_func(instance)
        model_info_serializer.instance = None
        fields = self._generate_fields(data[0])
        self.alter_fields(fields)
        return fields


class ModelActions(ModelBase, serializers.Serializer):
    def _get_serializer_function_name(self):
        return "get_model_actions"

    def alter_fields(self, fields):
        # This field is defined in the function, so there is no dynamic way to know it is optional.
        fields["parameters"] = serializers.ListField(
            child=serializers.CharField(required=False),
            required=False,
            help_text="Additional parameters needed to call the action.",
        )

        # This field is not optional, but we want to add help text.
        help_text_list = ""
        for key, value in METHOD_MAPPING.items():
            match key:
                case "list":
                    help_text_list += f"<li>{value} -&gt; {key} - with detail = true</li>"
                case "retrieve":
                    help_text_list += f"<li>{value} -&gt; {key} - with detail = false</li>"
                case _:
                    help_text_list += f"<li>{value} -&gt; {key}</li>"

        fields["method_names"] = serializers.ListField(
            child=serializers.CharField(required=True),
            required=True,
            help_text=f"""Available methods are:
        <ul>
            {help_text_list}
        </ul>""",
        )
        return fields


class ModelExpands(ModelBase, serializers.Serializer):
    def _get_serializer_function_name(self):
        return "get_model_expands"

    # This field is defined in the function, so there is no dynamic way to know it is optional.
    def alter_fields(self, fields):
        fields["fields"] = serializers.ListField(
            child=serializers.CharField(required=False), required=False, help_text="An array of field names."
        )
        return fields


class ModelFields(ModelBase, serializers.Serializer):
    def _get_serializer_function_name(self):
        return "get_model_fields"

    # These fields are defined in the function, so there is no dynamic way to know they are optional.
    def alter_fields(self, fields):
        fields["choices"] = serializers.ListField(child=serializers.CharField(required=False), required=False)
        fields["decimal_places"] = serializers.IntegerField(required=False)
        fields["help_text"] = serializers.CharField(required=False)
        fields["max_digits"] = serializers.IntegerField(required=False)
        fields["max_length"] = serializers.IntegerField(required=False)
        fields["min_length"] = serializers.IntegerField(required=False)
        fields["max_value"] = serializers.IntegerField(required=False)
        fields["min_value"] = serializers.IntegerField(required=False)
        return fields


class ModelFiltering(ModelBase, serializers.Serializer):
    def _get_serializer_function_name(self):
        return "get_model_filtering"

    # These fields are defined in the function, so there is no dynamic way to know they are optional.
    def alter_fields(self, fields):
        fields["filters"].fields.update(
            {
                "label": serializers.CharField(required=False),
                "lookup_exprs": serializers.ListField(
                    child=serializers.CharField(read_only=False, required=False),
                    read_only=False,
                    required=False,
                    help_text='<a href="https://docs.djangoproject.com/en/5.0/ref/models/querysets/#field-lookups" target="_blank">The list of field-lookups in django docs.</a>',
                ),
                "required": serializers.BooleanField(required=False),
            }
        )
        return fields


class ModelOrdering(ModelBase, serializers.Serializer):
    def _get_serializer_function_name(self):
        return "get_model_ordering"

    # This field is not actually optional, but we want to add some help text.
    def alter_fields(self, fields):
        fields["type"] = serializers.CharField(
            required=True,
            help_text="""Available types are:
        <ul>
            <li>alpha</li>
            <li>boolean</li>
            <li>date</li>
            <li>datetime</li>
            <li>numeric</li>
            <li>time</li>
        </ul>""",
        )

        return fields


class ModelPermissions(ModelBase, serializers.Serializer):
    def _get_serializer_function_name(self):
        return "get_model_permissions"
