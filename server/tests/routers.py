from tests.viewsets import TimesheetViewSet
from vueda.core.routers import IncludeAppInRouteNameRouter


tests_router = IncludeAppInRouteNameRouter()
tests_router.register("timesheets", TimesheetViewSet)
