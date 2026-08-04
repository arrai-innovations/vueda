from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

import tests.confirmation.models as my_models
import tests.confirmation.serializers as my_serializers
from vueda.core.decorators import action
from vueda.core.exceptions import VuedaValidationError
from vueda.core.exceptions import gate_warnings
from vueda.core.viewsets import DeactivateActionViewSetMixin
from vueda.core.viewsets import VuedaViewSet


class ThingViewSet(VuedaViewSet):
    queryset = my_models.Thing.objects.all()
    serializer_class = my_serializers.ThingSerializer
    permission_classes = (AllowAny,)

    def destroy_validation(self, objs):
        # A blocking error: returns 400 before the destroy warning gate is reached.
        errors = {obj.pk: ["This Thing may not be deleted."] for obj in objs if obj.name == "undeletable"}
        if errors:
            raise VuedaValidationError(errors)

    def get_warnings(self, action, objs):
        # Viewset-level warnings: destroying a thing that still has a positive count is unusual.
        if action == "destroy":
            flagged = sorted(obj.name for obj in objs if obj.count > 0)
            if flagged:
                return {"non_field_errors": [f"{name} still has a positive count." for name in flagged]}
        return {}

    @action(detail=True, methods=["post"], confirm=True)
    def reset_count(self, request, pk=None):
        # An input-less consequence action; the confirm=True gate runs before this body.
        instance = self.get_object()
        instance.count = 0
        instance.save()
        return Response({"detail": "Count reset."}, status=status.HTTP_200_OK)

    reset_count.confirm_message = "Resetting the count cannot be undone."

    @action(detail=True, methods=["post"], confirm=True)
    def clear_name(self, request, pk=None):
        # No confirm_message set; the framework default message gates this body.
        instance = self.get_object()
        instance.name = ""
        instance.save()
        return Response({"detail": "Name cleared."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def adjust_count(self, request, pk=None):
        # An action with input: gate explicitly after is_valid so 400s precede the 409.
        instance = self.get_object()
        serializer = my_serializers.AdjustCountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        amount = serializer.validated_data["amount"]
        warnings = {}
        if instance.count + amount < 0:
            warnings["amount"] = ["This adjustment makes the count negative."]
        gate_warnings(request, warnings)
        instance.count += amount
        instance.save()
        return Response({"count": instance.count}, status=status.HTTP_200_OK)


class GadgetViewSet(DeactivateActionViewSetMixin, VuedaViewSet):
    queryset = my_models.Gadget.objects.all()
    serializer_class = my_serializers.GadgetSerializer
    permission_classes = (AllowAny,)

    def get_warnings(self, action, objs):
        # Viewset-level warnings: toggling a critical gadget deserves a second look.
        if action in ("activate", "deactivate"):
            flagged = sorted(obj.name for obj in objs if obj.name.startswith("critical"))
            if flagged:
                return {"non_field_errors": [f"{name} is critical." for name in flagged]}
        return {}
