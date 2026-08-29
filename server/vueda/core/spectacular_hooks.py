"""drf-spectacular preprocessing and postprocessing hooks for schema customization."""

__all__ = (
    "ExpandParam",
    "postprocess_schema_components",
    "preprocessing_hooks",
    "register_cart_with_model_info",
)

# Do not include the tests folder in the API Documentation.
from django.conf import settings

from vueda.core.installed_apps import is_installed


# Needed, so we don't have to hard code the expand param in a match case.
class ExpandParam:
    setting = settings.REST_FLEX_FIELDS["EXPAND_PARAM"]


def preprocessing_hooks(endpoints):
    filtered_endpoints = []
    for path, path_regex, method, callback in endpoints:
        if path.startswith("/routes/tests/"):
            continue

        filtered_endpoints.append((path, path_regex, method, callback))

    return filtered_endpoints


# We can't register cart in app.ready, because it hits the db with a content type query.
def register_cart_with_model_info(endpoints):
    if not is_installed("tests.store"):
        return endpoints

    from tests.store.serializers import CartSerializer
    from tests.store.viewsets import CartViewSet
    from vueda import info

    info.register(CartSerializer, CartViewSet)

    return endpoints


# Since this is only used to create the schema, keep the complexity of 30, because it looks nicer as a single function.
def postprocess_schema_components(result, generator, **kwargs):  # noqa C901
    for component_key, component in result["components"].items():
        match component_key:
            case "schemas":
                for schema_key, schema in component.items():
                    match schema_key:
                        case "Login":
                            schema["properties"]["email"]["example"] = "user@example.com"
                            schema["properties"]["email"]["description"] = (
                                "The email address of a user, which is used to log in."
                            )
                            schema["properties"]["password"]["example"] = "A long phrase that only you know!!!"
                            schema["properties"]["password"]["description"] = (
                                "The secret phrase or characters that must be used to log in."
                            )
                            schema["properties"]["password"]["format"] = "password"

                        case (
                            "PaginatedModelInfoList"
                            | "PaginatedModelInfoChoicesList"
                            | "PaginatedModelInfoFilterSetChoicesList"
                            | "PaginatedWorkflowList"
                        ):
                            schema["properties"]["perPage"]["default"] = settings.MAX_PAGE_SIZE
                            schema["properties"]["perPage"]["example"] = 100

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
                                "type": "array",
                                "items": {
                                    "type": "string",
                                    "enum": ["groups"],
                                },
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

                case "vueda.workflow_workflows_object_state_retrieve":
                    method["summary"] = "Get object state"
                    method["description"] = "Get the current state for an object."

                    # Remove the expand query param, as it doesn't make sense for this.
                    indexes_to_delete = set()
                    for index, parameter in enumerate(method["parameters"]):
                        match parameter["name"]:
                            # Add some additional information for object_id.
                            case "object_id":
                                parameter["schema"]["example"] = "1234"
                                parameter["schema"]["title"] = "object pk"
                            case ExpandParam.setting:
                                indexes_to_delete.add(index)

                    for index_to_delete in sorted(indexes_to_delete, reverse=True):
                        del method["parameters"][index_to_delete]

                case "vueda.workflow_workflows_object_transitions_retrieve":
                    method["summary"] = "List object transitions"
                    method["description"] = "List the current transitions for an object."

                    # Remove the expand query param, as it doesn't make sense for this.
                    indexes_to_delete = set()
                    for index, parameter in enumerate(method["parameters"]):
                        match parameter["name"]:
                            # Add some additional information for object_id.
                            case "object_id":
                                parameter["schema"]["example"] = "1234"
                                parameter["schema"]["title"] = "object pk"
                            case ExpandParam.setting:
                                indexes_to_delete.add(index)

                    for index_to_delete in sorted(indexes_to_delete, reverse=True):
                        del method["parameters"][index_to_delete]

                case "vueda.workflow_workflows_execute_transition_partial_update":
                    method["summary"] = "Execute object transition"
                    method["description"] = "Execute an available transition for an object."

                    # Remove the expand query param, as it doesn't make sense for this.
                    indexes_to_delete = set()
                    for index, parameter in enumerate(method["parameters"]):
                        match parameter["name"]:
                            # Add some additional information for object_id.
                            case ExpandParam.setting:
                                indexes_to_delete.add(index)

                    for index_to_delete in sorted(indexes_to_delete, reverse=True):
                        del method["parameters"][index_to_delete]

                    method["parameters"].append(
                        {
                            "in": "path",
                            "name": "object_id",
                            "schema": {
                                "type": "string",
                                "example": "1234",
                                "title": "object pk",
                            },
                            "required": False,
                        }
                    )

    return result
