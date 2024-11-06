import copy
from http.client import responses
from typing import List
from typing import Optional

from django.conf import settings
from django.db import models
from rest_framework import serializers
from rest_framework.generics import GenericAPIView
from rest_framework.views import APIView

from vueda.core.models import BaseModelMeta


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


OpenApiDocsGenerationObjectIdModel = None  # For flake8.


class VuedaBaseAutoSchema:
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

    def _resolve_path_parameters(self, variables):
        """
        Add a description and example for each of the path parameters.
        """
        # Workflow doesn't have an 'object_id' field, so use a model during api docs generation that has it.
        match self.path:
            case (
                "/routes/vueda.workflow/workflows/{app_label}/{model}/object-state/{object_id}/"
                | "/routes/vueda.workflow/workflows/{app_label}/{model}/object-transitions/{object_id}/"
                | "/routes/vueda.workflow/workflows/{app_label}/{model}/execute-transition/{object_id}/"
            ):
                self.view.queryset_model = OpenApiDocsGenerationObjectIdModel

        parameters = super()._resolve_path_parameters(variables)

        if self.path.startswith(r"/routes/vueda.info/") or self.path.startswith(r"/routes/vueda.workflow/"):
            for parameter in parameters:
                match (parameter["name"], parameter["in"]):
                    case ("app_label", "path"):
                        parameter["schema"]["example"] = "store"
                        parameter["schema"]["maxLength"] = 100
                        parameter["schema"]["pattern"] = "^[a-zA-Z0-9_]+$"
                        parameter["schema"]["title"] = "django app name"

                    case ("model", "path"):
                        parameter["schema"]["example"] = "product"
                        parameter["schema"]["maxLength"] = 100
                        parameter["schema"]["pattern"] = "^[a-zA-Z0-9_]+$"
                        parameter["schema"]["title"] = "model class name"

                    case ("field", "path"):
                        parameter["schema"]["example"] = "product_type"
                        if "model_info_choices" in self.path:
                            parameter["schema"]["title"] = "serializer field name"
                        elif "model_info_filter_choices" in self.path:
                            parameter["schema"]["title"] = "filterset field name"

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
                        parameter["schema"]["title"] = "page"

                    case settings.PAGE_SIZE_QUERY_PARAM:
                        parameter["schema"]["default"] = settings.MAX_PAGE_SIZE
                        parameter["schema"]["example"] = 50
                        parameter["schema"]["title"] = "page size"

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
                        parameter["schema"]["title"] = "search term"

                    case MatchFilterParameters.ORDERING_PARAM:
                        parameter["schema"]["example"] = "-quantity"
                        parameter["schema"]["title"] = "ordering"

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
                        parameter["schema"]["title"] = "object pk"
                        parameter["schema"]["type"] = "string"

        return parameters

    def _get_request_body(self, direction="request"):
        body = super()._get_request_body(direction)

        # Body can be None, so we need to make it an empty dictionary, so you can make changes to it.
        if body is None:
            body = {
                "content": {
                    "application/json": {},
                }
            }

        request_serializer = self.get_request_serializer()

        # There is a lot of testing if is_serializer() in drf_spectacular.
        # So, make sure this is a serializer, before assuming we can customize the request.
        if isinstance(request_serializer, serializers.BaseSerializer) and hasattr(
            request_serializer, "customize_schema_request_data"
        ):
            request_serializer.customize_schema_request_data(body)

        # If the body is an empty dictionary after customization, then return None, like body would have been.
        if not body:
            return None

        return body

    def _get_response_bodies(self, direction="response"):
        bodies = super()._get_response_bodies(direction)

        response_serializer = self.get_response_serializers()  # This returns a single serializer.

        # There is a lot of testing if is_serializer() in drf_spectacular.
        # So, make sure this is a serializer, before assuming we can customize the response.
        if isinstance(response_serializer, serializers.BaseSerializer) and hasattr(
            response_serializer, "customize_schema_response_data"
        ):
            response_serializer.customize_schema_response_data(self, bodies)

        # For consistency, add the status code description (from http.client.responses) on all responses.
        for status_code, body in bodies.items():
            body["description"] = responses[int(status_code)]

        return bodies


try:
    from drf_spectacular.openapi import AutoSchema as SpectacularAutoSchema
    from drf_spectacular.plumbing import ComponentRegistry
    from drf_spectacular.plumbing import ResolvedComponent
    from drf_spectacular.plumbing import build_serializer_context
    from drf_spectacular.utils import Direction
    from drf_spectacular.utils import _SchemaType
    from drf_spectacular.utils import _SerializerType

    from vueda.workflow.models import HasWorkflowModelMixin

except ImportError:
    pass
else:

    class OpenApiDocsGenerationObjectIdModel(HasWorkflowModelMixin):
        object_id = models.CharField()

        formatted_name = None

        class Meta(BaseModelMeta):
            managed = False
            verbose_name = "Object"

    class VuedaAutoSchema(VuedaBaseAutoSchema, SpectacularAutoSchema):
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

        def resolve_serializer(
            self, serializer: _SerializerType, direction: Direction, bypass_extensions=False
        ) -> ResolvedComponent:
            resolved_serializer = super().resolve_serializer(serializer, direction, bypass_extensions=bypass_extensions)

            # Make app_label and model consistent in all cases.  Some components display things differently than others.
            if getattr(resolved_serializer, "schema", None) and "properties" in resolved_serializer.schema:
                for name, prop in resolved_serializer.schema["properties"].items():
                    match name:
                        case "app_label":
                            prop["example"] = "store"
                            prop["maxLength"] = 100
                            prop["pattern"] = "^[a-zA-Z0-9_]+$"
                            prop["title"] = "django app name"

                        case "model":
                            prop["example"] = "product"
                            prop["maxLength"] = 100
                            prop["pattern"] = "^[a-zA-Z0-9_]+$"
                            prop["title"] = "model class name"

            return resolved_serializer


def get_components_by_ref(components, ref_strings):
    results = {}

    for ref_string in ref_strings:
        _, ref_type, ref_name = ref_string.rsplit("/", 2)

        for component in components.values():
            if component.type == ref_type and component.name == ref_name:
                results[ref_string] = copy.deepcopy(component.schema)

    return results


def recursive_replace_refs(data, refs_schema):
    for key, value in tuple(data.items()):
        if key == "$ref" and value in refs_schema:
            schema = refs_schema[value]
            data.update(schema)
            data.pop(key)

        if isinstance(value, dict):
            # Make sure we pass the non tupled data value, so it replaces in the data.
            recursive_replace_refs(data[key], refs_schema)


def replace_refs_with_schema(components, data, component_ref_strings):
    refs_schema = get_components_by_ref(components, component_ref_strings)

    for item in refs_schema.values():
        recursive_replace_refs(item, refs_schema)

    recursive_replace_refs(data, refs_schema)
