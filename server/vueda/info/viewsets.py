import collections
import operator

from django.contrib.contenttypes.models import ContentType
from django.db.models import CharField
from django.db.models import F
from django.db.models.functions.comparison import Cast
from django.http import Http404
from django.utils.functional import cached_property
from rest_framework import generics
from rest_framework import mixins
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter
from rest_framework.filters import SearchFilter
from rest_framework.utils.model_meta import get_field_info
from rest_framework.viewsets import GenericViewSet
from rest_framework.viewsets import ReadOnlyModelViewSet

from vueda.core.permissions import ObjectPermissions
from vueda.core.viewsets import FlexFieldsMixin
from vueda.info.registration import get_registered_content_types
from vueda.info.registration import get_registration
from vueda.info.serializers import ModelInfoChoicesSerializer
from vueda.info.serializers import ModelInfoFilterSetChoicesSerializer
from vueda.info.serializers import ModelInfoSerializer


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

    def initial(self, request, *args, **kwargs):
        if "app_label" in self.kwargs and "model" in self.kwargs:
            content_types = ContentType.objects.all().filter(
                pk__in=get_registered_content_types(), app_label=self.kwargs["app_label"], model=self.kwargs["model"]
            )

            if not content_types.exists():
                raise Http404(f'Unable to find the content type "{self.kwargs["app_label"]}.{self.kwargs["model"]}".')

        return super().initial(request, *args, **kwargs)

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
        return get_registration(self.content_type_instance.pk)

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

    def dispatch(self, request, app_label, model, field, *args, **kwargs):
        self.choices_app_label = app_label
        self.choices_model = model
        self.choices_field = field

        results = super().dispatch(request, *args, **kwargs)

        if results.status_code != 200:
            return results

        return super().dispatch(request, *args, **kwargs)

    def initial(self, request, *args, **kwargs):
        content_types = ContentType.objects.all().filter(
            pk__in=get_registered_content_types(), app_label=self.choices_app_label, model=self.choices_model
        )

        if not content_types.exists():
            raise Http404(f'Unable to find the content type "{self.choices_app_label}.{self.choices_model}".')

        return super().initial(request, *args, **kwargs)

    def get_formatted_name_lookup_expression(self, queryset):
        formatted_name = getattr(queryset.model, "formatted_name_lookup_expression", None)

        if isinstance(formatted_name, str):
            return formatted_name

        return "formatted_name"

    def get_content_type_instance(self):
        content_types = ContentType.objects.all().filter(
            pk__in=get_registered_content_types(), app_label=self.choices_app_label, model=self.choices_model
        )
        self.content_type_instance = content_type_instance = content_types.first()

        # If we don't find the content type you are looking for, return the empty queryset.
        if content_type_instance is None:
            return content_types


