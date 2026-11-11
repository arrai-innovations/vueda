"""Object-level and row-level permission classes for CRUD and workflow integration."""

__all__ = (
    "DEFAULT",
    "BaseRowLevelPermissions",
    "DynamicObjectPermissions",
    "ObjectPermissions",
    "check_action_permission",
    "filter_rows_for_user",
    "has_matching_state_grant",
    "has_row_dependent_authorization",
    "permitted_extra_action_methods",
)

from django.conf import settings
from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.db.models import Q
from django.http import Http404
from rest_framework import exceptions
from rest_framework.permissions import DjangoObjectPermissions

from vueda.core.installed_apps import workflow_enabled
from vueda.core.installed_apps import workflow_is_installed
from vueda.core.utils import ActionView
from vueda.core.utils import AvailableActionsRequest


def has_matching_state_grant(model, user, required_permissions) -> bool:
    """
    Whether a workflow state of ``model`` grants ``user`` any of ``required_permissions``.

    This is the one model-scope deferral rule. A model-level denial stands unless a state rule
    matches the caller's groups, a requested codename, the model's content type, and the model's
    own workflow, and that rule grants rather than denies.

    The answer says only that an object's state can still admit the request. It does not say that
    any particular object does. Call it only from a path that goes on to make that per-object
    decision, and let the object decision, including a matching deny, settle the request.
    """
    if not workflow_is_installed() or not user.is_authenticated:
        return False

    from django.contrib.contenttypes.models import ContentType

    from vueda.workflow.models import StatePermission
    from vueda.workflow.models import get_workflow_for_model

    if not workflow_enabled(model):
        return False

    workflow = get_workflow_for_model(model)

    codenames = [permission.rsplit(".", maxsplit=1)[-1] for permission in required_permissions]
    return StatePermission.objects.filter(
        state__workflow=workflow,
        group__in=user.groups.all(),
        permission__codename__in=codenames,
        permission__content_type=ContentType.objects.get_for_model(model),
        grant_or_deny=True,
    ).exists()


def check_action_permission(viewset, request, instance, action) -> bool:
    """
    Whether ``request.user`` may perform the built-in ``action`` against ``instance`` -- or the
    model at large, when ``instance`` is ``None`` -- through the permission classes that
    ``viewset.get_permissions()`` returns for ``action``.

    ``get_permissions`` runs with ``action`` as the view's action, as it does on the endpoint for
    ``action``. A viewset that selects its permission classes by ``self.action`` is therefore
    checked against the classes that it selects for ``action``.

    Checked as ``action`` over its own HTTP method, independently of whatever action the
    surrounding response is actually for: a list response does not substitute list permission for
    retrieve, and a write response does not substitute its own write permission for read.
    ``instance=None`` decides through ``has_permission`` alone, the model-level check, which lets
    a matching workflow-state grant settle a model-level denial without scanning any row
    (:func:`has_matching_state_grant`). A specific ``instance`` instead decides through
    ``viewset.check_object_permissions``, the same hook the endpoint itself calls to enforce the
    request, so a viewset that overrides that hook to add its own object-level rules is honoured
    here too, not only at the endpoint. It folds in row-level and per-object workflow-state rules
    for that object either way.

    ``request`` is ``None`` when there is no request to authorize against (for example, schema
    generation building metadata without a live requester); every caller of this function leaves
    its result unfiltered in that case.

    Caches its answer on ``viewset`` per ``(action, method, instance)`` for that viewset
    instance's own lifetime -- one request -- so two callers asking the identical question pay for
    one permission pass, not two. :func:`permitted_extra_action_methods` shares this cache, so
    model metadata that decides whether an extra action is offered and which of its methods to list
    runs each check once.
    """
    # Local import: vueda.info.serializers locally imports VuedaViewSet from this package's
    # sibling module, so a module-level import here would risk the same cycle it avoids there.
    from vueda.info.serializers import METHOD_MAPPING

    if instance is None:
        return _model_scope_permitted(viewset, request, action, METHOD_MAPPING[action], {})
    return _object_scope_permitted(viewset, request, instance, action, METHOD_MAPPING[action], {})


