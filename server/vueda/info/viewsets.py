from django.contrib.contenttypes.models import ContentType
from rest_framework import generics
from rest_framework import mixins
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from vueda.core.permissions import ObjectPermissions
from vueda.core.viewsets import FlexFieldsMixin
from vueda.info.registration import get_registered_content_types
from vueda.info.serializers import ModelInfoSerializer


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
    permit_retrieve_expands = [
        "model_permissions",
        "model_fields",
        "model_actions",
        "model_expands",
        "model_ordering",
        "model_filtering",
    ]

    def get_queryset(self):
        return ContentType.objects.all().filter(pk__in=get_registered_content_types())

    # noinspection PyMethodOverriding
    def get_object(self, app_label, model):
        return generics.get_object_or_404(ContentType, app_label=app_label, model=model.replace("_", ""))

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object(kwargs["app_label"], kwargs["model"])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
