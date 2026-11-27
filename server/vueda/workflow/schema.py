"""OpenAPI schema descriptions for the workflow endpoints.

The serializers here describe the JSON the ``WorkflowViewSet`` actions return. They never serialize data;
schema generation reads them, so each response shape becomes a named component.
"""

__all__ = (
    "BulkExecuteTransitionRequestSerializer",
    "BulkTransitionObjectSerializer",
    "BulkTransitionResultSerializer",
    "ExecuteTransitionRequestSerializer",
    "ObjectStateSerializer",
    "TransitionResultSerializer",
    "TransitionResultStateSerializer",
    "WorkflowErrorSerializer",
)

from django.conf import settings
from rest_framework import serializers

from vueda.core.open_api import conditional_open_api_example
from vueda.core.open_api import conditional_open_api_request
from vueda.core.open_api import conditional_open_api_response
from vueda.core.open_api import conditional_open_api_types
from vueda.workflow import open_api_tracebacks
from vueda.workflow.serializers import StateSerializer
from vueda.workflow.serializers import TransitionSerializer


EXPAND_PARAM = settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]


class WorkflowErrorSerializer(serializers.Serializer):
    detail = serializers.CharField()
    serverStack = serializers.CharField(help_text="The exception, with its traceback when `DEBUG` is on.")  # noqa: N815


class ObjectStateSerializer(serializers.Serializer):
    state = StateSerializer()
    object_state_revision = serializers.CharField(
        required=False, help_text="Present when the object has workflow history."
    )


class TransitionResultStateSerializer(serializers.Serializer):
    code = serializers.CharField()
    name = serializers.CharField()
    object_state_revision = serializers.CharField(
        required=False, help_text="Present when the transition recorded workflow history."
    )


class TransitionResultSerializer(serializers.Serializer):
    new_state = TransitionResultStateSerializer(help_text="The state the object moved to.")
    new_transitions = TransitionSerializer(many=True, help_text="Transitions available from the new state.")


class BulkTransitionObjectSerializer(serializers.Serializer):
    state = StateSerializer(
        allow_null=True,
        help_text="The object's state when the request arrived. Null when the object has no state.",
    )
    new_state = TransitionResultStateSerializer(
        required=False, help_text="The state that the object moved to. Present only in a 200 response."
    )
    new_transitions = TransitionSerializer(
        many=True,
        required=False,
        help_text="Transitions available from the new state. Present only in a 200 response.",
    )
    errors = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text="Why the object cannot take the transition. Present only for a refused object in a 400 response.",
    )
    already_in_target_state = serializers.BooleanField(
        required=False,
        help_text=(
            "True when the object was refused because it is already in the target state. Present only for such an "
            "object in a 400 response."
        ),
    )
    locked = serializers.BooleanField(
        required=False,
        help_text=(
            "True when another request held the object's row lock, so the same request can succeed later. Present "
            "only for such an object in a 400 response."
        ),
    )


class BulkTransitionResultSerializer(serializers.Serializer):
    target_state = StateSerializer(help_text="The state that the transition moves each object to.")
    objects = serializers.DictField(
        child=BulkTransitionObjectSerializer(), help_text="One entry for each object, keyed by object id."
    )


class ExecuteTransitionRequestSerializer(serializers.Serializer):
    transition_code = serializers.CharField(help_text="Code of the transition to apply.")


class BulkExecuteTransitionRequestSerializer(ExecuteTransitionRequestSerializer):
    object_ids = serializers.ListField(
        child=serializers.JSONField(), help_text="Primary keys of the objects to transition."
    )


EXECUTE_TRANSITION_REQUEST_EXAMPLES = [
    conditional_open_api_example(
        "ExecuteTransitionRequestExample",
        summary="Execute Transition",
        description="uri: /routes"
        + "/vueda.workflow/workflows&ZeroWidthSpace;/store/customerorder/execute-transition/1/",
        value={"transition_code": "pack_order"},
    ),
]

BULK_EXECUTE_TRANSITION_REQUEST_EXAMPLES = [
    conditional_open_api_example(
        "ExecuteTransitionBulkRequestExample",
        summary="Bulk Execute Transition",
        description="uri: "
        + "/routes/vueda.workflow/workflows&ZeroWidthSpace;/store/customerorder/execute-transition/",
        value={"transition_code": "pack_order", "object_ids": ["1", "2"]},
    ),
]

