import warnings

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.db.models import Sum
from rest_flex_fields.views import FlexFieldsMixin as DefaultFlexFieldsMixin
from rest_framework import status
from rest_framework import viewsets
from rest_framework import viewsets as drf_viewsets
from rest_framework.exceptions import ErrorDetail
from rest_framework.exceptions import NotAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from vueda.core.decorators import DRY_RUN_HEADER
from vueda.core.decorators import action
from vueda.core.exceptions import VuedaValidationError
from vueda.core.models import ActivatableBaseModel
from vueda.core.serializers import PrimaryKeyListSerializer
from vueda.history.viewsets import SimpleHistoryViewSetMixin


PERMISSION_NAMES_MAPPING = settings.PERMISSION_NAMES_MAPPING


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
    """Filter out rows the user cannot access and expose column aggregates."""

    column_totals: list[str] = []

    def apply_row_level_filter(self, queryset, perm_type="list"):
        model = queryset.model
        row_level_permissions = getattr(model, "RowLevelPermissions", None)

        permission_name = perm_type
        if perm_type in PERMISSION_NAMES_MAPPING:
            permission_name = PERMISSION_NAMES_MAPPING[perm_type]

        perm = f"{model._meta.app_label}.{permission_name}_{model._meta.model_name}"

        if row_level_permissions is not None:
            optional_q = row_level_permissions.check_queryset(
                queryset,
                perm,
                self.request.user,
                perm_type,
            )
            if isinstance(optional_q, Q):
                queryset = queryset.filter(optional_q)
            elif optional_q is False:
                return queryset.none()
            # else, optional_q is None or True, so we don't filter

            # Layer 4: workflow-aware queryset filtering
            if "vueda.workflow" in settings.INSTALLED_APPS:
                from vueda.workflow.models import HasWorkflowModelMixin
                from vueda.workflow.models import StatePermission
                from vueda.workflow.models import Workflow

                if issubclass(model, HasWorkflowModelMixin):
                    workflow = Workflow.objects.filter(content_type=model.get_content_type()).first()
                    if workflow:
                        from django.contrib.contenttypes.models import ContentType
                        from django.db.models import Exists
                        from django.db.models import OuterRef

                        codename = perm.split(".")[-1]
                        content_type = ContentType.objects.get_for_model(model)
                        user = self.request.user

                        state_denied = Exists(
                            StatePermission.objects.filter(
                                state=OuterRef("object_states_proxy__state"),
                                permission__codename=codename,
                                permission__content_type=content_type,
                                group__in=user.groups.all(),
                                grant_or_deny=False,
                            )
                        )
                        state_granted = Exists(
                            StatePermission.objects.filter(
                                state=OuterRef("object_states_proxy__state"),
                                permission__codename=codename,
                                permission__content_type=content_type,
                                group__in=user.groups.all(),
                                grant_or_deny=True,
                            )
                        )
                        queryset = queryset.annotate(
                            _state_denied=state_denied,
                            _state_granted=state_granted,
                        )

                        workflow_q = row_level_permissions.check_queryset_workflow(
                            queryset,
                            perm,
                            user,
                            perm_type,
                            "_state_denied",
                            "_state_granted",
                        )
                        if isinstance(workflow_q, Q):
                            queryset = queryset.filter(workflow_q)
                        elif workflow_q is False:
                            return queryset.none()

        return queryset

    def get_column_info(self, queryset):
        """Return aggregated totals for any fields listed in ``column_totals``."""
        if not self.column_totals:
            return {}
        aggregations = {column: Sum(column) for column in self.column_totals}
        return queryset.aggregate(**aggregations)

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
        column_totals = self.get_column_info(queryset)
        # end addition

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            if hasattr(self, "paginator"):
                self.paginator.column_totals = column_totals
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
        # end code from drf


