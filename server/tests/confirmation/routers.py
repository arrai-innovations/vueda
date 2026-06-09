from tests.confirmation.viewsets import ThingViewSet
from vueda.core.routers import VuedaRouter


confirmation_router = VuedaRouter()
confirmation_router.register("things", ThingViewSet)

urlpatterns = confirmation_router.urls
