"""Page-number pagination with column totals and configurable query parameters."""

__all__ = ("VUEDAPageNumberPagination",)

from collections import OrderedDict

from django.conf import settings
from rest_framework.pagination import PageNumberPagination
from rest_framework.pagination import _positive_int
from rest_framework.response import Response


class VUEDAPageNumberPagination(PageNumberPagination):
    """Adds support for pagination metadata including column totals.

    The class also overrides the default pagination query parameters so they
    can be customized via settings.
    """

    def __init__(self):
        self.page_size = settings.REST_FRAMEWORK["PAGE_SIZE"]
        self.page_query_param = settings.PAGE_QUERY_PARAM
        self.page_size_query_param = settings.PAGE_SIZE_QUERY_PARAM
        self.max_page_size = settings.MAX_PAGE_SIZE

    def get_paginated_response(self, data):
        return Response(
            OrderedDict(
                [
                    ("results", data),
                    ("columnTotals", getattr(self, "column_totals", {})),
                    ("perPage", self.get_page_size(self.request)),
                    ("totalPages", self.page.paginator.num_pages),
                    ("totalRecords", self.page.paginator.count),
                ]
            )
        )

    def get_paginated_response_schema(self, schema):
        total_records = 321
        total_pages = divmod(total_records, settings.MAX_PAGE_SIZE)
        if total_pages[1]:
            total_pages = total_pages[0] + 1
        else:
            total_pages = total_pages[0]
        return {
            "type": "object",
            "required": [
                "results",
                "columnTotals",
                "perPage",
                "totalPages",
                "totalRecords",
            ],
            "properties": {
                "results": schema,
                "columnTotals": {
                    "type": "object",
                    "additionalProperties": {"type": "number"},
                    "example": {"hours": 8},
                },
                "perPage": {
                    "type": "integer",
                    "example": settings.MAX_PAGE_SIZE,
                },
                "totalPages": {
                    "type": "integer",
                    "example": total_pages,
                },
                "totalRecords": {
                    "type": "integer",
                    "example": total_records,
                },
            },
        }

    def get_page_size(self, request):
        page_size = self.page_size
        page_size_query_param = self.page_size_query_param
        if page_size_query_param in request.query_params:
            page_size = request.query_params[page_size_query_param]

        return _positive_int(page_size, strict=True, cutoff=self.max_page_size)
