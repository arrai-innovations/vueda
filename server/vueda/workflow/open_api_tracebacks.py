# These are here, to keep them out of the serializer.  Less messy.
SITE_PACKAGES_PATH = "/home/user/.local/share/virtualenvs/vueda-server/lib/python3.11/site-packages"
VUEDA_SERVER_PATH = "/home/user/projects/vueda-server"


WORKFLOW_DENIED = f"""'Traceback (most recent call last):
  File "{SITE_PACKAGES_PATH}/rest_framework/views.py", line 497, in dispatch
    self.initial(request, *args, **kwargs)
  File "{SITE_PACKAGES_PATH}/rest_framework/views.py", line 415, in initial
    self.check_permissions(request)
  File "{VUEDA_SERVER_PATH}/vueda/workflow/viewsets.py", line 46, in check_permissions
    raise PermissionDenied("You do not have permission to perform this action.")
rest_framework.exceptions.PermissionDenied: You do not have permission to perform this action."""


WORKFLOW_INVALID = f"""Traceback (most recent call last):
  File "{SITE_PACKAGES_PATH}/django/shortcuts.py", line 86, in get_object_or_404
    return queryset.get(*args, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "{SITE_PACKAGES_PATH}/django/db/models/query.py", line 649, in get
    raise self.model.DoesNotExist(
vueda.workflow.models.Workflow.DoesNotExist: Workflow matching query does not exist.

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "{SITE_PACKAGES_PATH}/rest_framework/views.py", line 506, in dispatch
    response = handler(request, *args, **kwargs)
               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "{VUEDA_SERVER_PATH}/vueda/core/decorators.py", line 15, in wrapped_func
    return func(*args, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^
  File "{VUEDA_SERVER_PATH}/vueda/workflow/viewsets.py", line 54, in object_state
    instance = self.get_object()
               ^^^^^^^^^^^^^^^^^
  File "{VUEDA_SERVER_PATH}/vueda/workflow/viewsets.py", line 35, in get_object
    return get_object_or_404(self.get_workflow().content_type.model_class(), pk=self.kwargs["object_id"])
                                    ^^^^^^^^^^^^^^^^^^^
  File "{VUEDA_SERVER_PATH}/vueda/workflow/viewsets.py", line 29, in get_workflow
    return get_object_or_404(
           ^^^^^^^^^^^^^^^^^^
  File "{SITE_PACKAGES_PATH}/rest_framework/generics.py", line 19, in get_object_or_404
    return _get_object_or_404(queryset, *filter_args, **filter_kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "{SITE_PACKAGES_PATH}/django/shortcuts.py", line 88, in get_object_or_404
    raise Http404(
django.http.response.Http404: No Workflow matches the given query."""


CUSTOMER_ORDER_INVALID = f"""Traceback (most recent call last):
  File "{SITE_PACKAGES_PATH}/django/shortcuts.py", line 86, in get_object_or_404
    return queryset.get(*args, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "{SITE_PACKAGES_PATH}/django/db/models/query.py", line 649, in get
    raise self.model.DoesNotExist(
tests.store.models.CustomerOrder.DoesNotExist: CustomerOrder matching query does not exist.

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "{SITE_PACKAGES_PATH}/rest_framework/views.py", line 506, in dispatch
    response = handler(request, *args, **kwargs)
               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "{VUEDA_SERVER_PATH}/vueda/core/decorators.py", line 12, in wrapped_func
    return func(*args, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^
  File "{VUEDA_SERVER_PATH}/vueda/workflow/viewsets.py", line 98, in object_state
    instance = self.get_object()
               ^^^^^^^^^^^^^^^^^
  File "{VUEDA_SERVER_PATH}/vueda/workflow/viewsets.py", line 37, in get_object
    return get_object_or_404(self.get_workflow().content_type.model_class(), pk=self.kwargs["object_id"])
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "{SITE_PACKAGES_PATH}/rest_framework/generics.py", line 19, in get_object_or_404
    return _get_object_or_404(queryset, *filter_args, **filter_kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "{SITE_PACKAGES_PATH}/django/shortcuts.py", line 88, in get_object_or_404
    raise Http404(
django.http.response.Http404: No CustomerOrder matches the given query."""
