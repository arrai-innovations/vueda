import rest_framework.viewsets as drf_viewsets
from django.db import transaction
from django.db.models import Q
from rest_framework.response import Response


class AtomicCreateModelMixin(drf_viewsets.mixins.CreateModelMixin):
    def create(self, request, *args, **kwargs):
        with transaction.atomic():
            return super().create(request, *args, **kwargs)


class AtomicUpdateModelMixin(drf_viewsets.mixins.UpdateModelMixin):
    def update(self, request, *args, **kwargs):
        with transaction.atomic():
            return super().update(request, *args, **kwargs)


class AtomicDestroyModelMixin(drf_viewsets.mixins.DestroyModelMixin):
    def destroy(self, request, *args, **kwargs):
        with transaction.atomic():
            return super().destroy(request, *args, **kwargs)


class AtomicModelViewSetMixin(AtomicCreateModelMixin, AtomicUpdateModelMixin, AtomicDestroyModelMixin):
    pass


class AtomicModelViewSet(
    AtomicCreateModelMixin,
    drf_viewsets.mixins.RetrieveModelMixin,
    AtomicUpdateModelMixin,
    AtomicDestroyModelMixin,
    drf_viewsets.mixins.ListModelMixin,
    drf_viewsets.GenericViewSet,
):
    pass


class ListRowLevelViewSetMixIn(drf_viewsets.mixins.ListModelMixin, drf_viewsets.GenericViewSet):
    """
    A ViewSet mixin that filters out rows that the user does not have access to.
    """

    def apply_row_level_filter(self, queryset):
        model = queryset.model
        row_level_permission = getattr(model, "row_level_permission", None)
        if row_level_permission is not None:
            optional_q = row_level_permission.check_queryset(
                queryset, f"{model._meta.app_label}.list_{model._meta.model_name}", self.request.user, "list"
            )
            if isinstance(optional_q, Q):
                return queryset.filter(optional_q)
            if optional_q is False:
                return model.objects.none()
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
