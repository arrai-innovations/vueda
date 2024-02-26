from vueda.core.routers import IncludeAppInRouteNameRouter
from vueda.info.viewsets import ModelInfoViewSet


info_router = IncludeAppInRouteNameRouter()
info_router.register("model_info", ModelInfoViewSet, basename="model_info")
