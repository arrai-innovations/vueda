# Do not include the tests folder in the API Documentation.
from django.conf import settings


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


def postprocess_schema_components(result, generator, **kwargs):
    for component_key, component in result["components"].items():
        if component_key == "schemas":
            for schema_key, schema in component.items():
                match schema_key:
                    case "Login":
                        schema["properties"]["email"]["example"] = "user@example.com"
                        schema["properties"]["email"][
                            "description"
                        ] = "The email address of a user, which is used to log in."
                        schema["properties"]["password"]["example"] = "A long phrase that only you know!!!"
                        schema["properties"]["password"][
                            "description"
                        ] = "The secret phrase or characters that must be used to log in."

    for path in result["paths"].values():
        for method in path.values():
            match method["operationId"]:
                case "vueda.info_model_info_list":
                    method["summary"] = "List models"
                    method["description"] = "Get a list of the models you can get model information for."

                case "vueda.info_model_info_retrieve":
                    method["summary"] = "Get model info"
                    method["description"] = (
                        "Gets information about a model, which can be used to render an add/edit form or readonly view."
                    )

                case "vueda.info_model_info_choices_list":
                    method["summary"] = "List field choices"
                    method["description"] = "Get a list of the choices available for a models field."

                case "vueda.info_model_info_filter_choices_list":
                    method["summary"] = "List filterset field choices"
                    method["description"] = "Get a list of the choices available for a filterset field."

                case "vueda.user_login_create":
                    if "parameters" not in method:
                        method["parameters"] = []

                    method["parameters"] = [
                        {
                            "name": settings.REST_FLEX_FIELDS["EXPAND_PARAM"],
                            "required": False,
                            "in": "query",
                            "description": (
                                "Expandable Fields: Replaces simple values with complex, nested serializations."
                            ),
                            "schema": {
                                "title": "Expandable Fields",
                                "type": "array of strings",
                                "enum": ["groups"],
                            },
                        }
                    ]

                case "vueda.workflow_workflows_list":
                    method["summary"] = "List workflows"
                    method["description"] = "Get a list of the available workflows."

                case "vueda.workflow_workflows_retrieve":
                    method["summary"] = "Get workflow"
                    method["description"] = (
                        "Get details about an available workflow.  "
                        "Currently this contains the same information as list."
                    )

    return result
