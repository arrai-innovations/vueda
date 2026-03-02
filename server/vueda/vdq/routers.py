"""URL router configuration for the VDQ viewsets."""

__all__ = (
    "router",
    "urlpatterns",
)

from vueda.core.routers import VuedaRouter
from vueda.vdq.viewsets import SendQueueViewSet
from vueda.vdq.viewsets import SentItemViewSet


router = VuedaRouter()
router.register(r"queueitem", SendQueueViewSet)
router.register(r"sentitem", SentItemViewSet, basename="sentitem")
urlpatterns = router.urls