class ModelInfoChoicesViewSet(ModelInfoChoicesBaseViewSet):
    """
    This viewset is for providing metadata about field choices to front-end clients. This is a read-only viewset.

    Effectively, this is a custom model viewset for content types.
    """

    serializer_class = ModelInfoChoicesSerializer

    def validate_queryset(self, serializer, fields):
        if self.choices_field not in fields:
            valid_fieldnames = []
            for field_name, field in fields.items():
                if hasattr(field, "choices") and field.choices:
                    valid_fieldnames.append(field_name)
            if valid_fieldnames:
                raise ValidationError(
                    f"Invalid field '{self.choices_field}'. Valid fields with choices are {', '.join(sorted(valid_fieldnames))}."
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
                    f"Invalid field '{self.choices_field}'. Valid fields with choices are {', '.join(sorted(valid_fieldnames))}."
                )
            else:
                raise ValidationError(
                    f"Invalid field '{self.choices_field}'. No choice fields found on {serializer.Meta.model._meta.label}."
                )

    def get_queryset(self):
        """
        Returns a queryset if the field is a relation.
        Return a list if the field is not a relation.
        """
        content_types = self.get_content_type_instance()
        if self.content_type_instance is None:
            return content_types

        serializer = self.canonical["serializer"]  # type: serializers.ModelSerializer
        fields = serializer().get_fields()

        self.validate_queryset(serializer, fields)

        field = fields[self.choices_field]
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

        if hasattr(field, "child_relation"):
            queryset = field.child_relation.queryset
            if hasattr(queryset.model, "get_formatted_name"):
                choices = []
                for instance in queryset.filter(pk__in=field.choices.keys()):
                    choices.append(
                        {
                            "label": instance.get_formatted_name(),
                            "value": str(instance.pk),
                        }
                    )

            else:
                formatted_name_lookup_expression = self.get_formatted_name_lookup_expression(queryset)

                choices = (
                    queryset.filter(pk__in=field.choices.keys())
                    .annotate(label=F(formatted_name_lookup_expression), value=Cast(F("pk"), output_field=CharField()))
                    .order_by("label")
                    .values("label", "value")
                )

        elif hasattr(field, "queryset"):
            queryset = field.queryset
            if hasattr(field, "slug_field"):
                choices = []
                for key in field.choices.keys():
                    choices.append(
                        {
                            "label": key,
                            "value": key,
                        }
                    )

            else:
                if hasattr(queryset.model, "get_formatted_name"):
                    choices = []
                    for instance in queryset.filter(pk__in=field.choices.keys()):
                        choices.append(
                            {
                                "label": instance.get_formatted_name(),
                                "value": str(instance.pk),
                            }
                        )

                else:
                    formatted_name_lookup_expression = self.get_formatted_name_lookup_expression(queryset)

                    choices = (
                        queryset.filter(pk__in=field.choices.keys())
                        .annotate(
                            label=F(formatted_name_lookup_expression), value=Cast(F("pk"), output_field=CharField())
                        )
                        .order_by("label")
                        .values("label", "value")
                    )

        else:
            choices = []
            for value, label in sorted(field.choices.items(), key=operator.itemgetter(1)):
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
        self.model = model

    def __getitem__(self, index):
        return self.choices[index]

    def __len__(self):
        return len(self.choices)


class ModelInfoFilterSetChoicesViewSet(ModelInfoChoicesBaseViewSet):
    """
    This viewset is for providing metadata about filtering choices to front-end clients. This is a read-only viewset.

    Effectively, this is a custom model viewset for content types.
    """

    serializer_class = ModelInfoFilterSetChoicesSerializer

    def validate_queryset(self, filterset, filter_mapping):
        if self.choices_field not in filter_mapping:
            valid_filter_names = tuple(filter_mapping)
            if valid_filter_names:
                raise ValidationError(
                    f"Invalid filter '{self.choices_field}'. Valid filters are {', '.join(sorted(valid_filter_names))}."
                )
            else:
                raise ValidationError(f"Invalid filter '{self.choices_field}'. No filters found on {filterset}.")

    def get_queryset(self):
        """
        Returns a queryset if the field is a relation.
        Return a list if the field is not a relation.
        """
        content_types = self.get_content_type_instance()
        if self.content_type_instance is None:
            return content_types

        serializer = self.canonical["serializer"]  # type: serializers.ModelSerializer
        model_class = serializer.Meta.model
        meta = model_class._meta
        viewset = self.canonical["viewset"]
        filterset = viewset.filterset_class
        filters = filterset.get_filters()
        filter_mapping = dict(filters.items())

        self.validate_queryset(filterset, filter_mapping)

        filtr = filter_mapping[self.choices_field]

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

        if hasattr(self, "choices"):
            return FilterChoicesQueryset(self.choices, self.choices_queryset_model)

        if hasattr(self.queryset.model, "get_formatted_name"):
            choices = []
            for instance in self.queryset.all():
                choices.append(
                    {
                        "label": instance.get_formatted_name(),
                        "value": str(instance.pk),
                    }
                )
            return sorted(choices, key=lambda choice: choice["label"])

        formatted_name_lookup_expression = self.get_formatted_name_lookup_expression(self.queryset)

        return self.queryset.annotate(label=F(formatted_name_lookup_expression), value=F("id")).values_list(
            "label", "value", named=True
        )
