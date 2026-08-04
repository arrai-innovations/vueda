from tests.employee.viewsets import PermissionWithContentTypeViewSet
from tests.employee.viewsets import UserWithGroupsViewSet
from tests.employee.viewsets import UserWithPermissionsViewSet
from tests.product.viewsets import ProductViewSet
from tests.timesheet.viewsets import TimesheetEntryViewSet
from tests.timesheet.viewsets import TimesheetViewSet
from vueda.core.routers import VuedaRouter


tests_router = VuedaRouter()
tests_router.register("timesheets", TimesheetViewSet)
tests_router.register("products", ProductViewSet)
tests_router.register("timesheetentries", TimesheetEntryViewSet)
tests_router.register("users_with_groups", UserWithGroupsViewSet, basename="employee.usergroup")
tests_router.register("users_with_permissions", UserWithPermissionsViewSet, basename="employee.userpermission")
tests_router.register("permissions_with_content_type", PermissionWithContentTypeViewSet, basename="employee.permission")

urlpatterns = tests_router.urls
