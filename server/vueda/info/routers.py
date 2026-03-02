"""URL router configuration for the vueda.info viewsets."""

__all__ = (
    "info_choices_router",
    "info_router",
    "urlpatterns",
)

from vueda.core.routers import ContentTypeChoicesRouter
from vueda.core.routers import ContentTypeRouter
from vueda.info.viewsets import ModelInfoChoicesViewSet
from vueda.info.viewsets import ModelInfoFilterSetChoicesViewSet
from vueda.info.viewsets import ModelInfoViewSet


info_router = ContentTypeRouter()
info_router.register("model_info", ModelInfoViewSet, basename="info.model_info")

info_choices_router = ContentTypeChoicesRouter()
info_choices_router.register("model_info_choices", ModelInfoChoicesViewSet, basename="info.model_info_choices")
info_choices_router.register(
    "model_info_filter_choices", ModelInfoFilterSetChoicesViewSet, basename="info.model_info_filterset_choices"
)

urlpatterns = info_router.urls + info_choices_router.urls