def permitted_extra_action_methods(viewset, request, instance, extra_action) -> list[str]:
    """
    Return the HTTP methods of ``extra_action`` that ``request.user`` passes through ``viewset``'s
    permission checks, as the routed endpoint runs them.

    ``extra_action`` is a method that the viewset declares with ``@action``, as
    ``viewset.get_extra_actions()`` returns it. The methods are lowercase and keep the order of
    ``extra_action.mapping``. The user may use the action when the list holds at least one method.
    The list is empty when the user passes no method.

    Each method is checked against the view that the router builds for it: ``view.action`` is the
    name of the viewset method that handles the HTTP method, and the ``@action`` init kwargs, such
    as ``name`` and ``permission_classes``, are attributes of the view. An action that sets its own
    ``permission_classes`` is therefore checked against those classes, and an action that sets
    ``permission_classes=()`` passes for every user. An action that sets no ``permission_classes``
    is checked against the viewset class's ``permission_classes``. This holds even when
    ``viewset`` serves another extra action that sets its own.

    The model-scope check runs each permission class's ``has_permission``. When ``instance`` is
    given and the action is a detail action, the object-scope check also runs for that object
    through ``viewset.check_object_permissions``. The endpoint runs the same check when the action
    body loads its object through ``get_object()``. An action body that loads its object another
    way skips that check at the endpoint, so this function can leave out a method that a direct
    request for that object passes. A list-route action has no object, so ``instance`` does not
    affect it.

    ``request`` is ``None`` when there is no request to authorize against. Every method is returned
    in that case.

    Answers share the per-request cache of :func:`check_action_permission`.
    """
    check_object = instance is not None and extra_action.detail
    view_attributes = extra_action.kwargs
    permitted_methods = []
    for method, action in extra_action.mapping.items():
        if not _model_scope_permitted(viewset, request, action, method, view_attributes):
            continue
        if check_object and not _object_scope_permitted(viewset, request, instance, action, method, view_attributes):
            continue
        permitted_methods.append(method)
    return permitted_methods


def _model_scope_permitted(viewset, request, action, method, view_attributes) -> bool:
    """Whether every permission class's ``has_permission`` passes for ``action`` over ``method``."""

    def check(fake_request, action_view):
        return all(permission.has_permission(fake_request, action_view) for permission in action_view.get_permissions())

    return _cached_permission_check(viewset, request, None, action, method, view_attributes, check)


def _object_scope_permitted(viewset, request, instance, action, method, view_attributes) -> bool:
    """Whether ``viewset.check_object_permissions`` passes for ``instance`` under ``action`` over ``method``."""

    def check(fake_request, action_view):
        # Bound to `action_view`, not `viewset`, so a viewset override of
        # `check_object_permissions` still runs -- and still sees `action` as the action under
        # test, not whatever action the surrounding response is actually for -- while a nested
        # call the override or the default implementation makes, such as `get_queryset()`,
        # still runs against `viewset` itself and its real `action` (see `ActionView`).
        type(viewset).check_object_permissions(action_view, fake_request, instance)
        return True

    return _cached_permission_check(viewset, request, instance, action, method, view_attributes, check)


def _cached_permission_check(viewset, request, instance, action, method, view_attributes, check) -> bool:
    """
    Run ``check`` against a request for ``method`` and a view for ``action``, and cache its answer.

    ``check`` receives the stand-in request and the :class:`~vueda.core.utils.ActionView` that
    carries ``action`` and ``view_attributes``. A refusal that it raises counts as ``False``.

    The cache lives on ``viewset`` and is keyed per ``(action, method, instance)``. It keys on
    ``id(instance)``, since a model instance is unhashable without a primary key and a composite
    primary key is not reliably hashable either. Each entry holds a reference to ``instance``
    alongside its answer, so that id cannot be freed and reassigned to an unrelated object for as
    long as the entry lives, which would otherwise alias a later, different row onto this row's
    cached answer.
    """
    if request is None:
        return True

    method = method.upper()
    cache = viewset.__dict__.setdefault("_action_permission_cache", {})
    cache_key = (action, method, id(instance) if instance is not None else None)
    if cache_key in cache:
        return cache[cache_key][1]

    fake_request = AvailableActionsRequest(
        method=method,
        user=request.user,
        authenticators=request.authenticators,
        successful_authenticator=request.successful_authenticator,
    )
    action_view = ActionView(viewset, action, **view_attributes)

    try:
        permitted = check(fake_request, action_view)
    except (exceptions.PermissionDenied, exceptions.NotAuthenticated, DjangoPermissionDenied, Http404):
        # APIView.permission_denied() raises NotAuthenticated, not PermissionDenied, for a
        # requester whose authenticators none succeeded -- fake_request carries the real request's
        # own authenticators, so an unauthenticated requester takes that path here too. A viewset's
        # own check_object_permissions() override can likewise raise Django's PermissionDenied,
        # a separate class from the DRF one of the same name. Both are refusals, on equal footing
        # with the two already caught, and belong to this same except clause rather than a bare
        # `except Exception`, which would also hide a faulty override's TypeError or AttributeError.
        permitted = False

    cache[cache_key] = (instance, permitted)
    return permitted


