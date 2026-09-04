from tests.employee.viewsets import PermissionWithContentTypeViewSet
from tests.employee.viewsets import UserWithGroupsViewSet
from tests.employee.viewsets import UserWithPermissionsViewSet
from tests.product.viewsets import ProductViewSet
from tests.timesheet.viewsets import TimesheetEntryViewSet
from tests.timesheet.viewsets import TimesheetViewSet
from tests.timesheet.viewsets import TimesheetWithAliasedEntriesViewSet
from tests.timesheet.viewsets import TimesheetWithAliasedSupervisorViewSet
from tests.timesheet.viewsets import TimesheetWithDeeperPrefetchedEntriesViewSet
from tests.timesheet.viewsets import TimesheetWithPrefetchedEntriesViewSet
from tests.timesheet.viewsets import TimesheetWithToAttrPrefetchedEntriesViewSet
from vueda.core.routers import VuedaRouter


tests_router = VuedaRouter()
tests_router.register("timesheets", TimesheetViewSet)
tests_router.register(
    "timesheets_with_aliased_supervisor", TimesheetWithAliasedSupervisorViewSet, basename="timesheet.timesheetmanager"
)
tests_router.register(
    "timesheets_with_prefetched_entries",
    TimesheetWithPrefetchedEntriesViewSet,
    basename="timesheet.timesheetprefetched",
)
tests_router.register(
    "timesheets_with_aliased_entries",
    TimesheetWithAliasedEntriesViewSet,
    basename="timesheet.timesheetaliasedentries",
)
tests_router.register(
    "timesheets_with_deeper_prefetched_entries",
    TimesheetWithDeeperPrefetchedEntriesViewSet,
    basename="timesheet.timesheetdeeperprefetched",
)
tests_router.register(
    "timesheets_with_to_attr_prefetched_entries",
    TimesheetWithToAttrPrefetchedEntriesViewSet,
    basename="timesheet.timesheettoattrprefetched",
)
tests_router.register("products", ProductViewSet)
tests_router.register("timesheetentries", TimesheetEntryViewSet)
tests_router.register("users_with_groups", UserWithGroupsViewSet, basename="employee.usergroup")
tests_router.register("users_with_permissions", UserWithPermissionsViewSet, basename="employee.userpermission")
tests_router.register("permissions_with_content_type", PermissionWithContentTypeViewSet, basename="employee.permission")

urlpatterns = tests_router.urls
