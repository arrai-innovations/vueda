from django.conf import settings
from rest_flex_fields.serializers import FlexFieldsSerializerMixin
from rest_framework import serializers as drf_serializers

from vueda.core.serializers import VuedaExpandableFieldsSerializerMixin
from vueda.workflow import open_api_tracebacks
from vueda.workflow.models import State
from vueda.workflow.models import Transition
from vueda.workflow.models import Workflow


class HasWorkflowSerializerMixin(metaclass=drf_serializers.SerializerMetaclass):
    workflow_state_code = drf_serializers.CharField(source="workflow_state.code", read_only=True)
    workflow_state_name = drf_serializers.CharField(source="workflow_state.name", read_only=True)

    class Meta:
        fields = ["workflow_state_code", "workflow_state_name"]


class StateSerializer(VuedaExpandableFieldsSerializerMixin, FlexFieldsSerializerMixin, drf_serializers.ModelSerializer):
    class Meta:
        fields = ["code", "name"]
        model = State


class TransitionSerializer(
    VuedaExpandableFieldsSerializerMixin, FlexFieldsSerializerMixin, drf_serializers.ModelSerializer
):
    class Meta:
        fields = ["code", "name"]
        model = Transition


class WorkflowSerializer(
    VuedaExpandableFieldsSerializerMixin, FlexFieldsSerializerMixin, drf_serializers.ModelSerializer
):
    app_label = drf_serializers.CharField(read_only=True, source="content_type.app_label")
    model = drf_serializers.CharField(read_only=True, source="content_type.model")

    class Meta:
        fields = ["code", "name", "app_label", "model"]
        model = Workflow
        expandable_fields = {
            "states": ("vueda.workflow.serializers.StateSerializer", {"many": True, "read_only": True}),
            "transitions": ("vueda.workflow.serializers.TransitionSerializer", {"many": True, "read_only": True}),
        }

    def get_schema_operation_parameters(self, operation_id, parameters=()):
        parameters = super().get_schema_operation_parameters(operation_id, parameters)

        match operation_id:
            case "vueda.workflow_workflows_list":
                for index, existing_parameter in reversed(tuple(enumerate(parameters))):
                    if existing_parameter["name"] in ("app_label", "model", settings.REST_FLEX_FIELDS["EXPAND_PARAM"]):
                        parameters.pop(index)

            case (
                "vueda.workflow_workflows_object_transitions"
                | "vueda.workflow_workflows_object_state"
                | "vueda.workflow_workflows_execute_transition"
            ):
                for index, existing_parameter in reversed(tuple(enumerate(parameters))):
                    if existing_parameter["name"] in (settings.REST_FLEX_FIELDS["EXPAND_PARAM"],):
                        parameters.pop(index)

        return parameters

    def customize_schema_request_data(self, request_data):
        match self.context["request"].path:
            case "/routes/vueda.workflow/workflows/{app_label}/{model}/execute-transition/":
                request_data["content"]["application/json"]["schema"] = {
                    "type": "object",
                    "description": "Test a",
                    "properties": {
                        "transition_code": {
                            "description": "test b",
                            "type": "string",
                            "maxLength": 255,
                        },
                        "object_ids": {
                            "description": "A list of the object pks to transition.",
                            "type": "array",
                            "items": {
                                "type": "string",
                                "title": "pks",
                                "example": "1",
                            },
                        },
                    },
                }

                request_data["content"]["application/json"]["examples"] = {
                    "ExecuteTransitionBulkRequestExample": {
                        "summary": "Bulk Execute Transition",
                        "description": (
                            "uri: "
                            + "/routes/vueda.workflow/workflows&ZeroWidthSpace;/store/customerorder/execute-transition/"
                        ),
                        "value": {
                            "transition_code": "pack_order",
                            "object_ids": ["1", "2"],
                        },
                    },
                    "ExecuteTransitionRequestExample": {
                        "summary": "Execute Transition",
                        "description": (
                            "uri: /routes"
                            + "/vueda.workflow/workflows&ZeroWidthSpace;/store/customerorder/execute-transition/1/"
                        ),
                        "value": {
                            "transition_code": "pack_order",
                        },
                    },
                }

        return request_data

    def customize_schema_response_data(self, response_data):
        request = self.context["request"]

        for status_code, data in tuple(response_data.items()):  # tuple because we may add items.
            match (request.method, request.path, status_code):
                # List workflows
                case ("GET", "/routes/vueda.workflow/workflows/", "200"):
                    data["content"]["application/json"]["examples"] = {
                        "ListWorkflowsExample": {
                            "summary": "Workflows exist",
                            "description": "uri: /routes/vueda.workflow/workflows/",
                            "value": {
                                "perPage": settings.MAX_PAGE_SIZE,
                                "totalPages": 1,
                                "totalRecords": 4,
                                "results": [
                                    {
                                        "code": "pack_order",
                                        "name": "Pack Order",
                                        "app_label": "store",
                                        "model": "customerorder",
                                    },
                                    {
                                        "code": "ship_order",
                                        "name": "Ship Order",
                                        "app_label": "store",
                                        "model": "customerorder",
                                    },
                                ],
                            },
                        },
                        "NoWorkflowsExample": {
                            "summary": "No workflows exist",
                            "description": "uri: /routes/vueda.workflow/workflows/",
                            "value": {
                                "perPage": settings.MAX_PAGE_SIZE,
                                "totalPages": 0,
                                "totalRecords": 0,
                                "results": [],
                            },
                        },
                    }

                    response_data["403"] = {
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": [
                                        "detail",
                                        "serverStack",
                                    ],
                                    "properties": {
                                        "detail": {
                                            "type": "string",
                                        },
                                        "serverStack": {
                                            "type": "string",
                                        },
                                    },
                                    "readOnly": True,
                                },
                                "examples": {
                                    "ListWorkflowPermissionDeniedExample": {
                                        "summary": "Permission denied",
                                        "description": "uri: /routes/vueda.workflow/workflows/",
                                        "value": {
                                            "detail": "You do not have permission to perform this action.",
                                            "serverStack": open_api_tracebacks.WORKFLOW_DENIED,
                                        },
                                    },
                                },
                            }
                        }
                    }

                # Get workflow
                case ("GET", "/routes/vueda.workflow/workflows/{app_label}/{model}/", "200"):
                    expand_param = settings.REST_FLEX_FIELDS["EXPAND_PARAM"]
                    data["content"]["application/json"]["examples"] = {
                        "GetWorkflowExample": {
                            "summary": "Get Customer Order",
                            "description": "uri: /routes/vueda.workflow/workflows&ZeroWidthSpace;/store/customerorder/",
                            "value": {
                                "code": "order_fulfillment",
                                "name": "Order Fulfillment",
                                "app_label": "store",
                                "model": "customerorder",
                            },
                        },
                        "GetWorkflowWithExpandableStateAndTransitionExample": {
                            "summary": "Get Customer Order (Expanded)",
                            "description": f"uri: /routes/vueda.workflow/workflows&ZeroWidthSpace;/store/customerorder/?&ZeroWidthSpace;{expand_param}=states&amp;{expand_param}=transitions",
                            "value": {
                                "code": "order_fulfillment",
                                "name": "Order Fulfillment",
                                "app_label": "store",
                                "model": "customerorder",
                                "states": [
                                    {"code": "new", "name": "New"},
                                    {"code": "packed", "name": "Packed"},
                                    {"code": "returned", "name": "Returned"},
                                    {"code": "shipped", "name": "Shipped"},
                                    {"code": "on_hold", "name": "On Hold"},
                                    {"code": "cancelled", "name": "Cancelled"},
                                ],
                                "transitions": [
                                    {"code": "cancel_order", "name": "Cancel Order"},
                                    {"code": "hold_order", "name": "Hold Order"},
                                    {"code": "pack_order", "name": "Pack Order"},
                                    {"code": "return_order", "name": "Return Order"},
                                    {"code": "ship_order", "name": "Ship Order"},
                                ],
                            },
                        },
                    }

                    response_data["403"] = {
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": [
                                        "detail",
                                        "serverStack",
                                    ],
                                    "properties": {
                                        "detail": {
                                            "type": "string",
                                        },
                                        "serverStack": {
                                            "type": "string",
                                        },
                                    },
                                    "readOnly": True,
                                },
                                "examples": {
                                    "GetWorkflowPermissionDeniedExample": {
                                        "summary": "Permission denied",
                                        "description": (
                                            "uri: /routes/vueda.workflow/workflows&ZeroWidthSpace;/store/customer/"
                                        ),
                                        "value": {
                                            "detail": "You do not have permission to perform this action.",
                                            "serverStack": open_api_tracebacks.WORKFLOW_DENIED,
                                        },
                                    },
                                },
                            }
                        }
                    }

                    response_data["404"] = {
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": [
                                        "detail",
                                        "serverStack",
                                    ],
                                    "properties": {
                                        "detail": {
                                            "type": "string",
                                        },
                                        "serverStack": {
                                            "type": "string",
                                        },
                                    },
                                    "readOnly": True,
                                },
                                "examples": {
                                    "InvalidWorkflowExample": {
                                        "summary": "Invalid workflow",
                                        "description": (
                                            "uri: /routes/vueda.workflow/workflows&ZeroWidthSpace;/store/invalidmodel/"
                                        ),
                                        "value": {
                                            "detail": "No Workflow matches the given query.",
                                            "serverStack": open_api_tracebacks.WORKFLOW_INVALID,
                                        },
                                    },
                                },
                            }
                        }
                    }

                # Get object state
                case (
                    "GET",
                    "/routes/vueda.workflow/workflows/{app_label}/{model}/object-state/{object_id}/",
                    "200",
                ):
                    data["content"]["application/json"]["schema"] = {
                        "type": "object",
                        "properties": {
                            "state": {
                                "allOf": [
                                    {
                                        "type": "object",
                                        "properties": {
                                            "code": {
                                                "type": "string",
                                                "maxLength": 255,
                                                "readonly": True,
                                            },
                                            "name": {
                                                "type": "string",
                                                "maxLength": 255,
                                                "readonly": True,
                                            },
                                        },
                                        "required": [
                                            "code",
                                            "name",
                                        ],
                                    },
                                ],
                                "readonly": True,
                            },
                            "current_history_id": {
                                "type": "integer",
                                "readonly": True,
                            },
                        },
                        "required": [
                            "state",
                            "current_history_id",
                        ],
                    }

                    data["content"]["application/json"]["examples"] = {
                        "GetObjectStateHistoryExample": {
                            "summary": "Object With History",
                            "description": "uri: /routes/vueda.workflow/workflows&ZeroWidthSpace;/store/customerorder/",
                            "value": {
                                "state": {
                                    "code": "order_packed",
                                    "name": "Order Packed",
                                },
                                "current_history_id": "1234",
                            },
                        },
                        "GetObjectStateExample": {
                            "summary": "Object Without History",
                            "description": "uri: /routes/vueda.workflow/workflows&ZeroWidthSpace;/store/customerorder/",
                            "value": {
                                "state": {
                                    "code": "order_shipped",
                                    "name": "Order Shipped",
                                }
                            },
                        },
                    }

                    response_data["403"] = {
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": [
                                        "detail",
                                        "serverStack",
                                    ],
                                    "properties": {
                                        "detail": {
                                            "type": "string",
                                        },
                                        "serverStack": {
                                            "type": "string",
                                        },
                                    },
                                    "readOnly": True,
                                },
                                "examples": {
                                    "GetObjectStateInvalidExample": {
                                        "summary": "Permission Denied",
                                        "description": (
                                            "uri: /routes"
                                            + "/vueda.workflow/workflows&ZeroWidthSpace;/store/customer/object-state/1/"
                                        ),
                                        "value": {
                                            "detail": "You do not have permission to perform this action.",
                                            "serverStack": open_api_tracebacks.WORKFLOW_DENIED,
                                        },
                                    },
                                },
                            }
                        }
                    }

                    response_data["404"] = {
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": [
                                        "detail",
                                        "serverStack",
                                    ],
                                    "properties": {
                                        "detail": {
                                            "type": "string",
                                        },
                                        "serverStack": {
                                            "type": "string",
                                        },
                                    },
                                    "readOnly": True,
                                },
                                "examples": {
                                    "GetObjectStateInvalidWorkflowExample": {
                                        "summary": "Invalid workflow",
                                        "description": (
                                            "uri: /routes/vueda.workflow"
                                            + "/workflows&ZeroWidthSpace;/store/invalidmodel/object-state/1/"
                                        ),
                                        "value": {
                                            "detail": "No Workflow matches the given query.",
                                            "serverStack": open_api_tracebacks.WORKFLOW_INVALID,
                                        },
                                    },
                                    "GetObjectStateInvalidCustomerOrderExample": {
                                        "summary": "invalid object pk",
                                        "description": (
                                            "uri: /routes/vueda.workflow"
                                            + "/workflows&ZeroWidthSpace;/store/customerorder/object-state/1/"
                                        ),
                                        "value": {
                                            "detail": "No CustomerOrder matches the given query.",
                                            "serverStack": open_api_tracebacks.CUSTOMER_ORDER_INVALID,
                                        },
                                    },
                                },
                            }
                        }
                    }

                # List object transitions
                case (
                    "GET",
                    "/routes/vueda.workflow/workflows/{app_label}/{model}/object-transitions/{object_id}/",
                    "200",
                ):
                    data["content"]["application/json"]["examples"] = {
                        "ListObjectTransitionsExample": {
                            "summary": "Object Transitions",
                            "description": (
                                "uri: /routes"
                                + "/vueda.workflow/workflows&ZeroWidthSpace;/store/customerorder/object-transitions/1/"
                            ),
                            "value": {
                                "perPage": settings.MAX_PAGE_SIZE,
                                "totalPages": 1,
                                "totalRecords": 3,
                                "results": [
                                    {
                                        "code": "cancel_order",
                                        "name": "Cancel Order",
                                    },
                                    {
                                        "code": "hold_order",
                                        "name": "Hold Order",
                                    },
                                    {
                                        "code": "pack_order",
                                        "name": "Pack Order",
                                    },
                                ],
                            },
                        },
                    }

                    response_data["403"] = {
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": [
                                        "detail",
                                        "serverStack",
                                    ],
                                    "properties": {
                                        "detail": {
                                            "type": "string",
                                        },
                                        "serverStack": {
                                            "type": "string",
                                        },
                                    },
                                    "readOnly": True,
                                },
                                "examples": {
                                    "ListObjectTransitionsDeniedExample": {
                                        "summary": "Permission denied",
                                        "description": (
                                            "uri: /routes/vueda.workflow/workflows&ZeroWidthSpace;/store/customer/"
                                        ),
                                        "value": {
                                            "detail": "You do not have permission to perform this action.",
                                            "serverStack": open_api_tracebacks.WORKFLOW_DENIED,
                                        },
                                    },
                                },
                            }
                        }
                    }

                    response_data["404"] = {
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": [
                                        "detail",
                                        "serverStack",
                                    ],
                                    "properties": {
                                        "detail": {
                                            "type": "string",
                                        },
                                        "serverStack": {
                                            "type": "string",
                                        },
                                    },
                                    "readOnly": True,
                                },
                                "examples": {
                                    "ListObjectTransitionsInvalidWorkflowExample": {
                                        "summary": "Invalid workflow",
                                        "description": (
                                            "uri: /routes/vueda.workflow"
                                            + "/workflows&ZeroWidthSpace;/store/invalidmodel/object-transitions/1/"
                                        ),
                                        "value": {
                                            "detail": "No Workflow matches the given query.",
                                            "serverStack": open_api_tracebacks.WORKFLOW_INVALID,
                                        },
                                    },
                                    "ListObjectTransitionsInvalidCustomerOrderExample": {
                                        "summary": "Invalid object pk",
                                        "description": (
                                            "uri: /routes/vueda.workflow"
                                            + "/workflows&ZeroWidthSpace;/store/customerorder/object-transitions/1/"
                                        ),
                                        "value": {
                                            "detail": "No CustomerOrder matches the given query.",
                                            "serverStack": open_api_tracebacks.CUSTOMER_ORDER_INVALID,
                                        },
                                    },
                                },
                            }
                        }
                    }

                # Execute transition
                case (
                    "PATCH",
                    "/routes/vueda.workflow/workflows/{app_label}/{model}/execute-transition/",
                    "200",
                ):
                    data["content"]["application/json"]["examples"] = {
                        "ExecuteTransitionResponseExample": {
                            "summary": "Execute Transition",
                            "description": (
                                "uri: /routes"
                                + "/vueda.workflow/workflows&ZeroWidthSpace;/store/customerorder/execute-transition/1/"
                            ),
                            "value": {
                                "new_state": {
                                    "code": "packed",
                                    "name": "Packed",
                                    "current_history_id": 2,
                                },
                                "new_transitions": [
                                    {
                                        "code": "cancel_order",
                                        "name": "Cancel Order",
                                    },
                                    {
                                        "code": "ship_order",
                                        "name": "Ship Order",
                                    },
                                ],
                            },
                        },
                        "ExecuteTransitionBulkResponseExample": {
                            "summary": "Execute Bulk Transition",
                            "description": (
                                "uri: /routes"
                                + "/vueda.workflow/workflows&ZeroWidthSpace;/store/customerorder/execute-transition/"
                            ),
                            "value": {
                                "1": {
                                    "new_state": {
                                        "code": "packed",
                                        "name": "Packed",
                                        "current_history_id": 3,
                                    },
                                    "new_transitions": [
                                        {
                                            "code": "cancel_order",
                                            "name": "Cancel Order",
                                        },
                                        {
                                            "code": "ship_order",
                                            "name": "Ship Order",
                                        },
                                    ],
                                },
                                "2": {
                                    "new_state": {
                                        "code": "packed",
                                        "name": "Packed",
                                        "current_history_id": 4,
                                    },
                                    "new_transitions": [
                                        {
                                            "code": "cancel_order",
                                            "name": "Cancel Order",
                                        },
                                        {
                                            "code": "ship_order",
                                            "name": "Ship Order",
                                        },
                                    ],
                                },
                            },
                        },
                    }

                    response_data["403"] = {
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": [
                                        "detail",
                                        "serverStack",
                                    ],
                                    "properties": {
                                        "detail": {
                                            "type": "string",
                                        },
                                        "serverStack": {
                                            "type": "string",
                                        },
                                    },
                                    "readOnly": True,
                                },
                                "examples": {
                                    "ExecuteTransitionWorkflowPermissionDeniedExample": {
                                        "summary": "Permission denied",
                                        "description": (
                                            "uri: /routes/vueda.workflow/workflows&ZeroWidthSpace;/store/customer/"
                                        ),
                                        "value": {
                                            "detail": "You do not have permission to perform this action.",
                                            "serverStack": open_api_tracebacks.WORKFLOW_DENIED,
                                        },
                                    },
                                },
                            }
                        }
                    }

                    response_data["404"] = {
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": [
                                        "detail",
                                        "serverStack",
                                    ],
                                    "properties": {
                                        "detail": {
                                            "type": "string",
                                        },
                                        "serverStack": {
                                            "type": "string",
                                        },
                                    },
                                    "readOnly": True,
                                },
                                "examples": {
                                    "ExecuteTransitionInvalidWorkflowExample": {
                                        "summary": "Invalid workflow",
                                        "description": (
                                            "uri: /routes/vueda.workflow"
                                            + "/workflows&ZeroWidthSpace;/store/invalidmodel/object-transitions/1/"
                                        ),
                                        "value": {
                                            "detail": "No Workflow matches the given query.",
                                            "serverStack": open_api_tracebacks.WORKFLOW_INVALID,
                                        },
                                    },
                                    "ExecuteTransitionInvalidCustomerOrder#xample": {
                                        "summary": "Invalid object pk",
                                        "description": (
                                            "uri: /routes/vueda.workflow"
                                            + "/workflows&ZeroWidthSpace;/store/customerorder/object-transitions/1/"
                                        ),
                                        "value": {
                                            "detail": "No CustomerOrder matches the given query.",
                                            "serverStack": open_api_tracebacks.CUSTOMER_ORDER_INVALID,
                                        },
                                    },
                                },
                            }
                        }
                    }
