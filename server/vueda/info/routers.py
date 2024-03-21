from vueda.core.routers import ContentTypeRouter
from vueda.info.viewsets import ModelInfoViewSet


info_router = ContentTypeRouter()
info_router.register("model_info", ModelInfoViewSet, basename="info.model_info")
