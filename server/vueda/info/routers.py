from vueda.core.routers import ContentTypeChoicesRouter
from vueda.core.routers import ContentTypeRouter
from vueda.info.viewsets import ModelInfoChoicesViewSet
from vueda.info.viewsets import ModelInfoViewSet


info_router = ContentTypeRouter()
info_router.register("model_info", ModelInfoViewSet, basename="info.model_info")

info_choices_router = ContentTypeChoicesRouter()
info_choices_router.register("model_info_choices", ModelInfoChoicesViewSet, basename="info.model_info_choices")
