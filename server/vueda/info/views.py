"""API views for server info metadata in the vueda.info app."""

__all__ = (
    "InfoOverviewView",
    "server_info_view",
)


from django.contrib.auth import get_user_model
from django.contrib.auth.mixins import PermissionRequiredMixin
from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.contrib.postgres.aggregates import ArrayAgg
from django.db.models import Case
from django.db.models import F
from django.db.models import Q
from django.db.models import Value
from django.db.models import When
from django.db.models.functions import StrIndex
from django.db.models.functions import Substr
from django.http import JsonResponse
from django.views.generic import TemplateView
from rest_framework import serializers
from rest_framework.decorators import api_view
from rest_framework.decorators import permission_classes
from rest_framework.permissions import AllowAny

from vueda import __version__ as server_version
from vueda.core.installed_apps import workflow_enabled
from vueda.core.installed_apps import workflow_is_installed
from vueda.core.open_api import conditional_extend_schema_decorator
from vueda.core.open_api import conditional_inline_serializer
from vueda.info.registration import get_all_registrations
from vueda.user.mixins import LogoutMixin


def _build_workflow_map(registered_ct_ids, user_group_ids, is_superuser):
    """Return a dict keyed by content_type_id with workflow display data."""
    from vueda.workflow.models import Workflow as WorkflowModel

    workflow_map = {}
    for workflow in (
        WorkflowModel.objects.filter(content_type_id__in=registered_ct_ids)
        .prefetch_related(
            "workflow_permissions__permission__group_set",
            "states__state_permissions__permission",
            "states__state_permissions__group",
            "transitions__transition_permissions__permission__group_set",
            "transitions__transition_sources__source",
            "transitions__target",
        )
        .select_related("content_type")
    ):
        # A workflow row does not make a model a workflow model; its class Vueda policy does.
        if not workflow_enabled(workflow.content_type.model_class()):
            continue
        workflow_map[workflow.content_type_id] = _workflow_data(workflow, user_group_ids, is_superuser)
    return workflow_map


def _workflow_data(workflow, user_group_ids, is_superuser):
    """Build the display dict for a single workflow."""
    workflow_perm_group_data = {}
    for wp in workflow.workflow_permissions.all():
        for group in wp.permission.group_set.all():
            workflow_perm_group_data[group.pk] = group.name

    state_perms_data, has_state_permissions = _collect_state_permissions(workflow)

    all_wps = list(workflow.workflow_permissions.all())
    user_can_access_workflow = _user_can_access_workflow(all_wps, has_state_permissions, user_group_ids, is_superuser)

    return {
        "name": workflow.name,
        "workflow_groups": sorted(workflow_perm_group_data.values()),
        "user_can_access_workflow": user_can_access_workflow,
        "has_state_permissions": has_state_permissions,
        "state_permissions": state_perms_data,
        "transitions": [_transition_data(t, user_group_ids, is_superuser) for t in workflow.transitions.all()],
    }


def _collect_state_permissions(workflow):
    """Return (state_perms_data list, has_state_permissions bool) for a workflow."""
    state_perms_data = []
    for state in workflow.states.all():
        for sp in state.state_permissions.all():
            state_perms_data.append(
                {
                    "state_name": state.name,
                    "permission_codename": sp.permission.codename,
                    "group_name": sp.group.name,
                    "grant_or_deny": sp.grant_or_deny,
                }
            )
    state_perms_data.sort(key=lambda x: (x["state_name"], x["group_name"]))
    return state_perms_data, bool(state_perms_data)


def _user_can_access_workflow(all_wps, has_state_permissions, user_group_ids, is_superuser):
    """Return True/False/None for whether the selected user can access this workflow."""
    if user_group_ids is None:
        return None
    if has_state_permissions:
        return None
    if not all_wps:
        return False
    if is_superuser:
        return True
    return all({g.pk for g in wp.permission.group_set.all()} & user_group_ids for wp in all_wps)


def _transition_data(transition, user_group_ids, is_superuser):
    """Build the display dict for a single transition."""
    groups = {}
    for tp in transition.transition_permissions.all():
        for group in tp.permission.group_set.all():
            groups[group.pk] = group.name

    tps = list(transition.transition_permissions.all())
    if user_group_ids is None:
        user_can_do = None
    elif not tps:
        user_can_do = False
    elif is_superuser:
        user_can_do = True
    else:
        user_can_do = all({g.pk for g in tp.permission.group_set.all()} & user_group_ids for tp in tps)

    sources = sorted(ts.source.name for ts in transition.transition_sources.all() if not ts.ignored)
    return {
        "name": transition.name,
        "sources": sources,
        "target": transition.target.name,
        "groups": sorted(groups.items(), key=lambda x: x[1]),
        "user_can_do": user_can_do,
    }


