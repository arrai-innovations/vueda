# These are here, to keep them out of the serializer.  Less messy.
SITE_PACKAGES_PATH = "/home/user/.local/share/virtualenvs/vueda-server/lib/python3.11/site-packages"
VUEDA_SERVER_PATH = "/home/user/projects/vueda-server"


INFO_DENIED = f"""Traceback (most recent call last):
  File "{SITE_PACKAGES_PATH}/rest_framework/views.py", line 497, in dispatch
    self.initial(request, *args, **kwargs)
  File "{SITE_PACKAGES_PATH}/rest_framework/views.py", line 415, in initial
    self.check_permissions(request)
  File "{SITE_PACKAGES_PATH}/rest_framework/views.py", line 333, in check_permissions
    self.permission_denied(
  File "{SITE_PACKAGES_PATH}/rest_framework/views.py", line 175, in permission_denied
    raise exceptions.PermissionDenied(detail=message, code=code)
rest_framework.exceptions.PermissionDenied: You do not have permission to perform this action."""


INFO_INVALID_CONTENT_TYPE = f"""Traceback (most recent call last):
  File "{SITE_PACKAGES_PATH}/rest_framework/views.py", line 497, in dispatch
    self.initial(request, *args, **kwargs)
  File "{VUEDA_SERVER_PATH}/vueda/info/viewsets.py", line 54, in initial
    raise Http404(f\'Unable to find the content type "{{self.kwargs["app_label"]}}.{{self.kwargs["model"]}}".\')
django.http.response.Http404: Unable to find the content type "store.pets"."""


INFO_INVALID_FIELD = f"""Traceback (most recent call last):
  File "{SITE_PACKAGES_PATH}/rest_framework/views.py", line 506, in dispatch
    response = handler(request, *args, **kwargs)
               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "{SITE_PACKAGES_PATH}/rest_framework/mixins.py", line 38, in list
    queryset = self.filter_queryset(self.get_queryset())
                                    ^^^^^^^^^^^^^^^^^^^
  File "{VUEDA_SERVER_PATH}/vueda/info/viewsets.py", line 217, in get_queryset
    self.validate_queryset(serializer, fields)
  File "{VUEDA_SERVER_PATH}/vueda/info/viewsets.py", line 182, in validate_queryset
    raise VuedaValidationError(
vueda.core.exceptions.VuedaValidationError: ["Invalid field \'tangible_type\'. Valid fields with choices are user."]"""


INFO_CHOICES_DENIED = f"""Traceback (most recent call last):
  File "{SITE_PACKAGES_PATH}/rest_framework/views.py", line 497, in dispatch
    self.initial(request, *args, **kwargs)
  File "{SITE_PACKAGES_PATH}/rest_framework/views.py", line 415, in initial
    self.check_permissions(request)
  File "{VUEDA_SERVER_PATH}/vueda/info/viewsets.py", line 116, in check_permissions
    self.permission_denied(
  File "{SITE_PACKAGES_PATH}/rest_framework/views.py", line 175, in permission_denied
    raise exceptions.PermissionDenied(detail=message, code=code)
rest_framework.exceptions.PermissionDenied: You do not have permission to perform this action."""


INFO_CHOICES_INVALID_CONTENT_TYPE = f"""Traceback (most recent call last):
  File "{SITE_PACKAGES_PATH}/rest_framework/views.py", line 497, in dispatch
    self.initial(request, *args, **kwargs)
  File "{VUEDA_SERVER_PATH}/vueda/info/viewsets.py", line 153, in initial
    raise Http404(f\'Unable to find the content type "{{self.choices_app_label}}.{{self.choices_model}}".\')
django.http.response.Http404: Unable to find the content type "store.pets"."""


INFO_CHOICES_INVALID_FIELD = f"""
Traceback (most recent call last):
  File "{SITE_PACKAGES_PATH}/rest_framework/views.py", line 506, in dispatch
    response = handler(request, *args, **kwargs)
               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "{SITE_PACKAGES_PATH}/rest_framework/mixins.py", line 38, in list
    queryset = self.filter_queryset(self.get_queryset())
                                    ^^^^^^^^^^^^^^^^^^^
  File "{VUEDA_SERVER_PATH}/vueda/info/viewsets.py", line 227, in get_queryset
    self.validate_queryset(serializer, fields)
  File "{VUEDA_SERVER_PATH}/vueda/info/viewsets.py", line 192, in validate_queryset
    raise VuedaValidationError(
vueda.core.exceptions.VuedaValidationError: ["Invalid field \'tangible_type\'. Valid fields with choices are user."]"""
