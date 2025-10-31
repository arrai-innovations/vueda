from vueda.core.routers import VuedaRouter
from vueda.user.viewsets import TOTPDeviceViewSet


router = VuedaRouter()
router.register(r"totpdevice", TOTPDeviceViewSet)
urlpatterns = router.urls
