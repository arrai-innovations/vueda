"""ViewSets for model info, field choices, and filterset choices in the info API."""

__all__ = (
    "ChoicesQueryset",
    "FilterChoice",
    "FilterChoicesQueryset",
    "ModelInfoChoicesBaseViewSet",
    "ModelInfoChoicesViewSet",
    "ModelInfoFilterSetChoicesViewSet",
    "ModelInfoViewSet",
)

import collections
import operator

from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.core.validators import EMPTY_VALUES
from django.db.models import CharField
from django.db.models import F
from django.db.models.functions.comparison import Cast
from django.http import Http404
from django.utils.functional import cached_property
from django_filters.filters import AllValuesFilter
from django_filters.filters import AllValuesMultipleFilter
from rest_framework import generics
from rest_framework import mixins
from rest_framework.filters import OrderingFilter
from rest_framework.filters import SearchFilter
from rest_framework.utils.model_meta import get_field_info
from rest_framework.viewsets import GenericViewSet
from rest_framework.viewsets import ReadOnlyModelViewSet

from vueda.core.formatted_name import annotate_formatted_name
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

    def initial(self, request, *args, **kwargs):
        if "app_label" in self.kwargs and "model" in self.kwargs:
            content_types = ContentType.objects.filter(
                pk__in=get_registered_content_types(), app_label=self.kwargs["app_label"], model=self.kwargs["model"]
            )

            if not content_types.exists():
                raise Http404(f'Unable to find the content type "{self.kwargs["app_label"]}.{self.kwargs["model"]}".')

        return super().initial(request, *args, **kwargs)

    def get_queryset(self):
        return ContentType.objects.filter(pk__in=get_registered_content_types())

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
        self.choices_content_types = None
        self.choices_resolved = False

        super().__init__(*args, **kwargs)

        # Remove search and ordering filter backends, since these won't work on choices at the moment.
        self.filter_backends = [
            backend for backend in self.filter_backends if not issubclass(backend, (SearchFilter, OrderingFilter))
        ]

    @cached_property
    def canonical(self):
        return get_registration(self.content_type_instance.pk)

    def resolve_choices(self):
        """
        Resolve the addressed field, the permissions it requires, and the state that
        ``get_queryset`` needs to build the choices.

        DRF calls ``check_permissions`` before it calls the handler, so resolution cannot wait
        for ``get_queryset``. Subclasses store their resolved state on the instance, raise
        ``Http404`` for a field the model does not offer, and tolerate repeat calls.
        """
        raise NotImplementedError

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
            The field carries choices but is neither a model field nor a relation, so there is no
            model to check against. An unknown field name never reaches this check, because
            resolve_choices raises Http404 for it first.
        """
        self.resolve_choices()

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

        return super().dispatch(request, *args, **kwargs)

    def initial(self, request, *args, **kwargs):
        content_types = ContentType.objects.filter(
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
        content_types = ContentType.objects.filter(
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

    def has_choices(self, field):
        """
        Report whether a serializer field offers choices, without materializing them.

        ``RelatedField.choices`` and ``ManyRelatedField.choices`` are properties that read the
        related queryset, so a plain ``hasattr`` on the instance reads the related table. Testing
        the class answers the same question for every DRF field without a query. The instance test
        stays for a field that assigns ``choices`` in ``__init__`` instead of declaring a property.
        """
        return hasattr(type(field), "choices") or hasattr(field, "choices")

    def validate_queryset(self, serializer, fields):
        if self.choices_field not in fields or not self.has_choices(fields[self.choices_field]):
            valid_fieldnames = []
            for field_name, field in fields.items():
                if hasattr(field, "choices") and field.choices:
                    valid_fieldnames.append(field_name)

            if valid_fieldnames:
                raise Http404(
                    f"Invalid field '{self.choices_field}'. "
                    f"Valid fields with choices are {', '.join(sorted(valid_fieldnames))}."
                )
            else:
                raise Http404(
                    f"Invalid field '{self.choices_field}'. "
                    f"No choice fields found on {serializer.Meta.model._meta.label}."
                )

    def resolve_choices(self):
        if self.choices_resolved:
            return

        self.choices_resolved = True
        self.choices_content_types = self.get_content_type_instance()

        if self.content_type_instance is None:
            return

        serializer = self.canonical["serializer"]  # type: serializers.ModelSerializer
        fields = serializer().get_fields()

        self.validate_queryset(serializer, fields)

        self.choices_field_instance = fields[self.choices_field]
        field_info = get_field_info(serializer.Meta.model)

        permission_read_name = "read"
        if "read" in settings.PERMISSION_NAMES_MAPPING:
            permission_read_name = settings.PERMISSION_NAMES_MAPPING["read"]

        # If we add field level permissions at some point, then we will want to check them here.
        if self.choices_field in field_info.fields_and_pk:
            model_class = serializer.Meta.model
            meta = model_class._meta
            self.choices_permissions = (f"{meta.app_label}.{permission_read_name}_{meta.model_name}",)
            self.choices_queryset_model = model_class

        elif self.choices_field in field_info.relations:
            related_field_info = field_info.relations[self.choices_field]
            model_class = serializer.Meta.model
            meta = model_class._meta
            self.choices_permissions = (
                f"{meta.app_label}.{permission_read_name}_{meta.model_name}",
                f"{related_field_info.related_model._meta.app_label}.list"
                f"_{related_field_info.related_model._meta.model_name}",
            )
            self.choices_queryset_model = related_field_info.related_model._meta.model

    def get_queryset(self):
        """
        Returns a queryset if the field is a relation.
        Return a list if the field is not a relation.
        """
        self.resolve_choices()

        if self.content_type_instance is None:
            return self.choices_content_types

        field = self.choices_field_instance

        if hasattr(field, "child_relation"):
            queryset = field.child_relation.queryset
            if callable(getattr(queryset.model, "get_formatted_name", None)):
                choices = []
                for instance in annotate_formatted_name(queryset).filter(pk__in=field.choices.keys()):
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
            queryset = field.get_queryset()
            if hasattr(field, "slug_field"):
                key_field = field.slug_field
                if callable(getattr(queryset.model, "get_formatted_name", None)):
                    choices = []
                    for instance in annotate_formatted_name(queryset):
                        choices.append(
                            {
                                "label": instance.get_formatted_name(),
                                "value": str(getattr(instance, key_field)),
                            }
                        )

                else:
                    formatted_name_lookup_expression = self.get_formatted_name_lookup_expression(queryset)
                    choices = (
                        queryset.annotate(
                            label=F(formatted_name_lookup_expression),
                            value=Cast(F(key_field), output_field=CharField()),
                        )
                        .order_by("label")
                        .values("label", "value")
                    )

            else:
                if callable(getattr(queryset.model, "get_formatted_name", None)):
                    choices = []
                    for instance in annotate_formatted_name(queryset).filter(pk__in=field.choices.keys()):
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
                # Keep blank choices for create/update form metadata. Filter choice
                # metadata strips them separately because "no filter" is represented by
                # an omitted query parameter.
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

    def validate_queryset(self, filterset_instance, filter_mapping):
        if self.choices_field not in filter_mapping:
            valid_filter_names = tuple(filter_mapping)
            if valid_filter_names:
                raise Http404(
                    f"Invalid filter '{self.choices_field}'. Valid filters are {', '.join(sorted(valid_filter_names))}."
                )
            else:
                raise Http404(f"Invalid filter '{self.choices_field}'. No filters found on {filterset_instance}.")

    def resolve_choices(self):
        if self.choices_resolved:
            return

        self.choices_resolved = True
        self.choices_content_types = self.get_content_type_instance()

        if self.content_type_instance is None:
            return

        serializer = self.canonical["serializer"]  # type: serializers.ModelSerializer
        model_class = serializer.Meta.model
        meta = model_class._meta
        viewset = self.canonical["viewset"]
        filterset_class = viewset.filterset_class
        filterset_instance = filterset_class(
            queryset=model_class.objects.all(), data=self.request.query_params.copy(), request=self.request
        )
        filterset_instance.is_valid()
        filter_mapping = dict(filterset_instance.filters.items())

        self.validate_queryset(filterset_instance, filter_mapping)

        filtr = filter_mapping[self.choices_field]
        self.choices_filterset_class = filterset_class
        self.choices_filter = filtr
        self.choices_model_class = model_class

        permission_read_name = "read"
        if "read" in settings.PERMISSION_NAMES_MAPPING:
            permission_read_name = settings.PERMISSION_NAMES_MAPPING["read"]

        permission_list_name = "list"
        if "list" in settings.PERMISSION_NAMES_MAPPING:
            permission_list_name = settings.PERMISSION_NAMES_MAPPING["list"]

        if hasattr(filtr, "queryset"):
            # ModelChoiceFilter / ModelMultipleChoiceFilter (queryset-based).
            related_qs = filtr.get_queryset(self.request)
            related_model = related_qs.model
            related_meta = related_model._meta

            self.choices_related_queryset = related_qs
            self.choices_permissions = (
                f"{meta.app_label}.{permission_read_name}_{meta.model_name}",
                f"{related_meta.app_label}.{permission_list_name}_{related_meta.model_name}",
            )
            self.choices_queryset_model = related_model

        else:
            # AllValuesFilter, AllValuesMultipleFilter, and the static choice filters all read
            # their values from the model this filterset belongs to.
            self.choices_permissions = (f"{meta.app_label}.{permission_read_name}_{meta.model_name}",)
            self.choices_queryset_model = model_class

    def get_queryset(self):
        """
        Returns a queryset if the field is a relation.
        Return a list if the field is not a relation.
        """
        self.resolve_choices()

        if self.content_type_instance is None:
            return self.choices_content_types

        filtr = self.choices_filter
        model_class = self.choices_model_class

        # Build a queryset narrowed by all OTHER active filters (exclude this field's param).
        other_params = self.request.query_params.copy()
        other_params.pop(self.choices_field, None)
        narrowing_filterset = self.choices_filterset_class(
            queryset=model_class.objects.all(),
            data=other_params,
            request=self.request,
        )
        narrowed_qs = narrowing_filterset.qs

        if hasattr(filtr, "queryset"):
            # ModelChoiceFilter / ModelMultipleChoiceFilter (queryset-based).
            related_model = self.choices_queryset_model

            used_pks = narrowed_qs.values_list(filtr.field_name, flat=True).distinct()
            related_qs = self.choices_related_queryset.filter(pk__in=used_pks)

            if callable(getattr(related_model, "get_formatted_name", None)):
                choices = [
                    {"label": instance.get_formatted_name(), "value": str(instance.pk)}
                    for instance in annotate_formatted_name(related_qs)
                ]
                return ChoicesQueryset(sorted(choices, key=lambda c: c["label"]), self.choices_queryset_model)

            formatted_name_lookup_expression = self.get_formatted_name_lookup_expression(related_qs)
            return (
                related_qs.annotate(
                    label=F(formatted_name_lookup_expression), value=Cast(F("pk"), output_field=CharField())
                )
                .order_by("label")
                .values("label", "value")
            )

        elif isinstance(filtr, (AllValuesFilter, AllValuesMultipleFilter)):
            # Dynamic choices: distinct field values present in the (narrowed) main queryset.
            distinct_values = narrowed_qs.values_list(filtr.field_name, flat=True).distinct().order_by(filtr.field_name)
            choices = [(str(value), str(value)) for value in distinct_values if value not in EMPTY_VALUES]
            return FilterChoicesQueryset(choices, model_class)

        else:
            # Static choices: ChoiceFilter, TypedChoiceFilter, BooleanFilter, etc.
            # Django-filter choice fields carry blank placeholders for native select
            # rendering. For filter metadata, "no filter" is the absence of a query
            # parameter, so omit empty values before the client renders options.
            choices = [
                (str(value), str(label)) for value, label in filtr.field.widget.choices if value not in EMPTY_VALUES
            ]

            filter_value = self.request.query_params.get(self.choices_field)
            if filter_value:
                if filtr.lookup_expr in ("icontains", "contains"):
                    choices = [(value, label) for value, label in choices if filter_value.lower() in value.lower()]
                elif filtr.lookup_expr in ("istartswith", "startswith"):
                    choices = [
                        (value, label) for value, label in choices if value.lower().startswith(filter_value.lower())
                    ]

            return FilterChoicesQueryset(choices, model_class)
