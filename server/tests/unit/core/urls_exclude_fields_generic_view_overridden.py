from django.urls import path

from tests.erring.serializers import NoExpandableFieldsDataSerializer
from tests.erring.viewsets import ExcludeFieldsGenericUpdateView


urlpatterns = [
    path(
        "erring/exclude_fields_generic_view_overridden/<int:pk>/",
        ExcludeFieldsGenericUpdateView.as_view(serializer_class=NoExpandableFieldsDataSerializer),
    ),
]
