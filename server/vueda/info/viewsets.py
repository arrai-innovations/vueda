from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from rest_framework import generics
from rest_framework import mixins
from rest_framework.viewsets import GenericViewSet

from vueda.core.open_api import conditional_extend_schema_func
from vueda.core.open_api import conditional_extend_schema_view_decorator
from vueda.core.open_api import conditional_open_api_example
from vueda.core.open_api import conditional_open_api_parameter
from vueda.core.open_api import conditional_open_api_response
from vueda.core.permissions import ObjectPermissions
from vueda.core.viewsets import FlexFieldsMixin
from vueda.info.registration import get_registered_content_types
from vueda.info.serializers import ModelInfoExpandsSerializer
from vueda.info.serializers import ModelInfoSerializer
from vueda.info.serializers import OpenAPIModelInfoSerializer


@conditional_extend_schema_view_decorator(
    list=conditional_extend_schema_func(
        operation_id="getModels",
        description="Get a list of the models you can get model information for.",
        summary="List models",
    ),
    retrieve=conditional_extend_schema_func(
        operation_id="getModelInfo",
        description="Gets information about a model, which can be used to render an add/edit form or readonly view.",
        parameters=[
            conditional_open_api_parameter(
                settings.REST_FLEX_FIELDS["EXPAND_PARAM"],
                description="Specifies the expandable fields you want to receive data for.  Any or all can be used in a single request.",
                type={
                    "type": "array",
                    "items": {
                        "type": "string",
                        "format": "string",
                        "example": "model_fields",
                    },
                },
                examples=[
                    conditional_open_api_example(
                        name="GetModelInfoActionsExample",
                        summary="Return 'model_actions' in the results.",
                        value={
                            settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: [
                                "model_actions",
                            ]
                        },
                    ),
                    conditional_open_api_example(
                        name="GetModelInfoExpandsExample",
                        summary="Return 'model_expands' in the results.",
                        value={
                            settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: [
                                "model_expands",
                            ]
                        },
                    ),
                    conditional_open_api_example(
                        name="GetModelInfoFieldsExample",
                        summary="Return 'model_fields' in the results.",
                        value={
                            settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: [
                                "model_fields",
                            ]
                        },
                    ),
                    conditional_open_api_example(
                        name="GetModelInfoFilteringExample",
                        summary="Return 'model_filtering' in the results.",
                        value={
                            settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: [
                                "model_filtering",
                            ]
                        },
                    ),
                    conditional_open_api_example(
                        name="GetModelInfoOrderingExample",
                        summary="Return 'model_ordering' in the results.",
                        value={
                            settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: [
                                "model_ordering",
                            ]
                        },
                    ),
                    conditional_open_api_example(
                        name="GetModelInfoPermissionsExample",
                        summary="Return 'model_permissions' in the results.",
                        value={
                            settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: [
                                "model_permissions",
                            ]
                        },
                    ),
                ],
            ),
        ],
        request=OpenAPIModelInfoSerializer,
        responses={
            "200": conditional_open_api_response(
                response=OpenAPIModelInfoSerializer,
            )
        },
        summary="Get model info",
    ),
)
class ModelInfoViewSet(FlexFieldsMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, GenericViewSet):
    """
    This viewset is for providing metadata about models, including fields, actions, and permissions
    to front-end clients. This is a read-only viewset.

    You should be able to list all models, and get information about a specific model.

    Effectively, this is a custom model viewset for content types.

    urls using this viewset should provide the app_label and model as kwargs.
    ie: ```py
    path('model-info/<str:app_label>/<str:model>/', ModelInfoViewSet.as_view(), name='model-info')
    ```
    """

    object = None  # type: ContentType
    queryset = ContentType.objects.all()
    serializer_class = ModelInfoSerializer
    permission_classes = [ObjectPermissions]

    def get_queryset(self):
        return ContentType.objects.all().filter(pk__in=get_registered_content_types())

    def get_object(self):
        obj = generics.get_object_or_404(
            ContentType, app_label=self.kwargs["app_label"], model=self.kwargs["model"].replace("_", "")
        )
        self.check_object_permissions(self.request, obj)
        return obj

    def get_serializer_context(self):
        context = super().get_serializer_context()

        query = ModelInfoExpandsSerializer(data=self.request.query_params)
        if query.is_valid(raise_exception=True):
            self.query_data = query.validated_data
            context[settings.REST_FLEX_FIELDS["EXPAND_PARAM"]] = query.validated_data.get(
                settings.REST_FLEX_FIELDS["EXPAND_PARAM"]
            )
        return context