LIST_EXAMPLES = [
    # A list example is one item; drf-spectacular wraps it in the pagination envelope.
    conditional_open_api_example(
        "ListWorkflowsExample",
        summary="Workflows exist",
        description="uri: /routes/vueda.workflow/workflows/",
        value={
            "code": "order_fulfillment",
            "name": "Order Fulfillment",
            "app_label": "store",
            "model": "customerorder",
        },
    ),
]

LIST_403_EXAMPLES = [
    conditional_open_api_example(
        "ListWorkflowPermissionDeniedExample",
        summary="Permission denied",
        description="uri: /routes/vueda.workflow/workflows/",
        value={
            "detail": "You do not have permission to perform this action.",
            "serverStack": open_api_tracebacks.WORKFLOW_DENIED,
        },
    ),
]

RETRIEVE_EXAMPLES = [
    conditional_open_api_example(
        "GetWorkflowExample",
        summary="Get Customer Order",
        description="uri: /routes/vueda.workflow/workflows&ZeroWidthSpace;/store/customerorder/",
        value={
            "code": "order_fulfillment",
            "name": "Order Fulfillment",
            "app_label": "store",
            "model": "customerorder",
        },
    ),
    conditional_open_api_example(
        "GetWorkflowWithExpandableStateAndTransitionExample",
        summary="Get Customer Order (Expanded)",
        description=(
            "uri: /routes/vueda.workflow/workflows&ZeroWidthSpace;/store/customerorder/?&ZeroWidthSpace;"
            f"{EXPAND_PARAM}=states&amp;{EXPAND_PARAM}=transitions"
        ),
        value={
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
    ),
]

RETRIEVE_403_EXAMPLES = [
    conditional_open_api_example(
        "GetWorkflowPermissionDeniedExample",
        summary="Permission denied",
        description="uri: /routes/vueda.workflow/workflows&ZeroWidthSpace;/store/customer/",
        value={
            "detail": "You do not have permission to perform this action.",
            "serverStack": open_api_tracebacks.WORKFLOW_DENIED,
        },
    ),
]

RETRIEVE_404_EXAMPLES = [
    conditional_open_api_example(
        "InvalidWorkflowExample",
        summary="Invalid workflow",
        description="uri: /routes/vueda.workflow/workflows&ZeroWidthSpace;/store/invalidmodel/",
        value={"detail": "No Workflow matches the given query.", "serverStack": open_api_tracebacks.WORKFLOW_INVALID},
    ),
]

OBJECT_STATE_EXAMPLES = [
    conditional_open_api_example(
        "GetObjectStateHistoryExample",
        summary="Object With History",
        description="uri: /routes/vueda.workflow/workflows&ZeroWidthSpace;/store/customerorder/",
        value={
            "state": {"code": "order_packed", "name": "Order Packed"},
            "object_state_revision": "vueda_workflow.ObjectState:1234",
        },
    ),
    conditional_open_api_example(
        "GetObjectStateExample",
        summary="Object Without History",
        description="uri: /routes/vueda.workflow/workflows&ZeroWidthSpace;/store/customerorder/",
        value={"state": {"code": "order_shipped", "name": "Order Shipped"}},
    ),
]

OBJECT_STATE_403_EXAMPLES = [
    conditional_open_api_example(
        "GetObjectStateInvalidExample",
        summary="Permission Denied",
        description="uri: /routes" + "/vueda.workflow/workflows&ZeroWidthSpace;/store/customer/object-state/1/",
        value={
            "detail": "You do not have permission to perform this action.",
            "serverStack": open_api_tracebacks.WORKFLOW_DENIED,
        },
    ),
]

OBJECT_STATE_404_EXAMPLES = [
    conditional_open_api_example(
        "GetObjectStateInvalidWorkflowExample",
        summary="Invalid workflow",
        description="uri: /routes/vueda.workflow" + "/workflows&ZeroWidthSpace;/store/invalidmodel/object-state/1/",
        value={"detail": "No Workflow matches the given query.", "serverStack": open_api_tracebacks.WORKFLOW_INVALID},
    ),
    conditional_open_api_example(
        "GetObjectStateInvalidCustomerOrderExample",
        summary="invalid object pk",
        description="uri: /routes/vueda.workflow" + "/workflows&ZeroWidthSpace;/store/customerorder/object-state/1/",
        value={
            "detail": "No CustomerOrder matches the given query.",
            "serverStack": open_api_tracebacks.CUSTOMER_ORDER_INVALID,
        },
    ),
]

OBJECT_TRANSITIONS_EXAMPLES = [
    # A list example is one item; drf-spectacular wraps it in a list.
    conditional_open_api_example(
        "ListObjectTransitionsExample",
        summary="Object Transitions",
        description="uri: /routes"
        + "/vueda.workflow/workflows&ZeroWidthSpace;/store/customerorder/object-transitions/1/",
        value={"code": "pack_order", "name": "Pack Order"},
    ),
]

OBJECT_TRANSITIONS_403_EXAMPLES = [
    conditional_open_api_example(
        "ListObjectTransitionsDeniedExample",
        summary="Permission denied",
        description="uri: /routes/vueda.workflow/workflows&ZeroWidthSpace;/store/customer/",
        value={
            "detail": "You do not have permission to perform this action.",
            "serverStack": open_api_tracebacks.WORKFLOW_DENIED,
        },
    ),
]

OBJECT_TRANSITIONS_404_EXAMPLES = [
    conditional_open_api_example(
        "ListObjectTransitionsInvalidWorkflowExample",
        summary="Invalid workflow",
        description="uri: /routes/vueda.workflow"
        + "/workflows&ZeroWidthSpace;/store/invalidmodel/object-transitions/1/",
        value={"detail": "No Workflow matches the given query.", "serverStack": open_api_tracebacks.WORKFLOW_INVALID},
    ),
    conditional_open_api_example(
        "ListObjectTransitionsInvalidCustomerOrderExample",
        summary="Invalid object pk",
        description="uri: /routes/vueda.workflow"
        + "/workflows&ZeroWidthSpace;/store/customerorder/object-transitions/1/",
        value={
            "detail": "No CustomerOrder matches the given query.",
            "serverStack": open_api_tracebacks.CUSTOMER_ORDER_INVALID,
        },
    ),
]

EXECUTE_TRANSITION_EXAMPLES = [
    conditional_open_api_example(
        "ExecuteTransitionResponseExample",
        summary="Execute Transition",
        description="uri: /routes"
        + "/vueda.workflow/workflows&ZeroWidthSpace;/store/customerorder/execute-transition/1/",
        value={
            "new_state": {"code": "packed", "name": "Packed", "object_state_revision": "vueda_workflow.ObjectState:2"},
            "new_transitions": [
                {"code": "cancel_order", "name": "Cancel Order"},
                {"code": "ship_order", "name": "Ship Order"},
            ],
        },
    ),
]

BULK_EXECUTE_TRANSITION_EXAMPLES = [
    conditional_open_api_example(
        "ExecuteTransitionBulkResponseExample",
        summary="Execute Bulk Transition",
        description="uri: /routes"
        + "/vueda.workflow/workflows&ZeroWidthSpace;/store/customerorder/execute-transition/",
        value={
            "target_state": {"code": "packed", "name": "Packed"},
            "objects": {
                "1": {
                    "state": {"code": "new", "name": "New"},
                    "new_state": {
                        "code": "packed",
                        "name": "Packed",
                        "object_state_revision": "vueda_workflow.ObjectState:3",
                    },
                    "new_transitions": [
                        {"code": "cancel_order", "name": "Cancel Order"},
                        {"code": "ship_order", "name": "Ship Order"},
                    ],
                },
                "2": {
                    "state": {"code": "new", "name": "New"},
                    "new_state": {
                        "code": "packed",
                        "name": "Packed",
                        "object_state_revision": "vueda_workflow.ObjectState:4",
                    },
                    "new_transitions": [
                        {"code": "cancel_order", "name": "Cancel Order"},
                        {"code": "ship_order", "name": "Ship Order"},
                    ],
                },
            },
        },
    ),
]

BULK_EXECUTE_TRANSITION_400_EXAMPLES = [
    conditional_open_api_example(
        "ExecuteTransitionBulkRefusedExample",
        summary="Objects that cannot take the transition",
        description="uri: /routes"
        + "/vueda.workflow/workflows&ZeroWidthSpace;/store/customerorder/execute-transition/",
        value={
            "target_state": {"code": "packed", "name": "Packed"},
            "objects": {
                "1": {"state": {"code": "new", "name": "New"}},
                "2": {
                    "state": {"code": "shipped", "name": "Shipped"},
                    "errors": ["Pack Order is not available from the Shipped state."],
                },
                "3": {
                    "state": {"code": "packed", "name": "Packed"},
                    "errors": ["Already in the Packed state."],
                    "already_in_target_state": True,
                },
            },
        },
    ),
    conditional_open_api_example(
        "ExecuteTransitionBulkLockedExample",
        summary="Another request held an object's row lock",
        description="uri: /routes"
        + "/vueda.workflow/workflows&ZeroWidthSpace;/store/customerorder/execute-transition/",
        value={
            "target_state": {"code": "packed", "name": "Packed"},
            "objects": {
                "1": {"state": {"code": "new", "name": "New"}},
                "2": {
                    "state": {"code": "new", "name": "New"},
                    "errors": ["This object cannot be updated right now. Please try again."],
                    "locked": True,
                },
            },
        },
    ),
]

EXECUTE_TRANSITION_403_EXAMPLES = [
    conditional_open_api_example(
        "ExecuteTransitionWorkflowPermissionDeniedExample",
        summary="Permission denied",
        description="uri: /routes/vueda.workflow/workflows&ZeroWidthSpace;/store/customer/",
        value={
            "detail": "You do not have permission to perform this action.",
            "serverStack": open_api_tracebacks.WORKFLOW_DENIED,
        },
    ),
]

EXECUTE_TRANSITION_404_EXAMPLES = [
    conditional_open_api_example(
        "ExecuteTransitionInvalidWorkflowExample",
        summary="Invalid workflow",
        description="uri: /routes/vueda.workflow"
        + "/workflows&ZeroWidthSpace;/store/invalidmodel/object-transitions/1/",
        value={"detail": "No Workflow matches the given query.", "serverStack": open_api_tracebacks.WORKFLOW_INVALID},
    ),
    conditional_open_api_example(
        "ExecuteTransitionInvalidCustomerOrderExample",
        summary="Invalid object pk",
        description="uri: /routes/vueda.workflow"
        + "/workflows&ZeroWidthSpace;/store/customerorder/object-transitions/1/",
        value={
            "detail": "No CustomerOrder matches the given query.",
            "serverStack": open_api_tracebacks.CUSTOMER_ORDER_INVALID,
        },
    ),
]


try:
    from vueda.core.open_api import VuedaAutoSchema
except ImportError:  # drf-spectacular is not installed.
    EXECUTE_TRANSITION_ACTION_KWARGS = {}
else:

    class ExecuteTransitionAutoSchema(VuedaAutoSchema):
        """
        Schema for ``WorkflowViewSet.execute_transition``, which serves two routes.

        With an ``object_id`` the action transitions one object and returns its result. Without one it
        transitions ``object_ids`` and returns each result keyed by object id. One ``extend_schema`` cannot
        describe both, since it applies to the action rather than the route.
        """

        def _is_bulk_route(self):
            return "{object_id}" not in self.path

        def get_request_serializer(self):
            if self._is_bulk_route():
                return conditional_open_api_request(
                    BulkExecuteTransitionRequestSerializer, examples=BULK_EXECUTE_TRANSITION_REQUEST_EXAMPLES
                )
            return conditional_open_api_request(
                ExecuteTransitionRequestSerializer, examples=EXECUTE_TRANSITION_REQUEST_EXAMPLES
            )

        def get_response_serializers(self):
            if self._is_bulk_route():
                ok = conditional_open_api_response(
                    BulkTransitionResultSerializer,
                    description="The target state, and each object's state and result, keyed by object id.",
                    examples=BULK_EXECUTE_TRANSITION_EXAMPLES,
                )
                # A refused object gives the run's own shape, with errors on that object's entry. A
                # missing, unknown, or malformed request field gives that field's errors instead.
                bad_request = conditional_open_api_response(
                    conditional_open_api_types().OBJECT,
                    description=(
                        "When an object cannot take the transition, the body has the 200 response's shape, and"
                        " the refused object's entry holds `errors`. A missing or unknown `transition_code`, or"
                        " an `object_ids` value that is not a list, gives that field's errors instead."
                    ),
                    examples=BULK_EXECUTE_TRANSITION_400_EXAMPLES,
                )
            else:
                ok = conditional_open_api_response(TransitionResultSerializer, examples=EXECUTE_TRANSITION_EXAMPLES)
                # A validation error: a missing transition_code, or the object cannot take the transition.
                bad_request = conditional_open_api_types().OBJECT
            return {
                200: ok,
                400: bad_request,
                403: conditional_open_api_response(WorkflowErrorSerializer, examples=EXECUTE_TRANSITION_403_EXAMPLES),
                404: conditional_open_api_response(WorkflowErrorSerializer, examples=EXECUTE_TRANSITION_404_EXAMPLES),
            }

    EXECUTE_TRANSITION_ACTION_KWARGS = {"schema": ExecuteTransitionAutoSchema}
