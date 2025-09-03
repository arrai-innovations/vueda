from tests.viewsets import ProductViewSet
from tests.viewsets import TimesheetEntryViewSet
from tests.viewsets import TimesheetViewSet
from vueda.core.routers import VuedaRouter


tests_router = VuedaRouter()
tests_router.register("timesheets", TimesheetViewSet)
tests_router.register("products", ProductViewSet)
tests_router.register("timesheetentries", TimesheetEntryViewSet)

urlpatterns = tests_router.urls
