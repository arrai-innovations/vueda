from django_filters import rest_framework


class CustomNumberInFilter(rest_framework.BaseInFilter, rest_framework.NumberFilter):
    pass


class CustomRangeFilter(rest_framework.BaseRangeFilter, rest_framework.NumberFilter):
    pass
