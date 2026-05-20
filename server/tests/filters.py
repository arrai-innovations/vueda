from django_filters import rest_framework
from django_filters.fields import ChoiceField


class CustomNumberInFilter(rest_framework.BaseInFilter, rest_framework.NumberFilter):
    pass


class CustomRangeFilter(rest_framework.BaseRangeFilter, rest_framework.NumberFilter):
    pass


class UnvalidatedChoiceField(ChoiceField):
    def valid_value(self, value):
        return True


class ContainsChoiceFilter(rest_framework.ChoiceFilter):
    field_class = UnvalidatedChoiceField
