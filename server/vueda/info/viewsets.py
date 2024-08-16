import collections
import operator

from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.db.models import F
from django.utils.functional import cached_property
from rest_framework import generics
from rest_framework import mixins
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter
from rest_framework.filters import SearchFilter
from rest_framework.utils.model_meta import get_field_info
from rest_framework.viewsets import GenericViewSet
from rest_framework.viewsets import ReadOnlyModelViewSet

from vueda.core.open_api import conditional_extend_schema_func
from vueda.core.open_api import conditional_extend_schema_view_decorator
from vueda.core.open_api import conditional_open_api_example
from vueda.core.open_api import conditional_open_api_parameter
from vueda.core.open_api import conditional_open_api_response
from vueda.core.open_api import conditional_open_api_types
from vueda.core.permissions import ObjectPermissions
from vueda.core.viewsets import FlexFieldsMixin
from vueda.info.registration import get_registered_content_types
from vueda.info.registration import get_registration
from vueda.info.serializers import ModelInfoChoicesSerializer
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
class ModelInfoViewSet(FlexFieldsMixin, ReadOnlyModelViewSet):
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


# Rest Framework tries to get the model off the queryset, so since we
# have a list instead of a queryset, we need to have the model on it.
class ChoicesQueryset(collections.abc.Sequence):
    """
    This is a list that stores the model on it.
    """

    def __init__(self, choices, model):
        self.choices = choices
        self.model = ContentType

    def __getitem__(self, index):
        return self.choices[index]

    def __len__(self):
        return len(self.choices)


class ModelInfoChoicesBaseViewSet(FlexFieldsMixin, mixins.ListModelMixin, GenericViewSet):
    object = None  # type: ContentType
    queryset = ContentType.objects.all()
    permission_classes = []
    serializer_class = ModelInfoChoicesSerializer

    def __init__(self, *args, **kwargs):
        self.choices_field = self.choices_serializer_instance = None
        self.choices_queryset_model = self.choices_permissions = None

        super().__init__(*args, **kwargs)

        # Remove search and ordering filter backends, since these won't work on choices at the moment.
        self.filter_backends = [
            backend for backend in self.filter_backends if not issubclass(backend, (SearchFilter, OrderingFilter))
        ]

    @cached_property
    def canonical(self):
        return get_registration(self.choices_serializer_instance.pk)

    def check_permissions(self, request):
        """
        For fields:
            If the choices are hard coded on a field, then we check 'read' on the current model.
            If the choices are a foreign key then we check 'read' on the current model and 'list'
            on the related model.

        For filters:
            If the choices are hard coded on the filter, then we check 'read' on the current model,
            because you may not be able to 'list' it.
            If the choices are a foreign key on the filter, then we check 'read' on the current model
            and 'list' on the related model.

        If choices_permissions is None:
            This happens when there is an issue which we need to raise as a validation error, so you
            don't get back a permission issue when the real issue is an incorrect field name.
        """
        if self.choices_permissions is not None:
            for permission in self.choices_permissions:
                if not request.user.has_perm(permission):
                    self.permission_denied(
                        request, message=getattr(permission, "message", None), code=getattr(permission, "code", None)
                    )

        super().check_permissions(request)


