from typing import List
from typing import Optional

from django.conf import settings
from drf_spectacular.openapi import AutoSchema as SpectacularAutoSchema
from drf_spectacular.plumbing import ComponentRegistry
from drf_spectacular.plumbing import build_serializer_context
from drf_spectacular.utils import _SchemaType
from rest_framework.generics import GenericAPIView
from rest_framework.views import APIView


# These decorators and functions exist, so drf-spectacular can remain a
# dev package, but we can still decorate things for open api generation.
# But, if we can, we should do everything we can by using VuedaAutoSchema.


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


class VuedaAutoSchema(SpectacularAutoSchema):
    def _get_vueda_serializer(self):
        """
        Code taken from drf_spectacular/openapi.py _get_serializer, without the errors.
        """
        view = self.view
        context = build_serializer_context(view)
        try:
            if isinstance(view, GenericAPIView):
                # try to circumvent queryset issues with calling get_serializer. if view has NOT
                # overridden get_serializer, its safe to use get_serializer_class.
                if view.__class__.get_serializer == GenericAPIView.get_serializer:
                    return view.get_serializer_class()(context=context)
                return view.get_serializer(context=context)
            elif isinstance(view, APIView):
                # APIView does not implement the required interface, but be lenient and make
                # good guesses before giving up and emitting a warning.
                if callable(getattr(view, "get_serializer", None)):
                    return view.get_serializer(context=context)
                elif callable(getattr(view, "get_serializer_class", None)):
                    return view.get_serializer_class()(context=context)
                elif hasattr(view, "serializer_class"):
                    return view.serializer_class
        except Exception:
            return

    def get_operation(
        self, path: str, path_regex: str, path_prefix: str, method: str, registry: ComponentRegistry
    ) -> Optional[_SchemaType]:
        operation = super().get_operation(path, path_regex, path_prefix, method, registry)

        try:
            serializer = self._get_vueda_serializer()
        except Exception:
            pass
        else:
            if hasattr(serializer, "get_schema_operation_parameters"):
                operation["parameters"] = serializer.get_schema_operation_parameters(
                    operation["operationId"], operation.get("parameters", [])
                )

        return operation

    def _get_parameters(self) -> List[_SchemaType]:
        parameters = super()._get_parameters()

        # Sort all parameters alphabetically, except path parameters.
        parameters = sorted(parameters, key=lambda x: x["in"] if x["in"] == "path" else f"{x['in']}_{x['name']}")

        return parameters

    def _resolve_path_parameters(self, variables):
        """
        Add a description and example for each of the path parameters.
        """
        parameters = super()._resolve_path_parameters(variables)

        if self.path.startswith(r"/routes/vueda.info/") or self.path.startswith(r"/routes/vueda.workflow/"):
            for parameter in parameters:
                match (parameter["name"], parameter["in"]):
                    case ("app_label", "path"):
                        parameter["schema"]["example"] = "store"
                        parameter["description"] = "The name of the application the model is part of."

                    case ("model", "path"):
                        parameter["schema"]["example"] = "product"
                        parameter["description"] = "The name of the model class."

                    case ("field", "path"):
                        parameter["schema"]["example"] = "product_type"
                        if self.path.startswith(r"/routes/vueda.info/model_info_choices/"):
                            parameter["description"] = "The name of the serializer field."
                        elif self.path.startswith(r"/routes/vueda.info/model_info_filter_choices"):
                            parameter["description"] = "The name of the filterset field."

        return parameters

    def _get_pagination_parameters(self):
        """
        Add a description, example, and default for each of the pagination parameters.
        """
        parameters = super()._get_pagination_parameters()

        if self.path.startswith(r"/routes/vueda.info/") or self.path.startswith(r"/routes/vueda.workflow/"):
            for parameter in parameters:
                match parameter["name"]:
                    case settings.PAGE_QUERY_PARAM:
                        parameter["schema"]["default"] = 1
                        parameter["schema"]["example"] = 2
                        parameter["description"] = f'Page: {parameter["description"]}'

                    case settings.PAGE_SIZE_QUERY_PARAM:
                        parameter["schema"]["default"] = settings.MAX_PAGE_SIZE
                        parameter["schema"]["example"] = 50
                        parameter["description"] = f'Page Size: {parameter["description"]}'

        return parameters

    def _get_filter_parameters(self):
        """
        Add a description, example, and default for each of the filtering parameters.
        """
        parameters = super()._get_filter_parameters()

        if self.path.startswith(r"/routes/vueda.info/") or self.path.startswith(r"/routes/vueda.workflow/"):

            class MatchFilterParameters:
                SEARCH_PARAM = settings.REST_FRAMEWORK["SEARCH_PARAM"]
                ORDERING_PARAM = settings.REST_FRAMEWORK["ORDERING_PARAM"]

            for parameter in parameters:
                match parameter["name"]:
                    case MatchFilterParameters.SEARCH_PARAM:
                        parameter["schema"]["example"] = "Paint"
                        parameter["description"] = f'Search: {parameter["description"]}'

                    case MatchFilterParameters.ORDERING_PARAM:
                        parameter["schema"]["example"] = "-quantity"
                        parameter["description"] = f'Ordering: {parameter["description"]}'

        return parameters

    def _process_override_parameters(self, direction="request"):
        """
        Add a description and example for the custom workflow actions.
        """
        parameters = super()._process_override_parameters(direction=direction)

        if self.path.startswith(r"/routes/vueda.workflow/"):
            for parameter_key, parameter in parameters.items():
                match parameter_key:
                    case ("object_id", "path"):
                        parameter["schema"]["example"] = "1234"
                        parameter["description"] = "The pk of the object."

        return parameters
