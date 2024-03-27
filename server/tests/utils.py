from contextlib import contextmanager

from django.http import QueryDict


class FakeRequest:
    def __init__(self, query_params=None, data=None, method="GET", user=None):

        if query_params is None:
            query_params = {}

        # GET
        # a dictionary-like class customized to deal with multiple values for the same key
        self.query_params = QueryDict("", mutable=True)

        for key, value in query_params.items():
            self.query_params.setlist(key, [value] if isinstance(value, str) else value)
        # POST, PUT, PATCH
        self.data = data
        self.method = method
        self.user = user


class FakeView:
    def __init__(self, request, serializer_class, action=None, queryset=None):
        self.request = request
        self.serializer_class = serializer_class
        self.action = action
        self.queryset = queryset

    def get_serializer_class(self):
        return self.serializer_class

    def get_queryset(self):
        if callable(self.queryset):
            return self.queryset()
        return self.queryset


# Because rest framework loads settings on class import there's no way to
# override through 'settings', but we will do it regardless, to be thorough.
@contextmanager
def adjust_page_size(settings, value):
    orig_value = settings.REST_FRAMEWORK["PAGE_SIZE"]
    settings.REST_FRAMEWORK["PAGE_SIZE"] = value
    try:
        yield
    finally:
        settings.REST_FRAMEWORK["PAGE_SIZE"] = orig_value
