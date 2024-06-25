# Do not include the tests folder in the API Documentation.
def preprocessing_hooks(endpoints):
    filtered_endpoints = []
    for path, path_regex, method, callback in endpoints:
        if path.startswith("/routes/tests/"):
            continue

        filtered_endpoints.append((path, path_regex, method, callback))

    return filtered_endpoints
