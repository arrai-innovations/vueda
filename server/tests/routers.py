from tests.viewsets import ProductViewSet
from tests.viewsets import TimesheetViewSet
from vueda.core.routers import IncludeAppInRouteNameRouter


tests_router = IncludeAppInRouteNameRouter()
tests_router.register("timesheets", TimesheetViewSet)
tests_router.register("products", ProductViewSet)