def _build_apps(permissions_qs, workflow_map, selected_user):
    """Assemble the apps → models structure from the permissions queryset."""
    apps = {}
    model_data = {}
    for (
        pk,
        codename,
        name,
        app_label,
        model_name,
        ct_id,
        groups_list,
    ) in permissions_qs.values_list(
        "pk",
        "codename",
        "name",
        "content_type__app_label",
        "content_type__model",
        "content_type_id",
        "groups_list",
    ):
        key = (app_label, model_name)
        if key not in model_data:
            model_dict = {
                "model_name": model_name,
                "permissions": [],
                "workflow": workflow_map.get(ct_id),
            }
            model_data[key] = model_dict
            if app_label not in apps:
                apps[app_label] = []
            apps[app_label].append(model_dict)

        model_item = {
            "pk": pk,
            "codename": codename,
            "name": name,
            "groups": groups_list,
        }
        if selected_user:
            model_item["user_has_permission"] = selected_user.has_perm(f"{app_label}.{codename}")

        model_data[key]["permissions"].append(model_item)
    return apps


@conditional_extend_schema_decorator(
    summary="Server version",
    responses={
        200: conditional_inline_serializer(
            "ServerInfoResponse",
            fields={"server_version": serializers.CharField()},
        )
    },
)
@api_view(["GET"])
@permission_classes((AllowAny,))
def server_info_view(request):
    return JsonResponse(
        {
            "server_version": server_version,
        }
    )


server_info_view.cls._ignore_model_permissions = True


class InfoOverviewView(LogoutMixin, PermissionRequiredMixin, TemplateView):
    """Read-only overview of registered models, their CRUDL groups, and workflow transition groups."""

    template_name = "info/overview.jinja2"
    permission_required = ("auth.list_permission",)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        User = get_user_model()  # noqa N806

        registered_keys = get_all_registrations()
        if not registered_keys:
            context.update({"apps": {}, "users": [], "selected_user": None})
            return context

        ct_query = Q()
        for key in registered_keys:
            app_label, model = key.split(".")
            ct_query |= Q(app_label=app_label, model=model)
        registered_ct_ids = list(ContentType.objects.filter(ct_query).values_list("pk", flat=True))

        # Optional user filter
        selected_user = None
        user_group_ids = None
        user_id = self.request.GET.get("user_id")
        if user_id:
            try:
                selected_user = User.objects.get(pk=user_id)
                user_group_ids = set(selected_user.groups.values_list("pk", flat=True))
            except User.DoesNotExist:
                pass

        # Groups Section
        user_group_names = set(selected_user.groups.values_list("name", flat=True)) if selected_user else set()
        groups_data = []
        for group in Group.objects.order_by("name"):
            group_data = {"name": group.name}
            if selected_user:
                group_data["user_has_group"] = group.name in user_group_names
            groups_data.append(group_data)

        # Permissions with their groups, ordered by app / model / CRUDL
        permissions_qs = (
            Permission.objects.filter(content_type_id__in=registered_ct_ids)
            .annotate(
                underscore_index=StrIndex(F("codename"), Value("_")),
                codename_type=Substr(F("codename"), 1, length=F("underscore_index") - 1),
                crud_order_by=Case(
                    When(codename_type__in=("create", "add"), then=0),
                    When(codename_type__in=("read", "view"), then=1),
                    When(codename_type__in=("update", "change"), then=2),
                    When(codename_type="delete", then=3),
                    When(codename_type="list", then=4),
                    default=5,
                ),
                groups_list=ArrayAgg("group__name", filter=Q(group__name__isnull=False), default=[]),
            )
            .order_by(
                "content_type__app_label",
                "crud_order_by",
            )
        )

        # Workflow transition data (guarded so the app doesn't need vueda.workflow)
        is_superuser = selected_user.is_superuser if selected_user else False
        workflow_map = {}
        if workflow_is_installed():
            workflow_map = _build_workflow_map(registered_ct_ids, user_group_ids, is_superuser)

        apps = _build_apps(permissions_qs, workflow_map, selected_user)

        users = tuple(
            User.objects.exclude(is_system=True)
            .only("pk", "formatted_name")
            .order_by("formatted_name")
            .values("pk", "formatted_name")
        )

        context.update(
            {
                "apps": apps,
                "groups": groups_data,
                "selected_user": selected_user,
                "users": users,
            }
        )

        return context
