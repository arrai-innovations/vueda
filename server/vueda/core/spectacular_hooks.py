# Do not include the tests folder in the API Documentation.
def preprocessing_hooks(endpoints):
    filtered_endpoints = []
    for path, path_regex, method, callback in endpoints:
        if path.startswith("/routes/tests/"):
            continue

        filtered_endpoints.append((path, path_regex, method, callback))

    return filtered_endpoints


# We can't register cart in app.ready, because it hits the db with a content type query.
def register_cart_with_model_info(endpoints):
    from tests.store.serializers import CartSerializer
    from tests.store.viewsets import CartViewSet
    from vueda import info

    info.register(CartSerializer, CartViewSet)

    return endpoints
