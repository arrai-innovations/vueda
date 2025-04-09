from vueda.core.routers import VuedaRouter
from vueda.release.viewsets import ReleaseNoteViewSet


router = VuedaRouter()
router.register(r"releasenote", ReleaseNoteViewSet)
urlpatterns = router.urls
