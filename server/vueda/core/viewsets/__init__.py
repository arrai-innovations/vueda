from django.conf import settings
from django.db import transaction
from django.db.models import Q
from rest_flex_fields.views import FlexFieldsMixin as DefaultFlexFieldsMixin
from rest_framework import viewsets
from rest_framework import viewsets as drf_viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from vueda.core.models import ActivatableBaseModel
from vueda.history.viewsets import SimpleHistoryViewSetMixin


class AtomicCreateModelViewSetMixin(drf_viewsets.mixins.CreateModelMixin):
    def create(self, request, *args, **kwargs):
        with transaction.atomic():
            return super().create(request, *args, **kwargs)


class AtomicUpdateModelViewSetMixin(drf_viewsets.mixins.UpdateModelMixin):
    def update(self, request, *args, **kwargs):
        with transaction.atomic():
            return super().update(request, *args, **kwargs)


class AtomicDestroyModelViewSetMixin(drf_viewsets.mixins.DestroyModelMixin):
    def destroy(self, request, *args, **kwargs):
        with transaction.atomic():
            return super().destroy(request, *args, **kwargs)


class AtomicModelViewSetMixin(
    AtomicCreateModelViewSetMixin, AtomicUpdateModelViewSetMixin, AtomicDestroyModelViewSetMixin
):
    pass


class AtomicModelViewSet(
    AtomicCreateModelViewSetMixin,
    drf_viewsets.mixins.RetrieveModelMixin,
    AtomicUpdateModelViewSetMixin,
    AtomicDestroyModelViewSetMixin,
    drf_viewsets.mixins.ListModelMixin,
    drf_viewsets.GenericViewSet,
):
    """
    A Base ViewSet that wraps atomic transactions around create, update, and destroy.
    """

    pass


class ListRowLevelViewSetMixin(drf_viewsets.mixins.ListModelMixin, drf_viewsets.GenericViewSet):
    """
    A ViewSet mixin that filters out rows that the user does not have access to.
    """

    def apply_row_level_filter(self, queryset):
        model = queryset.model
        row_level_permissions = getattr(model, "RowLevelPermissions", None)
        if row_level_permissions is not None:
            optional_q = row_level_permissions.check_queryset(
                queryset, f"{model._meta.app_label}.list_{model._meta.model_name}", self.request.user, "list"
            )
            if isinstance(optional_q, Q):
                return queryset.filter(optional_q)
            if optional_q is False:
                return queryset.none()
            # else, optional_q is None, so we don't filter
            # or optional_q is True, so we don't filter
        return queryset

    def list(self, request, *args, **kwargs):
        """
        applying row level filter in get_queryset() causes problems
         with other drf actions, specifically encountered with create
         not finding it's created object
        """
        # future: when updating drf, check that the copied code is still the same
        # code from drf
        queryset = self.filter_queryset(self.get_queryset())
        # our addition

        queryset = self.apply_row_level_filter(queryset)
        # end addition

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
        # end code from drf


