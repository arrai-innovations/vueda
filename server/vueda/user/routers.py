"""URL router wiring for the user API endpoints."""

__all__ = (
    "router",
    "urlpatterns",
)

from vueda.core.routers import VuedaRouter
from vueda.user.viewsets import TOTPDeviceViewSet


router = VuedaRouter()
router.register(r"totpdevice", TOTPDeviceViewSet)
urlpatterns = router.urls
