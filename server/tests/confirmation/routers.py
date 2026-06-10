from tests.confirmation.viewsets import GadgetViewSet
from tests.confirmation.viewsets import ThingViewSet
from vueda.core.routers import VuedaRouter


confirmation_router = VuedaRouter()
confirmation_router.register("things", ThingViewSet)
confirmation_router.register("gadgets", GadgetViewSet)

urlpatterns = confirmation_router.urls