@conditional_extend_schema_view_decorator(
    list=conditional_extend_schema_func(
        operation_id="getFieldChoices",
        description="Get a list of the choices available for a models field.",
        parameters=[
            conditional_open_api_parameter(
                "app_label",
                conditional_open_api_types().STR,
                location="path",
                description="The first parameter in the path.",
            ),
            conditional_open_api_parameter(
                "model",
                conditional_open_api_types().STR,
                location="path",
                description="The second parameter in the path, containing the model name.",
            ),
            conditional_open_api_parameter(
                "field",
                conditional_open_api_types().STR,
                location="path",
                description="The third parameter in the path, containing the field name.",
            ),
        ],
        summary="List field choices",
    ),
)
class ModelInfoChoicesViewSet(ModelInfoChoicesBaseViewSet):
    """
    This viewset is for providing metadata about field and filtering choices to front-end clients. This is a read-only viewset.

    Effectively, this is a custom model viewset for content types.

    urls using this viewset should provide the app_label, model, and field as kwargs.
    ie: ```py
    path('model-info-choices/<str:app_label>/<str:model>/<str:field>/', ModelChoicesViewSet.as_view(), name='model-info-choices')
    ```
    """

    def dispatch(self, request, app_label, model, field, *args, **kwargs):
        self.choices_field = field
        self.choices_serializer_instance = generics.get_object_or_404(
            ContentType, app_label=app_label, model=model.replace("_", "")
        )

        serializer = self.canonical["serializer"]  # type: serializers.ModelSerializer

        field_info = get_field_info(serializer.Meta.model)

        # If we add field level permissions at some point, then we will want to check them here.
        if self.choices_field in field_info.fields_and_pk:
            model_class = serializer.Meta.model
            meta = model_class._meta
            self.choices_permissions = (f"{meta.app_label}.read_{meta.model_name}",)
            self.choices_queryset_model = model_class

        elif self.choices_field in field_info.relations:
            related_field_info = field_info.relations[self.choices_field]
            model_class = serializer.Meta.model
            meta = model_class._meta
            self.choices_permissions = (
                f"{meta.app_label}.read_{meta.model_name}",
                f"{related_field_info.related_model._meta.app_label}.list"
                f"_{related_field_info.related_model._meta.model_name}",
            )
            self.choices_queryset_model = related_field_info.related_model._meta.model

        else:
            # This field does not exist.  In order to get the appropriate
            #  invalid field message, we need to not blow up in check_permissions.
            self.choices_permissions = ()
            self.choices_must_raise = True

        return super().dispatch(request, *args, **kwargs)

    def get_queryset(self):
        """
        Returns a queryset if the field is a relation.
        Return a list if the field is not a relation.
        """
        serializer = self.canonical["serializer"]  # type: serializers.ModelSerializer

        fields = serializer().get_fields()

        if self.choices_field not in fields:
            valid_fieldnames = []
            for field_name, field in fields.items():
                if hasattr(field, "choices") and field.choices:
                    valid_fieldnames.append(field_name)
            if valid_fieldnames:
                raise ValidationError(
                    f"Invalid field '{self.choices_field}'. Valid fields with choices are {', '.join(valid_fieldnames)}."
                )
            else:
                raise ValidationError(
                    f"Invalid field '{self.choices_field}'. No choice fields found on {serializer.Meta.model._meta.label}."
                )

        elif not hasattr(fields[self.choices_field], "choices"):
            valid_fieldnames = []
            for field_name, field in fields.items():
                if hasattr(field, "choices") and field.choices:
                    valid_fieldnames.append(field_name)

            if valid_fieldnames:
                raise ValidationError(
                    f"Invalid field '{self.choices_field}'. Valid fields with choices are {', '.join(valid_fieldnames)}."
                )
            else:
                raise ValidationError(
                    f"Invalid field '{self.choices_field}'. No choice fields found on {serializer.Meta.model._meta.label}."
                )

        # If somehow we get here without raising, we must raise.
        if hasattr(self, "choices_must_raise"):
            raise ValidationError(f"Invalid field '{self.choices_field}'.")

        choices = []
        for value, label in sorted(fields[self.choices_field].choices.items(), key=lambda x: operator.itemgetter(1)(x)):
            choices.append(
                {
                    "label": label,
                    "value": str(value),  # Convert ints to strings.
                }
            )

        return ChoicesQueryset(choices, self.choices_queryset_model)


class FilterChoice:
    def __init__(self, value, label):
        self.label = label
        self.value = value


# Rest Framework tries to get the label and value off each choice.
# Since we don't have a queryset, we need a class for each choice.
class FilterChoicesQueryset(collections.abc.Sequence):
    """
    This is a list that stores the model on it.
    """

    def __init__(self, choices, model):
        self.choices = [FilterChoice(*choice) for choice in choices]

    def __getitem__(self, index):
        return self.choices[index]

    def __len__(self):
        return len(self.choices)


class ModelInfoFilterSetChoicesViewSet(ModelInfoChoicesBaseViewSet):
    @staticmethod
    def get_filter_mapping_with_field_name(filters):
        filter_mapping = {}
        for filtr in filters.values():
            filter_mapping[filtr.field_name] = filtr
        return filter_mapping

    def dispatch(self, request, app_label, model, field, *args, **kwargs):
        self.choices_field = field
        self.choices_serializer_instance = generics.get_object_or_404(
            ContentType, app_label=app_label, model=model.replace("_", "")
        )
        serializer = self.canonical["serializer"]  # type: serializers.ModelSerializer
        model_class = serializer.Meta.model
        meta = model_class._meta

        viewset = self.canonical["viewset"]
        filterset = viewset.filterset_class
        filters = filterset.get_filters()

        filter_mapping = self.get_filter_mapping_with_field_name(filters)
        if field not in filter_mapping:
            self.validation_error_message = f"Invalid filter {field}.  Valid filters are {', '.join(filter_mapping)}."
            return super().dispatch(request, *args, **kwargs)

        filtr = filter_mapping[field]

        self.queryset = None
        if hasattr(filtr, "queryset"):
            self.queryset = filtr.queryset
            related_model = filtr.queryset.model
            related_meta = related_model._meta

            self.choices_permissions = (
                f"{meta.app_label}.read_{meta.model_name}",
                f"{related_meta.app_label}.list_{related_meta.model_name}",
            )

            self.choices_queryset_model = related_model

        else:
            self.choices = filtr.field.widget._choices

            self.choices_permissions = (f"{meta.app_label}.read_{meta.model_name}",)

            self.choices_queryset_model = model_class

        return super().dispatch(request, *args, **kwargs)

    def get_queryset(self):
        """
        Returns a queryset if the field is a relation.
        Return a list if the field is not a relation.
        """
        # Need to raise this here, so the super dispatch can catch it and handle it correctly.
        if hasattr(self, "validation_error_message"):
            raise ValidationError(self.validation_error_message)

        if hasattr(self, "choices"):
            return FilterChoicesQueryset(self.choices, self.choices_queryset_model)

        return self.queryset.annotate(label=F("formatted_name"), value=F("id")).values_list(
            "label", "value", named=True
        )