class NoExtraFieldsForViewSetMixin:
    """
    Mixin for DRF ViewSets to validate query parameters against filter and serializer fields.
    It raises a VuedaValidationError (400) for any query parameter that is not recognized as a
    valid field or an explicitly allowed extra field. It handles validation for both filter class
    fields and fields specified in REST Flex Fields settings.
    """

    @staticmethod
    def get_extra_allowed_fields():
        return (
            settings.PAGE_QUERY_PARAM,
            settings.PAGE_SIZE_QUERY_PARAM,
            settings.REST_FLEX_FIELDS["EXPAND_PARAM"],
            settings.REST_FLEX_FIELDS["FIELDS_PARAM"],
            settings.REST_FLEX_FIELDS["OMIT_PARAM"],
            settings.REST_FRAMEWORK["SEARCH_PARAM"],
            settings.REST_FRAMEWORK["ORDERING_PARAM"],
        )

    @staticmethod
    def validate_flex_expand_param(request, serializer):
        if settings.REST_FLEX_FIELDS["EXPAND_PARAM"] in request.query_params:
            valid_fields = set(serializer.fields.keys())
            # If the serializer Meta does not have permit_retrieve_expand or permit_list_expand defined, which gets
            # added to the serializer context as permitted_expands, then _flex_options_rep_only["expand"] becomes
            # the list of expand that was passed from the client, regardless of each expand param existing or not.
            # So, we can't trust that _flex_options_rep_only["expand"] in that situation, and instead need to look
            # at the expandable_fields set up in the Meta.
            valid_expands = []
            if "permitted_expands" in serializer.context:
                if hasattr(serializer, "_flex_options_rep_only"):
                    valid_fields.update(serializer._flex_options_rep_only["expand"])
                    valid_expands = serializer.context["permitted_expands"]
            elif hasattr(serializer.Meta, "expandable_fields"):
                valid_fields.update(serializer.Meta.expandable_fields)
                valid_expands = serializer.Meta.expandable_fields
            submitted_fields = frozenset(serializer._get_query_param_value(settings.REST_FLEX_FIELDS["EXPAND_PARAM"]))
            extra_keys = submitted_fields - valid_fields
            if extra_keys:
                errors = {}
                for extra_key in extra_keys:
                    errors[extra_key] = [
                        {
                            "message": ErrorDetail(
                                string="Invalid expands. "
                                + (
                                    f"Permitted expands are {', '.join(valid_expands)}."
                                    if valid_expands
                                    else "No expands are permitted."
                                ),
                                code="invalid",
                            ),
                            "code": "invalid",
                        }
                    ]

                return Response(errors, status=400)

    @staticmethod
    def validate_flex_field_param(request, serializer):
        if settings.REST_FLEX_FIELDS["FIELDS_PARAM"] in request.query_params:
            valid_fields = set(serializer.fields.keys())
            if hasattr(serializer, "_flex_options_rep_only"):
                valid_fields.update(serializer._flex_options_rep_only["fields"])
            submitted_fields = frozenset(serializer._get_query_param_value(settings.REST_FLEX_FIELDS["FIELDS_PARAM"]))
            extra_keys = submitted_fields - valid_fields
            if extra_keys:
                errors = {}
                for extra_key in extra_keys:
                    errors[extra_key] = [
                        {
                            "message": ErrorDetail(
                                string=f"Invalid field.  Valid fields are {', '.join(serializer.get_fields())}.",
                                code="invalid",
                            ),
                            "code": "invalid",
                        }
                    ]

                return Response(errors, status=400)

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer()

        results = self.validate_flex_field_param(request, serializer)
        if results is not None:
            return results

        results = self.validate_flex_expand_param(request, serializer)
        if results is not None:
            return results

        return super().retrieve(request, *args, **kwargs)

    def list(self, request, *args, **kwargs):
        """
        If you provide fields to filter by that are not filtered by the filter class, you get a 400 error.
        """
        if hasattr(self, "filterset_class"):
            fields = set()
            # get_fields() only gets fields from the meta, not declared fields on the filterset.
            for filter_name, filter_obj in self.filterset_class.get_filters().items():
                widget = filter_obj.field.widget
                # If the filter has suffixes, then we need to use those with the filter name.
                if hasattr(widget, "suffixes"):
                    for suffix in widget.suffixes:
                        fields.add(f"{filter_name}_{suffix}")
                else:
                    fields.add(filter_name)
                if hasattr(filter_obj, "lookup_expr"):
                    fields.add(f"{filter_name}__{filter_obj.lookup_expr}")
            # pagination and expanding are allowed
            fields.update(self.get_extra_allowed_fields())
            extra_keys = set(request.query_params) - fields
            if extra_keys:
                valid_filters = sorted(fields - set(self.get_extra_allowed_fields()))
                raise VuedaValidationError(
                    {
                        key: [f"Invalid query parameter.  Valid filters are {', '.join(valid_filters)}."]
                        for key in extra_keys
                    }
                )
        serializer = self.get_serializer()

        results = self.validate_flex_field_param(request, serializer)
        if results is not None:
            return results

        results = self.validate_flex_expand_param(request, serializer)
        if results is not None:
            return results

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

    @action(detail=True, bulk=True, methods=["patch"])
    def deactivate(self, request, **kwargs):
        pk = kwargs.get("pk")
        if pk:
            instance = self.get_object()
            if not isinstance(instance, ActivatableBaseModel):
                return Response(
                    {"detail": f"Deactivate action is not supported for {instance.__class__.__name__}."},
                    status=405,
                )
            if not instance.is_active:
                raise VuedaValidationError({pk: [f"This {instance.__class__.__name__} is already deactivated"]})
            instance.is_active = False
            instance.save()
            return Response(
                {"detail": f"{instance.__class__.__name__} with id {instance.pk} has been deactivated."},
                status=200,
            )

        serializer = PrimaryKeyListSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        pks = serializer.validated_data["pks"]

        queryset = self.get_queryset()
        queryset = queryset.filter(pk__in=pks)

        already_deactivated = []
        for instance in queryset:
            if not isinstance(instance, ActivatableBaseModel):
                return Response(
                    {"detail": f"Deactivate action is not supported for {instance.__class__.__name__}."},
                    status=405,
                )

            elif not instance.is_active:
                already_deactivated.append(instance.pk)

        if already_deactivated:
            errors = {}
            for pk in already_deactivated:
                errors[pk] = [f"This {instance.__class__.__name__} is already deactivated"]
            raise VuedaValidationError(errors)

        # Perform bulk deactivation in a single query
        queryset.update(is_active=False)
        return Response({"detail": f"Successfully deactivated {len(pks)} objects."}, status=200)

    @action(detail=True, bulk=True, methods=["patch"])
    def activate(self, request, **kwargs):
        pk = kwargs.get("pk")
        if pk:
            instance = self.get_object()
            if not isinstance(instance, ActivatableBaseModel):
                return Response(
                    {"detail": f"Deactivate action is not supported for {instance.__class__.__name__}."},
                    status=405,
                )

            if instance.is_active:
                raise VuedaValidationError({pk: [f"This {instance.__class__.__name__} is already activated"]})

            instance.is_active = True
            instance.save()
            return Response(
                {"detail": f"{instance.__class__.__name__} with id {instance.pk} has been activated."},
                status=200,
            )

        serializer = PrimaryKeyListSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        pks = serializer.validated_data["pks"]

        queryset = self.get_queryset()
        queryset = queryset.filter(pk__in=pks)

        already_activated = []
        for instance in queryset:
            if not isinstance(instance, ActivatableBaseModel):
                return Response(
                    {"detail": f"Activate action is not supported for {instance.__class__.__name__}."},
                    status=405,
                )

            elif instance.is_active:
                already_activated.append(instance.pk)
        if already_activated:
            errors = {}
            for pk in already_activated:
                errors[pk] = [f"This {instance.__class__.__name__} is already activated"]
            raise VuedaValidationError(errors)
        # Perform bulk deactivation in a single query
        queryset.update(is_active=True)

        return Response({"detail": f"Successfully activated {len(pks)} objects."}, status=200)


