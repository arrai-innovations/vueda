import tests.logging.models as my_models
import tests.logging.serializers as my_serializers
from vueda.core.viewsets import VuedaViewSet


class LogRecordsViewSet(VuedaViewSet):
    queryset = my_models.LogRecords.objects.all()
    serializer_class = my_serializers.LogRecordsSerializer
