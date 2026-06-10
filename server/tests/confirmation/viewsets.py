from rest_framework.permissions import AllowAny

import tests.confirmation.models as my_models
import tests.confirmation.serializers as my_serializers
from vueda.core.viewsets import VuedaViewSet


class ThingViewSet(VuedaViewSet):
    queryset = my_models.Thing.objects.all()
    serializer_class = my_serializers.ThingSerializer
    permission_classes = (AllowAny,)