class VuedaViewSet(FlexFieldsMixin, NoExtraFieldsForViewSetMixin, ListRowLevelViewSetMixin, viewsets.ModelViewSet):
    detail_args = ["pk"]

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        if issubclass(cls, drf_viewsets.ReadOnlyModelViewSet):
            warnings.warn(
                f"{cls.__module__}.{cls.__name__} inherits from both VuedaViewSet and ReadOnlyModelViewSet. "
                "Use VuedaReadOnlyViewSet for read-only endpoints.",
                RuntimeWarning,
                stacklevel=2,
            )

    def destroy_validation(self, objs):
        return None

    def apply_object_permission_filter(self, queryset):
        """
        Keep only objects the current request can access at object-permission level.
        """
        allowed_ids = []
        for instance in queryset:
            try:
                self.check_object_permissions(self.request, instance)
            except (NotAuthenticated, PermissionDenied):
                continue
            allowed_ids.append(instance.pk)
        return queryset.filter(pk__in=allowed_ids)

    def destroy(self, request, **kwargs):
        pk = kwargs.get("pk")
        dry_run = request.headers.get(DRY_RUN_HEADER, "false").lower() == "true"
        if pk:
            instance = self.get_object()
            self.destroy_validation((instance,))
            if dry_run:
                return Response(status=status.HTTP_200_OK)
            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)

        serializer = PrimaryKeyListSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        pks = serializer.validated_data["pks"]

        queryset = self.get_queryset()
        queryset = queryset.filter(pk__in=pks)
        queryset = self.apply_row_level_filter(queryset, perm_type="delete")
        queryset = self.apply_object_permission_filter(queryset)
        if len(pks) != queryset.count():
            found_pks = set(queryset.values_list("pk", flat=True))
            missing_pks = set(pks) - found_pks
            errors = {}
            for missing_pk in missing_pks:
                errors[missing_pk] = [f"Object with pk={missing_pk} does not exist."]
            raise VuedaValidationError(errors)

        self.destroy_validation(queryset)
        if dry_run:
            return Response(status=status.HTTP_200_OK)
        queryset.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

    def get_allowed_extra_actions(self, request, *, instance=None):
        """
        Override this function to change if a user is allowed to do a certain action.
        """
        allowed_actions = set()
        for extra_action in self.get_extra_actions():
            allowed_actions.add(extra_action.url_name)

        return allowed_actions


class VuedaHistoryViewSet(SimpleHistoryViewSetMixin, VuedaViewSet):
    pass


class VuedaReadOnlyViewSet(
    FlexFieldsMixin,
    NoExtraFieldsForViewSetMixin,
    ListRowLevelViewSetMixin,
    viewsets.ReadOnlyModelViewSet,
):
    detail_args = ["pk"]

    def get_allowed_extra_actions(self, request, *, instance=None):
        """
        Override this function to change if a user is allowed to do a certain action.
        """
        allowed_actions = set()
        for extra_action in self.get_extra_actions():
            allowed_actions.add(extra_action.url_name)

        return allowed_actions
