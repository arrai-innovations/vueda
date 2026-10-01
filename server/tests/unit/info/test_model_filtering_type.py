import pytest
from django_filters import fields as filter_fields
from django_filters import rest_framework

from vueda.info.serializers import ModelInfoSerializer


@pytest.mark.parametrize(
    ("filter_obj", "form_field", "expected"),
    [
        (rest_framework.AllValuesFilter(field_name="name"), filter_fields.ChoiceField(), "AllValuesChoiceField"),
        (
            rest_framework.AllValuesMultipleFilter(field_name="name"),
            filter_fields.MultipleChoiceField(),
            "AllValuesMultipleChoiceField",
        ),
        (
            rest_framework.ChoiceFilter(field_name="name", choices=[("a", "A")]),
            filter_fields.ChoiceField(choices=[("a", "A")]),
            "ChoiceField",
        ),
        (
            rest_framework.MultipleChoiceFilter(field_name="name", choices=[("a", "A")]),
            filter_fields.MultipleChoiceField(choices=[("a", "A")]),
            "MultipleChoiceField",
        ),
    ],
    ids=["all-values", "all-values-multiple", "choice", "multiple-choice"],
)
def test_filter_type_names_the_form_field_or_the_all_values_type(filter_obj, form_field, expected):
    assert ModelInfoSerializer().get_model_filtering_type("name", filter_obj, form_field) == expected
