from collections import OrderedDict

from django.conf import settings
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class VUEDAPageNumberPagination(PageNumberPagination):
    """
    Adds support for pagination metadata and overrides for
    pagination query parameters.
    """

    page_size_query_param = settings.PAGE_SIZE_QUERY_PARAM
    page_query_param = settings.PAGE_QUERY_PARAM
    max_page_size = settings.MAX_PAGE_SIZE

    def get_paginated_response(self, data):
        return Response(
            OrderedDict(
                [
                    ("results", data),
                    ("perPage", self.get_page_size(self.request)),
                    ("totalPages", self.page.paginator.num_pages),
                    ("totalRecords", self.page.paginator.count),
                ]
            )
        )
