"""API views for server info metadata in the vueda.info app."""

__all__ = (
    "InfoOverviewView",
    "server_info_view",
)


from django.conf import settings
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
from vueda.core.open_api import conditional_extend_schema_decorator
from vueda.core.open_api import conditional_inline_serializer
from vueda.info.registration import get_all_registrations
from vueda.user.mixins import LogoutMixin


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
    permission_required = ("user.list_permission",)

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
        groups_data = []
        for group in Group.objects.order_by("name"):
            group_data = {"name": group.name}
            if selected_user:
                group_data["user_has_group"] = selected_user.groups.filter(name=group.name).exists()
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
        workflow_map = {}
        if "vueda.workflow" in settings.INSTALLED_APPS:
            from vueda.workflow.models import Workflow as WorkflowModel

            for workflow in WorkflowModel.objects.filter(content_type_id__in=registered_ct_ids).prefetch_related(
                "transitions__transition_permissions__permission__group_set",
                "transitions__transition_sources__source",
                "transitions__target",
            ):
                transitions = []
                for transition in workflow.transitions.all():
                    groups = {}
                    for tp in transition.transition_permissions.all():
                        for group in tp.permission.group_set.all():
                            groups[group.pk] = group.name
                    sorted_groups = sorted(groups.items(), key=lambda x: x[1])
                    if user_group_ids is not None:
                        sorted_groups = [(pk, name) for pk, name in sorted_groups if pk in user_group_ids]
                    sources = sorted(ts.source.name for ts in transition.transition_sources.all() if not ts.ignored)
                    transitions.append(
                        {
                            "name": transition.name,
                            "sources": sources,
                            "target": transition.target.name,
                            "groups": sorted_groups,
                        }
                    )
                workflow_map[workflow.content_type_id] = {
                    "name": workflow.name,
                    "transitions": transitions,
                }

        # Assemble apps → models structure
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
