from django_filters import rest_framework

import tests.erring.models as my_models
from vueda.core.filters import VuedaFilterSet


class RelatedObjectsAreMissingDataFilterSet(VuedaFilterSet):
    no_name = rest_framework.ModelMultipleChoiceFilter(
        field_name="no_name", label="No Name", queryset=my_models.NoNameField.objects.exclude(the_name_field="Test1")
    )