def _read_permission(action) -> str:
    """Return the codename template a read of ``action`` requires: list for ``list``, read otherwise."""
    return f"%(app_label)s.{'list' if action == 'list' else 'read'}_%(model_name)s"


class ObjectPermissions(DjangoObjectPermissions):
    """
    Extends DjangoObjectPermissions to support state permissions and CRUD naming conventions.
    It sets the 'view_action' in permission checks to determine required permissions for views
    and objects based on the current action in the view.
    """

    perms_map = {
        "GET": [_read_permission],
        "OPTIONS": [],
        "HEAD": [_read_permission],
        "POST": ["%(app_label)s.create_%(model_name)s"],
        "PUT": ["%(app_label)s.update_%(model_name)s"],
        "PATCH": ["%(app_label)s.update_%(model_name)s"],
        "DELETE": ["%(app_label)s.delete_%(model_name)s"],
    }
    view_action = None
    object_permission_actions = frozenset(("destroy", "partial_update", "retrieve", "update"))

    def _has_later_permission_decision(self, view) -> bool:
        """Return whether this action has a guaranteed state-aware decision after model scope."""
        action = self.view_action
        if action in self.object_permission_actions:
            return True
        if action == "list":
            return getattr(view, "applies_workflow_state_list_filter", False)
        return action in getattr(view, "workflow_object_permission_actions", ())

    def has_permission(self, request, view) -> bool:
        """
        Defer a model-level denial only when a matching state grant can be decided later.

        Object-scoped actions defer to ``has_object_permission``. Framework list actions defer
        to their workflow-aware queryset filter. Collection writes, including create, retain the
        model-level result because no existing object supplies a workflow state.
        """
        self.view_action = getattr(view, "action", None)
        model_permission = super().has_permission(request, view)
        if model_permission or not self._has_later_permission_decision(view):
            return model_permission

        model = view.get_queryset().model
        return has_matching_state_grant(model, request.user, self.get_required_permissions(request.method, model))

    def has_object_permission(self, request, view, obj) -> bool:
        """Records the current view action then delegates to DjangoObjectPermissions."""
        # set the view action for use in get_required_object_permissions
        self.view_action = getattr(view, "action", None)
        return super().has_object_permission(request, view, obj)

    def get_required_permissions(self, method, model_cls) -> list[str]:
        """
        Allow dynamic permissions based on the view action, for callables in perms_map.
        """
        kwargs = {"app_label": model_cls._meta.app_label, "model_name": model_cls._meta.model_name}

        if method not in self.perms_map:
            raise exceptions.MethodNotAllowed(method)

        called = [perm(self.view_action) if callable(perm) else perm for perm in self.perms_map[method]]
        return [perm % kwargs for perm in called if perm]

    def get_required_object_permissions(self, method, model_cls) -> list[str]:
        """
        Allow dynamic permissions based on the view action, for callables in perms_map, for object permissions.
        """
        return self.get_required_permissions(method, model_cls)


