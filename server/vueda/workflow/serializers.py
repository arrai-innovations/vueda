from django.conf import settings
from rest_flex_fields.serializers import FlexFieldsSerializerMixin
from rest_framework import serializers as drf_serializers

from vueda.core.serializers import VuedaExpandableFieldsSerializerMixin
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

    def customize_schema_response_data(self, response_data):
        site_packages_path = 'File "/home/user/.local/share/virtualenvs/vueda-server/lib/python3.11/site-packages'
        vueda_server_path = 'File "/home/user/projects/vueda-server'

        request = self.context["request"]

        # Things we want to modify.
        for status_code, data in response_data.items():
            match (request.method, request.path, status_code):
                case ("GET", "/routes/vueda.workflow/workflows/", "200"):  # List workflows
                    data["content"]["application/json"]["examples"] = {
                        "ListWorkflowsExample": {
                            "summary": "Workflows exist",
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
                            "value": {
                                "perPage": settings.MAX_PAGE_SIZE,
                                "totalPages": 0,
                                "totalRecords": 0,
                                "results": [],
                            },
                        },
                    }

                case ("GET", "/routes/vueda.workflow/workflows/{app_label}/{model}/", "200"):  # Get workflow
                    data["content"]["application/json"]["examples"] = {
                        "GetWorkflowExample": {
                            "summary": "Valid Workflow",
                            "value": {
                                "code": "pack_order",
                                "name": "Pack Order",
                                "app_label": "store",
                                "model": "customerorder",
                            },
                        },
                    }

                case (
                    "GET",
                    "/routes/vueda.workflow/workflows/{app_label}/{model}/object-state/{object_id}/",
                    "200",
                ):  # Get object state
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
                            "value": {
                                "state": {
                                    "code": "order_shipped",
                                    "name": "Order Shipped",
                                }
                            },
                        },
                    }

        # Things we need to add - error responses.
        match (request.method, request.path):
            case ("GET", "/routes/vueda.workflow/workflows/{app_label}/{model}/"):  # Get workflow
                tb_denied = f"""Traceback (most recent call last):
  {site_packages_path}/rest_framework/views.py", line 497, in dispatch
    self.initial(request, *args, **kwargs)
  {site_packages_path}/rest_framework/views.py", line 415, in initial
    self.check_permissions(request)
  {vueda_server_path}/vueda/workflow/viewsets.py", line 48, in check_permissions
    raise PermissionDenied("You do not have permission to perform this action.")
rest_framework.exceptions.PermissionDenied: You do not have permission to perform this action."""
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
                                "InvalidWorkflowExample": {
                                    "summary": "Invalid workflow",
                                    "value": {
                                        "detail": "You do not have permission to perform this action.",
                                        "serverStack": tb_denied,
                                    },
                                },
                            },
                        }
                    }
                }

                tb_invalid = f"""Traceback (most recent call last):
  {site_packages_path}/django/shortcuts.py", line 86, in get_object_or_404
    return queryset.get(*args, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  {site_packages_path}/django/db/models/query.py", line 649, in get
    raise self.model.DoesNotExist(
vueda.workflow.models.Workflow.DoesNotExist: Workflow matching query does not exist.

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  {site_packages_path}/rest_framework/views.py", line 506, in dispatch
    response = handler(request, *args, **kwargs)
               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  {site_packages_path}/rest_framework/mixins.py", line 54, in retrieve
    instance = self.get_object()
               ^^^^^^^^^^^^^^^^^
  {vueda_server_path}/vueda/workflow/viewsets.py", line 39, in get_object
    return self.get_workflow()
           ^^^^^^^^^^^^^^^^^^^
  {vueda_server_path}/vueda/workflow/viewsets.py", line 31, in get_workflow
    return get_object_or_404(
           ^^^^^^^^^^^^^^^^^^
  {site_packages_path}/rest_framework/generics.py", line 19, in get_object_or_404
    return _get_object_or_404(queryset, *filter_args, **filter_kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  {site_packages_path}/django/shortcuts.py", line 88, in get_object_or_404
    raise Http404(
django.http.response.Http404: No Workflow matches the given query."""
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
                                    "value": {
                                        "detail": "No Workflow matches the given query.",
                                        "serverStack": tb_invalid,
                                    },
                                },
                            },
                        }
                    }
                }

            # Get object state
            case "GET", "/routes/vueda.workflow/workflows/{app_label}/{model}/object-state/{object_id}/":
                tb_denied = """Traceback (most recent call last):
  {site_packages_path}/rest_framework/views.py", line 497, in dispatch
    self.initial(request, *args, **kwargs)
  {site_packages_path}/rest_framework/views.py", line 415, in initial
    self.check_permissions(request)
  {vueda_server_path}/vueda/workflow/viewsets.py", line 48, in check_permissions
    raise PermissionDenied("You do not have permission to perform this action.")
rest_framework.exceptions.PermissionDenied: You do not have permission to perform this action."""
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
                                "InvalidStateExample": {
                                    "summary": "Invalid workflow",
                                    "value": {
                                        "detail": "You do not have permission to perform this action.",
                                        "serverStack": tb_denied,
                                    },
                                },
                            },
                        }
                    }
                }

                tb_invalid_workflow = f"""Traceback (most recent call last):
  {site_packages_path}/django/shortcuts.py", line 86, in get_object_or_404
    return queryset.get(*args, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  {site_packages_path}/django/db/models/query.py", line 649, in get
    raise self.model.DoesNotExist(
vueda.workflow.models.Workflow.DoesNotExist: Workflow matching query does not exist.

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  {site_packages_path}/rest_framework/views.py", line 506, in dispatch
    response = handler(request, *args, **kwargs)
               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  {vueda_server_path}/vueda/core/decorators.py", line 12, in wrapped_func
    return func(*args, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^
  {vueda_server_path}/vueda/workflow/viewsets.py", line 98, in object_state
    instance = self.get_object()
               ^^^^^^^^^^^^^^^^^
  {vueda_server_path}/vueda/workflow/viewsets.py", line 37, in get_object
    return get_object_or_404(self.get_workflow().content_type.model_class(), pk=self.kwargs["object_id"])
                             ^^^^^^^^^^^^^^^^^^^
  {vueda_server_path}/vueda/workflow/viewsets.py", line 31, in get_workflow
    return get_object_or_404(
           ^^^^^^^^^^^^^^^^^^
  {site_packages_path}/rest_framework/generics.py", line 19, in get_object_or_404
    return _get_object_or_404(queryset, *filter_args, **filter_kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  {site_packages_path}/django/shortcuts.py", line 88, in get_object_or_404
    raise Http404(
django.http.response.Http404: No Workflow matches the given query."""
                tb_invalid_customerorder = f"""Traceback (most recent call last):
  {site_packages_path}/django/shortcuts.py", line 86, in get_object_or_404
    return queryset.get(*args, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  {site_packages_path}/django/db/models/query.py", line 649, in get
    raise self.model.DoesNotExist(
tests.store.models.CustomerOrder.DoesNotExist: CustomerOrder matching query does not exist.

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  {site_packages_path}/rest_framework/views.py", line 506, in dispatch
    response = handler(request, *args, **kwargs)
               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  {vueda_server_path}/vueda/core/decorators.py", line 12, in wrapped_func
    return func(*args, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^
  {vueda_server_path}/vueda/workflow/viewsets.py", line 98, in object_state
    instance = self.get_object()
               ^^^^^^^^^^^^^^^^^
  {vueda_server_path}/vueda/workflow/viewsets.py", line 37, in get_object
    return get_object_or_404(self.get_workflow().content_type.model_class(), pk=self.kwargs["object_id"])
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  {site_packages_path}/rest_framework/generics.py", line 19, in get_object_or_404
    return _get_object_or_404(queryset, *filter_args, **filter_kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  {site_packages_path}/django/shortcuts.py", line 88, in get_object_or_404
    raise Http404(
django.http.response.Http404: No CustomerOrder matches the given query."""
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
                                    "value": {
                                        "detail": "No Workflow matches the given query.",
                                        "serverStack": tb_invalid_workflow,
                                    },
                                },
                                "InvalidCustomerOrderExample": {
                                    "summary": "Invalid customer order pk",
                                    "value": {
                                        "detail": "No CustomerOrder matches the given query.",
                                        "serverStack": tb_invalid_customerorder,
                                    },
                                },
                            },
                        }
                    }
                }
