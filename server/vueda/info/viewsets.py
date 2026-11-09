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
from django.core.exceptions import FieldError
from django.core.exceptions import ValidationError
from django.core.validators import EMPTY_VALUES
from django.db.models import CharField
from django.db.models import F
from django.db.models.constants import LOOKUP_SEP
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
from vueda.core.permissions import filter_rows_for_user
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

    urls using this viewset should provide the app_label and model as kwargs, for example:

    ```py
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
    """
    Base of the two choice endpoints, which list the ``{label, value}`` options of one field or
    filter on a registered model.

    The URL names the model by ``app_label`` and ``model`` (the lowercase model name that its
    content type stores) and the field or filter by ``field``. A request passes three checks in order:

    1. The model must be registered with ``register`` or ``register_serializer``. Otherwise the
       endpoint answers 404 with ``Unable to find the content type "<app_label>.<model>".`` The
       model that a relation points at does not need to be registered.
    2. ``resolve_choices`` finds the field or filter. A name that the model does not offer answers 404,
       and the message lists the valid names.
    3. ``check_permissions`` checks ``read`` on the model, plus ``list`` on the related model when
       the options are another model's rows. A missing permission answers 403. The codenames go
       through ``PERMISSION_NAMES_MAPPING``. The viewset sets no ``permission_classes``, so these
       are the only permission checks.

    Every ``value`` is a string, whatever the column type. The exception is a related row whose key
    is null, such as a row whose ``slug_field`` path crosses a null relation. That row's ``value`` is
    null. Responses are paginated like other VUEDA lists. The search and ordering filter backends are
    removed, so the endpoints take no search or ordering parameter.
    """

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

        For serializer-only fields (neither a model field nor a model relation):
            We check 'read' on the current model, and for a related field also 'list' on the model
            of the field's queryset.

        An unknown field name never reaches this check, because resolve_choices raises Http404 for
        it first.
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
    List the choices of one field on a model's canonical serializer.

    The ``field`` URL segment names a field of that serializer. A field without ``choices`` answers
    404. The permissions depend on what backs the field:

    - A model field needs ``read`` on the model.
    - A model relation needs ``read`` on the model and ``list`` on the related model.
    - A serializer-only field, which is neither, needs ``read`` on the model. When it has a
      ``queryset``, it also needs ``list`` on that queryset's model.

    A field with static choices (a ``ChoiceField``, or a model field with ``choices``) returns every
    entry, sorted by label, with the value converted to a string. Blank entries stay in the list,
    since a create or update form can offer them.

    A related field (``PrimaryKeyRelatedField``, ``SlugRelatedField``, or a many-related field)
    returns the rows of the serializer field's queryset. The value is the primary key as a string,
    or the ``slug_field`` value for a ``SlugRelatedField``. The label is the related model's
    formatted name, and options are sorted by it. The label comes from the first of these that the
    related model provides:

    1. A ``get_formatted_name()`` method, called on each row.
    2. The column that a string ``formatted_name_lookup_expression`` names.
    3. The ``formatted_name`` column.

    A related model with none of the three raises ``FieldError``.

    A many-related field keys its options by its child relation's key: the primary key, or the
    ``slug_field`` value when the child is a ``SlugRelatedField``.

    The ``value`` query parameter keeps only the options whose value matches. It can repeat, as in
    ``?value=CT&value=ON``, and it matches the same key that the unfiltered list uses. A related
    field applies the filter to its queryset before any row is read. The exception is a
    ``slug_field`` that names a model attribute, such as a property, which the database cannot
    filter on. For that field, the endpoint reads every row of the queryset to compare the
    attribute. A value that the key's model field, or the output field of a transform at the end
    of the key, cannot convert matches nothing. Examples are ``abc`` for an integer primary key and
    for ``created__year``. Static choices compare each value to the choice value as a string. A
    request with ``value`` and no matching option returns an empty list.
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
        # Bound fields, from a serializer that has the request in its context: a relation's
        # get_queryset can then read self.context["request"], as it does on the model's own viewset.
        # Unbound fields from get_fields() have no context. The context leaves out "view", because
        # this viewset is not the model's viewset that serializer code expects there.
        fields = serializer(context={"request": self.request}).fields

        self.validate_queryset(serializer, fields)

        self.choices_field_instance = fields[self.choices_field]
        field_info = get_field_info(serializer.Meta.model)

        permission_read_name = "read"
        if "read" in settings.PERMISSION_NAMES_MAPPING:
            permission_read_name = settings.PERMISSION_NAMES_MAPPING["read"]

        permission_list_name = "list"
        if "list" in settings.PERMISSION_NAMES_MAPPING:
            permission_list_name = settings.PERMISSION_NAMES_MAPPING["list"]

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
                f"{related_field_info.related_model._meta.app_label}.{permission_list_name}"
                f"_{related_field_info.related_model._meta.model_name}",
            )
            self.choices_queryset_model = related_field_info.related_model._meta.model

        else:
            # A serializer-only field: no model field or relation backs it, but the choices still
            # belong to this model's serializer, so they get the same floor as a model field. A
            # related one also reads its queryset's rows, so it needs 'list' on that model too.
            model_class = serializer.Meta.model
            meta = model_class._meta
            permissions = [f"{meta.app_label}.{permission_read_name}_{meta.model_name}"]
            field = self.choices_field_instance
            # get_queryset, not the queryset attribute: a relation can leave queryset unset and
            # override get_queryset, and get_queryset is what lists the rows.
            relation = getattr(field, "child_relation", field)
            related_queryset = relation.get_queryset() if hasattr(relation, "get_queryset") else None
            if related_queryset is not None:
                related_meta = related_queryset.model._meta
                permissions.append(f"{related_meta.app_label}.{permission_list_name}_{related_meta.model_name}")
            self.choices_permissions = tuple(permissions)
            self.choices_queryset_model = related_queryset.model if related_queryset is not None else model_class

    def get_requested_values(self):
        """
        Return the values that the ``value`` query parameter asks for, as a set of strings.

        The parameter can repeat, as in ``?value=CT&value=ON``. The method returns ``None`` when the
        request has no ``value`` parameter, so the endpoint lists every option.
        """
        if "value" not in self.request.query_params:
            return None
        return set(self.request.query_params.getlist("value"))

    def filter_related_queryset(self, queryset, key_field, values):
        """
        Narrow ``queryset`` to the rows whose ``key_field`` matches one of ``values``.

        Each value is converted with the key's model field first. A value that the field cannot
        convert cannot match a row, so it is dropped instead of raising. An example is ``abc`` for an
        integer primary key. A value that contains a NUL character is dropped too, because PostgreSQL
        would reject the query. The field's validators do not run, because a stored row can hold a
        value that a validator added later rejects. A number outside the column's integer range needs
        no check: PostgreSQL compares the column with it and finds no match.

        A ``key_field`` that ends in a transform after a field, such as ``created__year`` or a JSON
        key, is filtered in the database too. The transform's output field converts the values, so
        ``abc`` for ``created__year`` is dropped. A JSON key's output field keeps each value as given.

        A ``key_field`` that names a model attribute rather than a field, such as a property, has no
        database column to filter on. For that key, the method reads the attribute from every row of
        ``queryset`` and keeps the rows whose value, as a string, is one of ``values``.
        """
        key_names = key_field.split(LOOKUP_SEP)
        try:
            final_field, targets, unresolved = queryset.query.names_to_path(key_names, queryset.model._meta)[1:]
        except FieldError:
            final_field, unresolved = None, key_names
        if unresolved and (final_field is None or final_field.is_relation):
            key_relations = self.get_key_relations(queryset, key_names)
            rows = queryset.select_related(key_relations) if key_relations else queryset
            matching_pks = []
            for row in rows:
                key = self.read_key(row, key_names)
                if key is not None and str(key) in values:
                    matching_pks.append(row.pk)
            return queryset.filter(pk__in=matching_pks)
        if unresolved:
            # The transform's output field converts the values, so `abc` for `created__year`
            # matches nothing instead of raising. Resolve on a copy of the query, because
            # resolve_ref adds the path's joins to the query it is called on.
            key_model_field = queryset.all().query.resolve_ref(key_field).output_field
        else:
            key_model_field = targets[0]
        cleaned_values = []
        for value in values:
            if "\x00" in value:
                # PostgreSQL text cannot hold a NUL character, so no row matches, and the database
                # would reject the query.
                continue
            try:
                cleaned_value = key_model_field.to_python(value)
            except (ValidationError, ValueError, TypeError):
                # Most fields raise ValidationError for a value they cannot convert. Some raise a
                # ValueError subclass instead, such as binascii.Error from a BinaryField.
                continue
            cleaned_values.append(cleaned_value)
        return queryset.filter(**{f"{key_field}{LOOKUP_SEP}in": cleaned_values})

    def get_key_relations(self, queryset, key_names):
        """
        Return the leading relations of an option key, as a ``select_related`` path.

        The method returns ``None`` when the key crosses no relation, or when it crosses a
        multi-valued relation, which ``select_related`` cannot follow. A multi-table inheritance
        parent link that Django adds for an inherited field is not one of the key's names, so it is
        not counted. The last name is the key itself, so it is never counted either, even when it
        resolves through a relation. ``pk`` does that on a model whose primary key is a one-to-one
        field.
        """
        try:
            path = queryset.query.names_to_path(key_names, queryset.model._meta)[0]
        except FieldError:
            # A slug_field that names a model attribute, such as a property, is not a field path.
            # read_key still reads it from each row.
            return None
        if any(path_info.m2m for path_info in path):
            return None
        relation_count = 0
        for path_info in path:
            if not (path_info.direct and getattr(path_info.join_field.remote_field, "parent_link", False)):
                relation_count += 1
        relation_count = min(relation_count, len(key_names) - 1)
        if not relation_count:
            return None
        return LOOKUP_SEP.join(key_names[:relation_count])

    def read_key(self, instance, key_names):
        """
        Read an option key from a row by following each name in ``key_names`` as an attribute.

        The method does not call the relation's ``to_representation``, because a custom relation may
        need serializer context that this serializer instance does not have. A null relation along
        the path gives a null key. The database branch of ``get_queryset`` also gives a null key for
        that row.
        """
        key = instance
        for name in key_names:
            key = getattr(key, name)
            if key is None:
                return None
        return key

    def get_queryset(self):
        """
        Return the field's options as ``{label, value}`` dictionaries, sorted by label.

        A ``value`` query parameter keeps only the options with a matching value. The values of a
        related field narrow the queryset before any row is read, so the endpoint does not read rows
        outside the filter. A key that names a model attribute is the exception, as
        ``filter_related_queryset`` describes.
        """
        self.resolve_choices()

        if self.content_type_instance is None:
            return self.choices_content_types

        field = self.choices_field_instance
        values = self.get_requested_values()
        # A many-related field holds its relation in child_relation, which keys each option.
        relation = getattr(field, "child_relation", field)

        # A relation's get_queryset can return None, and then the relation offers no rows. Its
        # choices are empty, so the static branch below answers with an empty list.
        queryset = relation.get_queryset() if hasattr(relation, "get_queryset") else None
        if queryset is not None:
            key_field = getattr(relation, "slug_field", "pk")
            if values is not None:
                queryset = self.filter_related_queryset(queryset, key_field, values)

            if callable(getattr(queryset.model, "get_formatted_name", None)):
                key_names = key_field.split(LOOKUP_SEP)
                rows = annotate_formatted_name(queryset)
                key_relations = self.get_key_relations(queryset, key_names)
                if key_relations:
                    # A key through relations would otherwise load each relation once per row.
                    rows = rows.select_related(key_relations)
                choices = []
                for instance in rows:
                    key = self.read_key(instance, key_names)
                    choices.append(
                        {
                            "label": instance.get_formatted_name(),
                            "value": None if key is None else str(key),
                        }
                    )
                choices.sort(key=operator.itemgetter("label"))

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
            choices = []
            for value, label in sorted(field.choices.items(), key=operator.itemgetter(1)):
                if values is not None and str(value) not in values:
                    continue
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
    List the choices of one filter in the ``filterset_class`` of a model's canonical viewset.

    The ``field`` URL segment names a filter of that filterset. A model with no canonical viewset, or
    a viewset with no ``filterset_class``, answers 404, as does a name that the filterset lacks. A filter
    with a ``queryset`` (``ModelChoiceFilter``, ``ModelMultipleChoiceFilter``) needs ``read`` on the
    model and ``list`` on the model of the queryset that ``get_queryset(request)`` returns. Every
    other filter needs ``read`` on the model.

    The endpoint reads the same rows that the viewset's ``list`` action reads. It calls the viewset's
    ``get_queryset()`` as a ``list`` request with this request, an empty ``kwargs``, and
    ``action = "list"``. ``filter_rows_for_user`` then keeps the rows that the user may list, by the
    model's row-level and workflow state rules for the ``list`` permission. The request's query
    parameters build the filterset over those rows. What the options are depends on the filter:

    - A filter with a ``queryset`` returns the rows of that queryset that the matching rows of the
      model reference and that the user may list, by the same rule on the related model. A related
      row that the user may not list is left out, even when a matching row references it. The value
      is the primary key as a string. The label comes from the first of these that the related
      model provides: a ``get_formatted_name()`` method, the column that a string
      ``formatted_name_lookup_expression`` names, or the ``formatted_name`` column. Options are
      sorted by label.
    - ``AllValuesFilter`` and ``AllValuesMultipleFilter`` return the distinct values of the column in
      the matching rows, sorted by value. Each label is the value as a string.
    - A filter with static choices (``ChoiceFilter``, ``TypedChoiceFilter``, ``BooleanFilter``, and
      similar) returns the choices of its form widget.

    For the first two kinds, the matching rows are those that the request's other filter parameters
    select. The filter's own parameter is left out, so it never narrows them. For static choices,
    the other parameters have no effect. The filter's own parameter narrows static choices only when
    the filter's ``lookup_expr`` is ``contains``, ``icontains``, ``startswith``, or ``istartswith``.
    The endpoint then keeps each choice whose value contains, or starts with, the parameter,
    ignoring case for all four. Labels are not compared.

    Static and column-value options omit empty values (``EMPTY_VALUES``), because a request without
    the filter's parameter already means "no filter".
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
        # A serializer-only registration has no viewset, and a viewset need not declare a filterset;
        # either way the model has no filters to offer choices for.
        filterset_class = getattr(viewset, "filterset_class", None)
        if filterset_class is None:
            raise Http404(
                f"Invalid filter '{self.choices_field}'. {meta.app_label}.{meta.model_name} has no filterset."
            )
        filterset_instance = filterset_class(
            queryset=model_class.objects.all(), data=self.request.query_params.copy(), request=self.request
        )
        filterset_instance.is_valid()
        filter_mapping = dict(filterset_instance.filters.items())

        self.validate_queryset(filterset_instance, filter_mapping)

        filtr = filter_mapping[self.choices_field]
        self.choices_viewset_class = viewset
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

    def get_list_queryset(self):
        """
        Return the queryset that the registered viewset's ``get_queryset()`` builds for a ``list`` request.

        The viewset instance carries this request, ``action = "list"``, ``detail = False``, and empty
        ``args`` and ``kwargs``, so a ``get_queryset()`` that reads ``self.request``, ``self.action``,
        or ``self.kwargs`` builds the queryset of the registration's ``list`` route.
        """
        view = self.choices_viewset_class()
        view.request = self.request
        view.action = "list"
        view.detail = False
        view.args = ()
        view.kwargs = {}
        view.format_kwarg = None
        return view.get_queryset()

    def get_listed_rows(self):
        """
        Return the rows that the registered viewset's ``list`` action returns for this request's other filters.

        The rows start from :meth:`get_list_queryset`. ``filter_rows_for_user`` keeps the rows that the
        user may list. The filterset then applies every query parameter except the addressed filter's
        own, so that filter never narrows its own choices.
        """
        other_params = self.request.query_params.copy()
        other_params.pop(self.choices_field, None)
        return self.choices_filterset_class(
            queryset=filter_rows_for_user(self.get_list_queryset(), self.request.user, perm_type="list"),
            data=other_params,
            request=self.request,
        ).qs

    def get_queryset(self):
        """
        Returns a queryset if the field is a relation.
        Return a list if the field is not a relation.

        Dynamic choices come from the rows that the registered viewset's ``list`` action reads: its
        ``get_queryset()``, then the rows that ``filter_rows_for_user`` keeps for the ``list``
        permission by row-level rules and workflow state rules. A value or related key found only on
        a row outside those rows is not offered. A queryset-backed filter's choices are also rows that
        the user may list on the related model, within the filter's own queryset, so a listed main row
        that references a hidden related row does not make that row a choice. Static declared choices
        read no rows.
        """
        self.resolve_choices()

        if self.content_type_instance is None:
            return self.choices_content_types

        filtr = self.choices_filter
        model_class = self.choices_model_class
        user = self.request.user

        if hasattr(filtr, "queryset"):
            # ModelChoiceFilter / ModelMultipleChoiceFilter (queryset-based).
            related_model = self.choices_queryset_model

            used_pks = self.get_listed_rows().values_list(filtr.field_name, flat=True).distinct()
            related_qs = filter_rows_for_user(self.choices_related_queryset, user, perm_type="list").filter(
                pk__in=used_pks
            )

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
            # Dynamic choices: the distinct values of the field in the listed rows.
            distinct_values = (
                self.get_listed_rows().values_list(filtr.field_name, flat=True).distinct().order_by(filtr.field_name)
            )
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
