import rest_framework.viewsets as drf_viewsets
from django.db import transaction


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
