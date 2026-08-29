"""URL router for optional VUEDA app boundary tests."""

from tests.optional_apps.viewsets import TicketViewSet
from vueda.core.routers import VuedaRouter


router = VuedaRouter()
router.register("tickets", TicketViewSet)
urlpatterns = router.urls
