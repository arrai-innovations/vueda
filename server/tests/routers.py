from tests.viewsets import PermissionWithContentTypeViewSet
from tests.viewsets import ProductViewSet
from tests.viewsets import TimesheetEntryViewSet
from tests.viewsets import TimesheetViewSet
from tests.viewsets import UserWithGroupsViewSet
from tests.viewsets import UserWithPermissionsViewSet
from vueda.core.routers import VuedaRouter


tests_router = VuedaRouter()
tests_router.register("timesheets", TimesheetViewSet)
tests_router.register("products", ProductViewSet)
tests_router.register("timesheetentries", TimesheetEntryViewSet)
tests_router.register("users_with_groups", UserWithGroupsViewSet, basename="tests.usergroup")
tests_router.register("users_with_permissions", UserWithPermissionsViewSet, basename="tests.userpermission")
tests_router.register("permissions_with_content_type", PermissionWithContentTypeViewSet, basename="tests.permission")

urlpatterns = tests_router.urls
