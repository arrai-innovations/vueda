from django.urls import path
from rest_framework.generics import UpdateAPIView

from tests.erring.models import NoExpandableFieldsData
from tests.erring.serializers import ExcludeFieldsSerializer
from tests.erring.viewsets import ExcludeFieldsGenericUpdateView


urlpatterns = [
    path("erring/exclude_fields_generic_view/<int:pk>/", ExcludeFieldsGenericUpdateView.as_view()),
    path("erring/exclude_fields_generic_view_again/<int:pk>/", ExcludeFieldsGenericUpdateView.as_view()),
    path(
        "erring/exclude_fields_generic_view_initkwargs/<int:pk>/",
        UpdateAPIView.as_view(
            queryset=NoExpandableFieldsData.objects.all(),
            serializer_class=ExcludeFieldsSerializer,
        ),
    ),
]
