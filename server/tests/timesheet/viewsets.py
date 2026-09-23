from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.db.models import Prefetch
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated

from tests.timesheet import filtersets
from tests.timesheet import models
from tests.timesheet import serializers
from vueda.core import viewsets
from vueda.core.viewsets import VuedaViewSet


class TimesheetViewSet(VuedaViewSet):
    queryset = models.Timesheet.objects.all()
    serializer_class = serializers.TimesheetSerializer
    filterset_class = filtersets.TimesheetFilterSet
    permit_list_expands = ["employee", "supervisor"]

    def check_object_permissions(self, request, obj):
        """
        Denies a write the configured permission classes alone would allow, for groups no other
        test puts a user in, so this stays inert everywhere ``TimesheetViewSet`` is otherwise used.

        Exists to prove that object-action discovery (``check_action_permission``) honours a
        viewset's own override of this hook, not just its permission classes -- the same
        assumption the endpoint itself relies on when enforcing the real request. The two groups
        below raise the two exceptions discovery must treat as an ordinary refusal rather than let
        escape and fail the whole response (issue #306): DRF's own ``PermissionDenied``, and
        Django's ``PermissionDenied``, a separate class of the same name that a viewset override
        can just as easily raise.
        """
        super().check_object_permissions(request, obj)
        if request.method in ("PUT", "PATCH") and request.user.groups.filter(name="Timesheet Override Denied").exists():
            raise PermissionDenied()
        if request.method == "DELETE" and request.user.groups.filter(name="Timesheet Django Override Denied").exists():
            raise DjangoPermissionDenied()


class TimesheetWithAliasedSupervisorViewSet(viewsets.VuedaViewSet):
    queryset = models.Timesheet.objects.all()
    serializer_class = serializers.TimesheetWithAliasedSupervisorSerializer
    permission_classes = [IsAuthenticated]
    permit_list_expands = ["manager"]


class TimesheetWithPrefetchedEntriesViewSet(viewsets.VuedaViewSet):
    # Hand-declares its own prefetch for "timesheet_entries", the same relation "entries" (below)
    # also expands -- reproducing the crash filter_new_prefetch_lookups exists to prevent.
    queryset = models.Timesheet.objects.prefetch_related("timesheet_entries")
    serializer_class = serializers.TimesheetWithPrefetchedEntriesSerializer
    permission_classes = [IsAuthenticated]
    permit_list_expands = ["entries"]


class TimesheetWithAliasedEntriesViewSet(viewsets.VuedaViewSet):
    # Plain queryset with no hand-declared prefetch, so the response is served entirely by the
    # plan build_prefetch_plan derives -- covers the to-many branch's query count and its
    # formatted_name pre-annotation, and (via the "entries"/"entries_again" aliases sharing one
    # relation) the plan colliding with itself.
    queryset = models.Timesheet.objects.all()
    serializer_class = serializers.TimesheetWithAliasedEntriesSerializer
    permission_classes = [IsAuthenticated]
    permit_list_expands = ["entries", "entries_again"]


class TimesheetWithDeeperPrefetchedEntriesViewSet(viewsets.VuedaViewSet):
    # Hand-declares a prefetch that passes through -- but does not equal -- "entries"'s own
    # "timesheet_entries" path, reproducing the crash a lookup-path comparison misses because
    # Django registers "timesheet_entries" as its own cache key while walking the deeper lookup.
    queryset = models.Timesheet.objects.prefetch_related("timesheet_entries__timesheet")
    serializer_class = serializers.TimesheetWithPrefetchedEntriesSerializer
    permission_classes = [IsAuthenticated]
    permit_list_expands = ["entries"]


class TimesheetWithToAttrPrefetchedEntriesViewSet(viewsets.VuedaViewSet):
    # Hand-declares its own "timesheet_entries" prefetch under to_attr, a distinct cache key from
    # the plan's own "entries" lookup -- reproducing the case where a lookup-path comparison drops
    # the plan entry even though the two lookups do not collide.
    queryset = models.Timesheet.objects.prefetch_related(
        Prefetch("timesheet_entries", queryset=models.TimesheetEntry.objects.all(), to_attr="raw_timesheet_entries")
    )
    serializer_class = serializers.TimesheetWithPrefetchedEntriesSerializer
    permission_classes = [IsAuthenticated]
    permit_list_expands = ["entries"]


class TimesheetEntryViewSet(VuedaViewSet):
    queryset = models.TimesheetEntry.objects.all()
    serializer_class = serializers.TimesheetEntrySerializer
    # The simple case: a total named after the column it renders under, summing the column of the
    # same name. `tests.store.viewsets.CartItemViewSet` covers the case the mapping exists for,
    # where the two are spelled differently.
    column_totals = {"hours": "hours"}


class TimesheetDataViewSet(viewsets.VuedaReadOnlyViewSet):
    queryset = models.TimesheetData.objects.all()
    serializer_class = serializers.TimesheetDataSerializer
    ordering_fields = ["formatted_name"]