class DynamicObjectPermissions(DjangoObjectPermissions):
    """
    CRUD permissions for endpoints that select their model from ``app_label`` and ``model``.

    ``crudl_perms_map`` names the CRUD action for each HTTP method, and
    ``get_required_permissions`` resolves that action through ``PERMISSION_NAMES_MAPPING`` when
    the check runs. An installation that renames an action is therefore honoured without patching
    this class at import.

    ``PATCH`` requires read rather than update. These endpoints do not edit ordinary model fields.
    They act on data the target object owns, and each endpoint applies its own further gates.
    """

    crudl_perms_map = {
        "GET": ["read"],
        "OPTIONS": [],
        "HEAD": ["read"],
        "POST": ["create"],
        "PUT": ["update"],
        "PATCH": ["read"],
        "DELETE": ["delete"],
    }

    def _queryset(self, view):
        """Return a queryset for the model named by the request."""
        # Local imports, so this module can be imported before the app registry is ready, and
        # before rest_framework.generics finishes importing this module's default permission class.
        from django.contrib.contenttypes.models import ContentType
        from rest_framework.generics import get_object_or_404

        app_label = view.kwargs.get("app_label") or view.request.GET.get("app_label")
        model = view.kwargs.get("model") or view.request.GET.get("model")
        content_type = get_object_or_404(ContentType, app_label=app_label, model=model.replace("_", ""))
        return content_type.model_class().objects.all()

    def get_required_permissions(self, method, model_cls) -> list[str]:
        """Return the permissions ``method`` needs on ``model_cls``, named as this installation names them."""
        # Local import, so importing this module does not depend on patch_django finishing first.
        from vueda.core.patch_django import get_permission_names_mapping

        if method not in self.crudl_perms_map:
            raise exceptions.MethodNotAllowed(method)

        mapping = get_permission_names_mapping()
        return [
            f"{model_cls._meta.app_label}.{mapping.get(action, action)}_{model_cls._meta.model_name}"
            for action in self.crudl_perms_map[method]
        ]

    def get_required_object_permissions(self, method, model_cls) -> list[str]:
        """Object permissions match the model permissions the same method requires."""
        return self.get_required_permissions(method, model_cls)

    def has_permission(self, request, view) -> bool:
        """
        Defer a model-level denial only when the view resolves a concrete object.

        A view says so through ``resolves_object``. Its ``get_object`` then checks that object,
        which is where a matching state grant or deny settles the request.
        """
        model_permission = super().has_permission(request, view)
        if model_permission or not getattr(view, "resolves_object", lambda: False)():
            return model_permission

        model = self._queryset(view).model
        return has_matching_state_grant(model, request.user, self.get_required_permissions(request.method, model))

    def has_object_permission(self, request, view, obj) -> bool:
        """
        Report a failed object check as a denial rather than as a missing object.

        These endpoints address an object the caller already named in the URL, so DRF's
        safe-method 404 would hide the reason without hiding the object.
        """
        model_cls = self._queryset(view).model
        return request.user.has_perms(self.get_required_object_permissions(request.method, model_cls), obj)


DEFAULT = object()


class BaseRowLevelPermissions:
    """
    Base class for row-level permission checks. Subclass this on a model's inner
    ``RowLevelPermissions`` class to restrict which rows a user can read, modify, or delete.

    All methods return ``None`` by default (no opinion). Return ``True`` to grant, ``False``
    to deny, or a ``Q`` object (queryset methods) to filter rows.
    """

    @classmethod
    def check_instance(cls, model, obj, perm, user, perm_type) -> bool | None:
        """
        True if the user has the permission, False if the user does not have the permission, None if the check is not
        applicable due to there being no row level permissions for the model.
        """
        # users should implement this method
        if user.is_superuser:
            return None
        return None

    @classmethod
    def check_queryset(cls, queryset, perm, user, perm_type) -> Q | bool | None:
        """
        Return of None means do not filter based on row level permissions.
        Return of True means the user has the permission without needing to check the rows.
        Return of False means the user does not have the permission, and we can stop checking.
        Return of Q means we need to filter the rows based on the row level permissions.
        """
        # users should implement this method
        if user.is_superuser:
            return None
        return None

    @classmethod
    def check_instance_workflow(cls, model, obj, perm, user, perm_type, grant_or_deny) -> bool | None:
        """
        Row-level check that is workflow-aware. Only called when the object is under workflow.
        Receives grant_or_deny (None/True/False) from state permission resolution.
        Runs AFTER check_instance and can override any prior decision, including state deny.
        """
        if user.is_superuser:
            return None
        return None

    @classmethod
    def check_queryset_workflow(
        cls, queryset, perm, user, perm_type, state_denied_annotation, state_granted_annotation
    ) -> Q | bool | None:
        """
        Queryset-level filter that is workflow-aware. Only called when the model is under workflow.
        The queryset is pre-annotated with state permission info.
        Use F(state_denied_annotation) / F(state_granted_annotation) in Q expressions.

        Returns:
            None  - no workflow-specific opinion, preserve prior filtering
            Q     - ANDed with the current queryset
            True  - no additional restriction
            False - empty queryset
        """
        if user.is_superuser:
            return None
        return None


