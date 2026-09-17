"""Base views for endpoints that select their model from URL arguments."""

__all__ = ("DynamicObjectView",)

from django.contrib.contenttypes.models import ContentType
from rest_framework.generics import get_object_or_404
from rest_framework.views import APIView

from vueda.core.permissions import DynamicObjectPermissions


class DynamicObjectView(APIView):
    """
    APIView helper for endpoints that operate on arbitrary registered models.

    The request names its target through ``app_label``, ``model``, and an optional ``object_id``.
    Resolving an object checks that object's permissions, so an endpoint reads the object's data
    only after the object itself has admitted the caller.
    """

    permission_classes = [DynamicObjectPermissions]

    def get_queryset(self):
        app_label = self.kwargs.get("app_label")
        model = self.kwargs.get("model")
        content_type = get_object_or_404(ContentType, app_label=app_label, model=model.replace("_", ""))
        return content_type.model_class().objects.all()

    def resolves_object(self) -> bool:
        """Whether this request names a concrete object, which ``get_object`` then checks."""
        return self.kwargs.get("object_id") is not None

    def get_object(self):
        """Return the object the request names, or ``None``, after checking its permissions."""
        if not self.resolves_object():
            return None
        obj = get_object_or_404(self.get_queryset(), pk=self.kwargs["object_id"])
        self.check_object_permissions(self.request, obj)
        return obj

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        self.object = self.get_object()
