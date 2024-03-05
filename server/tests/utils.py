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
    def __init__(self, request, serializer_class, action=None):
        self.request = request
        self.serializer_class = serializer_class
        self.action = action

    def get_serializer_class(self):
        return self.serializer_class