def has_row_dependent_authorization(model) -> bool:
    """Whether reading a row of ``model`` depends on the row rather than only on the model.

    A model is row-dependent when it declares ``RowLevelPermissions`` or participates in a
    configured workflow. History uses this to decide whether an event about a row that has since
    been deleted can still be authorized. When the row is gone there is nothing left to evaluate,
    so a row-dependent model fails closed.
    """
    if getattr(model, "RowLevelPermissions", None) is not None:
        return True

    if workflow_enabled(model):
        from vueda.workflow.models import get_workflow_for_model

        # Raises when the definition is missing, rather than reading the model as row-independent.
        get_workflow_for_model(model)
        return True

    return False


def filter_rows_for_user(queryset, user, perm_type="list"):
    """
    Apply row-level and workflow-aware queryset filters for the given ``perm_type``.
    Calls ``RowLevelPermissions.check_queryset`` and, when the model has a workflow,
    also annotates state permission info and calls ``check_queryset_workflow``.

    This is the single row-visibility rule. A viewset reaches it through
    ``apply_row_level_filter``. History and the filter choices endpoint reach it directly, so an
    event about a related row follows the same rule as reading that row, and a filter choice
    comes only from a row the user may list.
    """
    model = queryset.model
    row_level_permissions = getattr(model, "RowLevelPermissions", None)

    permission_name = perm_type
    if perm_type in settings.PERMISSION_NAMES_MAPPING:
        permission_name = settings.PERMISSION_NAMES_MAPPING[perm_type]

    perm = f"{model._meta.app_label}.{permission_name}_{model._meta.model_name}"

    if row_level_permissions is not None:
        optional_q = row_level_permissions.check_queryset(
            queryset,
            perm,
            user,
            perm_type,
        )
        if isinstance(optional_q, Q):
            queryset = queryset.filter(optional_q)
        elif optional_q is False:
            return queryset.none()
        # else, optional_q is None or True, so we don't filter

    # Workflow state permissions are an authorization overlay, not an opt-in row-level hook.
    # Apply them even when the model does not define RowLevelPermissions.
    if workflow_enabled(model):
        from django.contrib.contenttypes.models import ContentType
        from django.db.models import Exists
        from django.db.models import OuterRef

        from vueda.workflow.models import StatePermission
        from vueda.workflow.models import get_workflow_for_model

        workflow = get_workflow_for_model(model)

        codename = perm.rsplit(".", maxsplit=1)[-1]
        content_type = ContentType.objects.get_for_model(model)

        state_denied = Exists(
            StatePermission.objects.filter(
                state=OuterRef("object_states_proxy__state"),
                state__workflow=workflow,
                permission__codename=codename,
                permission__content_type=content_type,
                group__in=user.groups.all(),
                grant_or_deny=False,
            )
        )
        state_granted = Exists(
            StatePermission.objects.filter(
                state=OuterRef("object_states_proxy__state"),
                state__workflow=workflow,
                permission__codename=codename,
                permission__content_type=content_type,
                group__in=user.groups.all(),
                grant_or_deny=True,
            )
        )
        queryset = queryset.annotate(
            _state_denied=state_denied,
            _state_granted=state_granted,
        )

        # A superuser's has_perm skips state rules for a single object, so the list skips them too.
        # The annotations stay for check_queryset_workflow, which decides for itself.
        if user.is_superuser:
            pass
        elif user.has_perm(perm):
            queryset = queryset.filter(_state_denied=False)
        else:
            queryset = queryset.filter(_state_denied=False, _state_granted=True)

        if row_level_permissions is not None:
            workflow_q = row_level_permissions.check_queryset_workflow(
                queryset,
                perm,
                user,
                perm_type,
                "_state_denied",
                "_state_granted",
            )
            if isinstance(workflow_q, Q):
                queryset = queryset.filter(workflow_q)
            elif workflow_q is False:
                return queryset.none()

    return queryset