class NoExtraFieldsForViewSetMixin:
    """
    Mixin for DRF ViewSets to validate query parameters against filter and serializer fields.
    It returns a 500 error for any query parameter that is not recognized as a valid field or
    an explicitly allowed extra field. It handles validation for both filter class fields and
    fields specified in REST Flex Fields settings.
    """

    extra_allowed_fields = (
        settings.PAGE_QUERY_PARAM,
        settings.PAGE_SIZE_QUERY_PARAM,
        settings.REST_FLEX_FIELDS["EXPAND_PARAM"],
        settings.REST_FLEX_FIELDS["FIELDS_PARAM"],
        settings.REST_FLEX_FIELDS["OMIT_PARAM"],
        settings.REST_FRAMEWORK["SEARCH_PARAM"],
        settings.REST_FRAMEWORK["ORDERING_PARAM"],
    )

    def list(self, request, *args, **kwargs):
        """
        if you provide fields to filter by that are not filtered by the filter class, you get a 500 error
        """
        if hasattr(self, "filterset_class"):
            # get_fields() only gets fields from the meta, not declared fields on the filterset.
            fields = set(self.filterset_class.get_filters().keys())
            # pagination and expanding are allowed
            fields.update(self.extra_allowed_fields)
            for key in request.query_params.keys():
                if key not in fields:
                    return Response(
                        {"detail": f"Invalid query parameter: {key}"},
                        status=500,
                    )
        serializer = self.get_serializer()
        if settings.REST_FLEX_FIELDS["FIELDS_PARAM"] in request.query_params:
            # make sure all fields are valid
            valid_fields = set(serializer.fields.keys())
            if hasattr(serializer, "_flex_options_rep_only"):
                valid_fields.update(serializer._flex_options_rep_only["fields"])
            submitted_fields = set(request.query_params.getlist(settings.REST_FLEX_FIELDS["FIELDS_PARAM"]))
            extra_keys = submitted_fields - valid_fields
            if extra_keys:
                return Response(
                    {
                        "detail": f"Invalid {settings.REST_FLEX_FIELDS['FIELDS_PARAM']} parameter: {', '.join(extra_keys)}. Valid fields are: {', '.join(submitted_fields)}"
                    },
                    status=500,
                )
        if settings.REST_FLEX_FIELDS["EXPAND_PARAM"] in request.query_params:
            # make sure all fields are valid
            valid_fields = set(serializer.fields.keys())
            if hasattr(serializer, "_flex_options_rep_only"):
                valid_fields.update(serializer._flex_options_rep_only["expand"])
            submitted_fields = set(request.query_params.getlist(settings.REST_FLEX_FIELDS["EXPAND_PARAM"]))
            extra_keys = submitted_fields - valid_fields
            if extra_keys:
                return Response(
                    {
                        "detail": f"Invalid {settings.REST_FLEX_FIELDS['EXPAND_PARAM']} parameter: {', '.join(extra_keys)}. Valid fields are: {', '.join(submitted_fields)}"
                    },
                    status=500,
                )

        return super().list(request, *args, **kwargs)


class FlexFieldsMixin(DefaultFlexFieldsMixin):
    """
    Mixin for DRF ViewSets to add 'permitted_expands' in serializer context based on
    the current action. It utilizes 'permit_{action}_expands' attributes of the ViewSet
    to determine expandable fields for each action (e.g., list, retrieve).

    This replaces `rest_flex_fields.FlexFieldsMixin` and `rest_flex_fields.FlexFieldsModelViewSet` usage.
    """

    def get_serializer_context(self):
        default_context = super().get_serializer_context()
        if hasattr(self, "action") and self.action != "list":
            # super deals with permitted list action expands
            permit_expands_key = f"permit_{self.action}_expands"
            if hasattr(self, permit_expands_key):
                default_context["permitted_expands"] = getattr(self, permit_expands_key)
        return default_context


class PerActionSerializerMixin:
    """
    A ViewSet mixin that allows you to specify different serializers for different actions.
    """

    def get_serializer_class(self):
        serializer_class_key = f"{self.action}_serializer_class"
        if hasattr(self, "action") and hasattr(self, serializer_class_key):
            return getattr(self, serializer_class_key)
        return super().get_serializer_class()


class DeactivateActionViewSetMixin:
    """
    A ViewSet mixin that allows you to deactivate a model inheriting from `ActivatableBaseModel`.
    """

    @action(detail=True, methods=["patch"])
    def deactivate(self, request, *args, **kwargs):
        instance = self.get_object()
        if not isinstance(instance, ActivatableBaseModel):
            return Response(
                {"detail": f"Deactivate action is not supported for {instance.__class__.__name__}."},
                status=405,
            )
        if not instance.is_active:
            return Response(
                {"detail": f"{instance.__class__.__name__} with id {instance.pk} is already deactivated."},
                status=400,
            )
        instance.is_active = False
        instance.save()
        return Response(
            {"detail": f"{instance.__class__.__name__} with id {instance.pk} has been deactivated."},
            status=200,
        )

    @action(detail=True, methods=["patch"])
    def activate(self, request, *args, **kwargs):
        instance = self.get_object()
        if not isinstance(instance, ActivatableBaseModel):
            return Response(
                {"detail": f"Activate action is not supported for {instance.__class__}."},
                status=405,
            )
        if instance.is_active:
            return Response(
                {"detail": f"{instance.__class__.__name__} with id {instance.pk} is already activated."},
                status=400,
            )
        instance.is_active = True
        instance.save()
        return Response(
            {"detail": f"{instance.__class__.__name__} with id {instance.pk} has been activated."},
            status=200,
        )


class VuedaViewSet(
    NoExtraFieldsForViewSetMixin, SimpleHistoryViewSetMixin, ListRowLevelViewSetMixin, viewsets.ModelViewSet
):
    pass
