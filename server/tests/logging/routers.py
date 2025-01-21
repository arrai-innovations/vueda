from tests.logging.viewsets import LogRecordsViewSet
from vueda.core.routers import VuedaRouter


logging_router = VuedaRouter()
logging_router.register("log_records", LogRecordsViewSet)

urlpatterns = logging_router.urls
