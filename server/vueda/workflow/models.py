"""Workflow state machine models: workflows, states, transitions, permissions, and object state tracking."""

__all__ = (
    "HasWorkflowModelMixin",
    "InitialState",
    "ObjectState",
    "ObjectStateProxy",
    "State",
    "StatePermission",
    "Transition",
    "TransitionPermission",
    "TransitionSource",
    "Workflow",
    "WorkflowPermission",
)

from collections import defaultdict
from collections.abc import Iterable
from collections.abc import Iterator
from contextlib import contextmanager

import django
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.fields import GenericRelation
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ObjectDoesNotExist
from django.db import models
from django.db.models import QuerySet
from rest_framework.exceptions import PermissionDenied

from vueda.core.audit import current_action_metadata
from vueda.core.models import BaseModelMeta
from vueda.core.models import Lookup
from vueda.core.utils import get_system_user
from vueda.history.apps import track_model
from vueda.history.revision import object_revision
from vueda.history.snapshots import last_recorded
from vueda.workflow.exceptions import InvalidTransitionError


User = get_user_model()


class Workflow(Lookup):
    """
    A workflow is a collection of states and transitions.
    """

    content_type = models.OneToOneField(ContentType, on_delete=models.CASCADE, related_name="workflow")
    # If a workflow or content type is deleted locally, then we need to know what the app label
    # was for the deleted workflow, so we can add that workflow to the migration to delete.
    historical_app_label = models.CharField(max_length=255, blank=True)
    historical_model = models.CharField(max_length=255, blank=True)
    formatted_name = None  # Workflow doesn't need a formatted name.

    class Meta(BaseModelMeta):
        default_related_name = "workflows"
        constraints = [models.UniqueConstraint(fields=["code"], name="unique_workflow_code")]
        ordering = ["code"]

    def __str__(self):
        return f"name: {self.name}, code: {self.code}"

    if django.VERSION >= (6, 0):

        def save(self, **kwargs) -> None:
            """Snapshot ``historical_app_label`` and ``historical_model`` before saving."""
            self.historical_app_label = self.content_type.app_label
            self.historical_model = self.content_type.model

            super().save(**kwargs)

    else:

        def save(self, *args, **kwargs) -> None:
            """Snapshot ``historical_app_label`` and ``historical_model`` before saving."""
            self.historical_app_label = self.content_type.app_label
            self.historical_model = self.content_type.model

            super().save(*args, **kwargs)


class WorkflowPermission(models.Model):
    """
    The permissions that are required to get available transitions for a given object or execute a transition.
    """

    workflow = models.ForeignKey(Workflow, on_delete=models.CASCADE)
    permission = models.ForeignKey("auth.Permission", on_delete=models.CASCADE)
    historical_permission_codename = models.CharField(max_length=100, blank=True)
    historical_permission_content_type_app_label = models.CharField(max_length=100, blank=True)
    historical_permission_content_type_model_name = models.CharField(max_length=100, blank=True)

    class Meta(BaseModelMeta):
        default_related_name = "workflow_permissions"
        constraints = [
            models.UniqueConstraint(
                fields=["workflow", "permission"],
                name="unique_workflow_permission",
            )
        ]
        ordering = ["historical_permission_codename"]

    def __str__(self):
        # When debugging where an object has been deleted, name it from its last recorded values
        # rather than blow up.
        deleted_workflow = False
        try:
            workflow = self.workflow
        except ObjectDoesNotExist:
            deleted_workflow = True
            if self.workflow_id is not None:
                workflow = last_recorded(Workflow, self.workflow_id)
            else:
                workflow = None

        deleted_permission = False
        try:
            permission = self.permission
        except ObjectDoesNotExist:
            deleted_permission = True
            permission = self.historical_permission_codename

        return (
            f"{'deleted ' if deleted_workflow else ''}workflow: {workflow}, "
            f"{'deleted ' if deleted_permission else ''}permission: {permission}"
        )

    if django.VERSION >= (6, 0):

        def save(self, **kwargs):
            # Set the historical permission codename, so if the permission is deleted,
            # we don't just have an id that may not be the same on the server.
            self.historical_permission_codename = self.permission.codename
            self.historical_permission_content_type_app_label = self.permission.content_type.app_label
            self.historical_permission_content_type_model_name = self.permission.content_type.model

            super().save(**kwargs)
    else:

        def save(self, *args, **kwargs):
            # Set the historical permission codename, so if the permission is deleted,
            # we don't just have an id that may not be the same on the server.
            self.historical_permission_codename = self.permission.codename
            self.historical_permission_content_type_app_label = self.permission.content_type.app_label
            self.historical_permission_content_type_model_name = self.permission.content_type.model

            super().save(*args, **kwargs)


class State(models.Model):
    """
    A particular condition an object of the workflow can have.
    """

    workflow = models.ForeignKey(
        "Workflow",
        on_delete=models.CASCADE,
    )
    code = models.CharField(max_length=255, db_index=True)
    name = models.CharField(max_length=255)
    formatted_name_lookup_expression = "name"

    class Meta(BaseModelMeta):
        default_related_name = "states"
        constraints = [models.UniqueConstraint(fields=["workflow", "code"], name="unique_state_code")]
        ordering = ["code"]

    def __str__(self):
        return f"name: {self.name}, code: {self.code}"


class StatePermission(models.Model):
    """
    The state of an object can grant additional or deny existing permissions at a row level.
    """

    state = models.ForeignKey(
        "State",
        on_delete=models.CASCADE,
    )
    permission = models.ForeignKey(
        "auth.Permission",
        on_delete=models.CASCADE,
    )
    historical_permission_codename = models.CharField(max_length=100, blank=True)
    historical_permission_content_type_app_label = models.CharField(max_length=100, blank=True)
    historical_permission_content_type_model_name = models.CharField(max_length=100, blank=True)
    group = models.ForeignKey(
        "auth.Group",
        on_delete=models.CASCADE,
    )
    historical_group_name = models.CharField(max_length=150, blank=True)
    grant_or_deny = models.BooleanField()  # True = grant, False = deny

    class Meta(BaseModelMeta):
        default_related_name = "state_permissions"
        constraints = [models.UniqueConstraint(fields=["state", "permission", "group"], name="unique_state_permission")]
        ordering = ["historical_permission_codename"]

    def __str__(self):
        # When debugging where an object has been deleted, name it from its last recorded values
        # rather than blow up.
        deleted_state = False
        try:
            state = self.state
        except ObjectDoesNotExist:
            deleted_state = True
            if self.state_id is not None:
                state = last_recorded(State, self.state_id)
            else:
                state = None

        deleted_permission = False
        try:
            permission = self.permission
        except ObjectDoesNotExist:
            deleted_permission = True
            permission = self.historical_permission_codename

        return (
            f"{'deleted ' if deleted_state else ''}state: {state}, "
            f"{'deleted ' if deleted_permission else ''}permission: {permission}, "
            f"grant_or_deny: {'grant' if self.grant_or_deny else 'deny'}"
        )

    if django.VERSION >= (6, 0):

        def save(self, **kwargs):
            # Set the historical permission codename, so if the permission is deleted,
            # we don't just have an id that may not be the same on the server.
            self.historical_permission_codename = self.permission.codename
            self.historical_permission_content_type_app_label = self.permission.content_type.app_label
            self.historical_permission_content_type_model_name = self.permission.content_type.model
            self.historical_group_name = self.group.name
            super().save(**kwargs)
    else:

        def save(self, *args, **kwargs):
            # Set the historical permission codename, so if the permission is deleted,
            # we don't just have an id that may not be the same on the server.
            self.historical_permission_codename = self.permission.codename
            self.historical_permission_content_type_app_label = self.permission.content_type.app_label
            self.historical_permission_content_type_model_name = self.permission.content_type.model
            self.historical_group_name = self.group.name
            super().save(*args, **kwargs)


class InitialState(models.Model):
    """
    The initial state of an object of the workflow.
    """

    workflow = models.OneToOneField(
        "Workflow",
        on_delete=models.CASCADE,
        related_name="initial_state",
    )
    state = models.ForeignKey(
        "State",
        on_delete=models.CASCADE,
    )

    class Meta(BaseModelMeta):
        default_related_name = "initial_states"
        constraints = [models.UniqueConstraint(fields=["workflow", "state"], name="unique_workflow_initial_state")]
        ordering = ["workflow__code", "state__code"]

    def __str__(self):
        # When debugging where an object has been deleted, name it from its last recorded values
        # rather than blow up.
        deleted_workflow = False
        try:
            workflow = self.workflow
        except ObjectDoesNotExist:
            deleted_workflow = True
            if self.workflow_id is not None:
                workflow = last_recorded(Workflow, self.workflow_id)
            else:
                workflow = None

        deleted_state = False
        try:
            state = self.state
        except ObjectDoesNotExist:
            deleted_state = True
            if self.state_id is not None:
                state = last_recorded(State, self.state_id)
            else:
                state = None

        return (
            f"{'deleted ' if deleted_workflow else ''}workflow: {workflow}, "
            f"{'deleted ' if deleted_state else ''}state: {state} "
        )


class Transition(models.Model):
    """
    A transition is a change to a target state. Transitions can have multiple sources.
     Transitions can be executed by users.
    """

    workflow = models.ForeignKey(
        "Workflow",
        on_delete=models.PROTECT,
    )
    code = models.CharField(max_length=255, db_index=True)
    name = models.CharField(max_length=255)
    target = models.ForeignKey(
        "State",
        on_delete=models.PROTECT,
    )

    class Meta(BaseModelMeta):
        default_related_name = "transitions"
        constraints = [
            models.UniqueConstraint(fields=["workflow", "code"], name="unique_transition_code"),
        ]
        ordering = ["code"]

    def __str__(self):
        # When debugging where an object has been deleted, name it from its last recorded values
        # rather than blow up.
        deleted_state = False
        try:
            state = self.target
        except ObjectDoesNotExist:
            deleted_state = True
            if self.target_id is not None:
                state = last_recorded(State, self.target_id)
            else:
                state = None

        return f"name: {self.name}, code: {self.code}, {'deleted ' if deleted_state else ''}target: {state}"


class TransitionPermission(models.Model):
    """
    The permissions that are required to execute a transition.
    """

    transition = models.ForeignKey(
        "Transition",
        on_delete=models.CASCADE,
    )
    permission = models.ForeignKey(
        "auth.Permission",
        on_delete=models.CASCADE,
    )
    historical_permission_codename = models.CharField(max_length=100, blank=True)
    historical_permission_content_type_app_label = models.CharField(max_length=100, blank=True)
    historical_permission_content_type_model_name = models.CharField(max_length=100, blank=True)

    class Meta(BaseModelMeta):
        default_related_name = "transition_permissions"
        constraints = [
            models.UniqueConstraint(
                fields=["transition", "permission"],
                name="unique_transition_permission",
            )
        ]
        ordering = ["historical_permission_codename"]

    def __str__(self):
        # When debugging where an object has been deleted, name it from its last recorded values
        # rather than blow up.
        deleted_transition = False
        try:
            transition = self.transition
        except ObjectDoesNotExist:
            deleted_transition = True
            if self.transition_id is not None:
                transition = last_recorded(Transition, self.transition_id)
            else:
                transition = None

        deleted_permission = False
        try:
            permission = self.permission
        except ObjectDoesNotExist:
            deleted_permission = True
            permission = self.historical_permission_codename

        return (
            f"{'deleted ' if deleted_transition else ''}transition: {transition}, "
            f"{'deleted ' if deleted_permission else ''}permission: {permission}"
        )

    if django.VERSION >= (6, 0):

        def save(self, **kwargs):
            # Set the historical permission codename, so if the permission is deleted,
            # we don't just have an id that may not be the same on the server.
            self.historical_permission_codename = self.permission.codename
            self.historical_permission_content_type_app_label = self.permission.content_type.app_label
            self.historical_permission_content_type_model_name = self.permission.content_type.model
            super().save(**kwargs)
    else:

        def save(self, *args, **kwargs):
            # Set the historical permission codename, so if the permission is deleted,
            # we don't just have an id that may not be the same on the server.
            self.historical_permission_codename = self.permission.codename
            self.historical_permission_content_type_app_label = self.permission.content_type.app_label
            self.historical_permission_content_type_model_name = self.permission.content_type.model
            super().save(*args, **kwargs)


class TransitionSource(models.Model):
    """
    A transition can have multiple sources.
    """

    transition = models.ForeignKey(
        "Transition",
        on_delete=models.PROTECT,
    )
    source = models.ForeignKey(
        "State",
        on_delete=models.PROTECT,
    )
    # This transition is intentionally ignored (no-op) when applied from this source state.
    ignored = models.BooleanField(default=False)

    class Meta(BaseModelMeta):
        default_related_name = "transition_sources"
        constraints = [
            models.UniqueConstraint(
                fields=["transition", "source"],
                name="unique_transition_source",
            )
        ]
        ordering = ["source__code", "transition__code"]

    def __str__(self):
        # When debugging where an object has been deleted, name it from its last recorded values
        # rather than blow up.
        deleted_transition = False
        try:
            transition = self.transition
        except ObjectDoesNotExist:
            deleted_transition = True
            if self.transition_id is not None:
                transition = last_recorded(Transition, self.transition_id)
            else:
                transition = None

        deleted_state = False
        try:
            state = self.source
        except ObjectDoesNotExist:
            deleted_state = True
            if self.source_id is not None:
                state = last_recorded(State, self.source_id)
            else:
                state = None

        return (
            f"{'deleted ' if deleted_transition else ''}transition: {transition}, "
            f"{'deleted ' if deleted_state else ''}source: {state}"
        )


class ObjectStateProxy(models.Model):
    """
    A view that adds workflow's content type as a calculated field on object state.
    Used for HasWorkflowMixin.object_states GenericRelation (reverse GenericForeignKey).
    """

    workflow = models.ForeignKey(
        "Workflow",
        on_delete=models.DO_NOTHING,
    )
    object_id = models.PositiveIntegerField()
    state = models.ForeignKey(
        "State",
        on_delete=models.DO_NOTHING,
    )

    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.DO_NOTHING,
    )
    object_state = models.ForeignKey(
        "ObjectState",
        on_delete=models.DO_NOTHING,
    )
    object = GenericForeignKey("content_type", "object_id")

    class Meta(BaseModelMeta):
        managed = False
        db_table = "vueda_workflow_objectstateproxy"
        default_related_name = "object_states_proxy"

    def __str__(self):
        return f"workflow: {self.workflow}, object:{self.object}, state:{self.state}"


class ObjectState(models.Model):
    """
    A workflow object is a row in the database that represents an object that has a workflow and a state.
    """

    workflow = models.ForeignKey(
        "Workflow",
        on_delete=models.PROTECT,
    )
    object_id = models.PositiveIntegerField()
    state = models.ForeignKey(
        "State",
        on_delete=models.PROTECT,
    )
    object_state_proxy = GenericRelation(
        ObjectStateProxy,
        content_type_field="content_type",
        object_id_field="object_id",
    )
    formatted_name_lookup_expression = "state__name"

    class Meta(BaseModelMeta):
        default_related_name = "object_states"
        constraints = [
            models.UniqueConstraint(
                fields=["workflow", "object_id"],
                name="unique_object_state",
            )
        ]

    def __str__(self):
        return f"workflow: {self.workflow}, object:{self.object_id}, state:{self.state}"


# ``Workflow`` subclasses ``Lookup``, so the ``class Vueda.History`` contributor already registered
# it. The models below are plain ``models.Model`` subclasses, which that contributor never sees, so
# they register directly. Every workflow record then lands in an event model carrying the same
# context field, append-only behaviour, and mandatory exclusions as a policy-driven model.
track_model(WorkflowPermission)
track_model(State)
track_model(StatePermission)
track_model(InitialState)
track_model(Transition)
track_model(TransitionPermission)
track_model(TransitionSource)
track_model(ObjectState)


def _permitted_transition_ids(
    model: type["HasWorkflowModelMixin"],
    transitions: list[Transition],
    state_by_object: dict[int, int],
    user: User,
) -> list[int]:
    """
    Return the ids of ``transitions`` that ``user`` may take on at least one of the objects in
    ``state_by_object``, which maps an object id to the id of that object's current state.

    The loop runs object by object rather than transition by transition, so each object's workflow,
    state, and state rules resolve once inside its own ``cached_workflow_state()`` block. A
    transition already permitted on an earlier object is not asked about again.
    """
    sources_by_transition: dict[int, set[int]] = {}
    for transition_id, source_id in TransitionSource.objects.filter(
        transition__in=[transition.id for transition in transitions],
    ).values_list("transition_id", "source_id"):
        sources_by_transition.setdefault(transition_id, set()).add(source_id)
    permitted_ids = set()
    # ``state_by_object`` names these objects explicitly, so read them past any default manager
    # filtering, the same way the object state lookup that produced it does.
    for instance in model._base_manager.filter(pk__in=list(state_by_object)):
        state_id = state_by_object[instance.pk]
        candidates = [
            transition
            for transition in transitions
            if transition.id not in permitted_ids and state_id in sources_by_transition.get(transition.id, ())
        ]
        if not candidates:
            continue
        with instance.cached_workflow_state():
            for transition in candidates:
                if instance.check_transition_permission(transition, user):
                    permitted_ids.add(transition.id)
    return [transition.id for transition in transitions if transition.id in permitted_ids]


class HasWorkflowModelMixin(models.Model):
    """
    Model-level utility methods for objects with workflow.
    """

    # there is no generic one to one, so this is plural despite the fact that there is only one
    object_states_proxy = GenericRelation(
        ObjectStateProxy,
    )

    # Populated only inside ``cached_workflow_state``; ``None`` means "read through to the database".
    _workflow_state_cache: dict | None = None

    class Meta:
        abstract = True

    if django.VERSION >= (6, 0):

        def save(self, **kwargs):
            """
            Save the object and create a workflow object if it doesn't exist.
            """
            super().save(**kwargs)
            if not self.object_state:
                self.create_object_state()
    else:

        def save(self, *args, **kwargs):
            """
            Save the object and create a workflow object if it doesn't exist.
            """
            super().save(*args, **kwargs)
            if not self.object_state:
                self.create_object_state()

    def create_object_state(self):
        """
        Create a workflow object for this object.
        """
        workflow = self.workflow
        if workflow:
            ObjectState.objects.create(
                workflow=workflow,
                object_id=self.id,
                state=workflow.initial_state.state,
            )

    @classmethod
    def get_content_type(cls) -> ContentType:
        """Return the ``ContentType`` for this model class. Result is cached by Django."""
        # get_for_model() is cached
        return ContentType.objects.get_for_model(cls)

    @contextmanager
    def cached_workflow_state(self) -> Iterator[None]:
        """
        Hold this object's ``workflow`` and ``object_state`` for the duration of the block.

        One authorization pass reads both repeatedly: ``check_state_permission`` resolves the
        current state for every permission it is asked about, and ``VuedaUserMixin.has_perm``
        reads the workflow to decide whether state rules apply at all. Without this, each read
        is a fresh query.

        The cache is scoped to a block rather than to the instance on purpose. ``execute_transition``
        checks a transition, takes a row lock, and checks again against the locked row, and that
        second check has to observe any state written in between. Nested blocks reuse the
        outermost cache and leave it to the outermost block to clear.
        """
        if self._workflow_state_cache is not None:
            yield
            return
        self._workflow_state_cache = {}
        try:
            yield
        finally:
            self._workflow_state_cache = None

    @property
    def workflow(self) -> Workflow | None:
        """Return the ``Workflow`` configured for this model, or ``None`` if none exists."""
        cache = self._workflow_state_cache
        if cache is not None and "workflow" in cache:
            return cache["workflow"]
        workflow = Workflow.objects.filter(content_type=self.get_content_type()).first()
        if cache is not None:
            cache["workflow"] = workflow
        return workflow

    @property
    def object_state(self) -> ObjectState | None:
        """Return the ``ObjectState`` record for this instance, or ``None`` if not yet created."""
        cache = self._workflow_state_cache
        if cache is not None and "object_state" in cache:
            return cache["object_state"]
        osp = self.object_states_proxy.select_related("object_state__state").first()
        object_state = osp and osp.object_state
        if cache is not None:
            cache["object_state"] = object_state
        return object_state

    @property
    def workflow_state(self) -> State | None:
        """Return the current ``State`` for this instance, or ``None`` if no state exists."""
        object_state = self.object_state
        return object_state and object_state.state

    def available_transitions(self, user: User | None = None) -> QuerySet[Transition]:
        """
        Returns available transitions for this object.

        The whole pass runs inside one ``cached_workflow_state()`` block, so the object's workflow,
        current state, and state rules are read once rather than once per candidate transition.
        """
        with self.cached_workflow_state():
            if (
                user is not None
                and not WorkflowPermission.objects.filter(
                    workflow__content_type=self.get_content_type(),
                ).exists()
            ):
                raise PermissionDenied(f"No workflow permission(s) defined for {self.get_content_type()!r}")
            transitions = self.fast_available_transitions()
            return transitions.filter(pk__in=[t.id for t in transitions if self.check_transition_permission(t, user)])

    def fast_available_transitions(self) -> QuerySet[Transition]:
        """
        Returns available transitions for this object without permission checks.
        """
        transitions = (
            Transition.objects.filter(
                workflow=self.workflow,
                transition_sources__source=self.workflow_state,
                transition_sources__ignored=False,
            )
            .select_related("target")
            .all()
        )
        return transitions

    @classmethod
    def available_transitions_for(
        cls,
        objs: list["HasWorkflowModelMixin"] | list[int] | QuerySet["HasWorkflowModelMixin"],
        user: User | None = None,
    ) -> QuerySet[Transition]:
        """
        Returns available transitions for a list of objects.

        A transition is available when at least one of ``objs`` sits in one of its source states and
        ``user`` may take it on that object. This matches the source-state filter, which admits a
        transition leaving any of the objects' states rather than all of them.

        ``check_transition_permission`` resolves ``user.has_perms(perms, obj=...)``, so the answer
        depends on the object it receives. This classmethod therefore loads the concrete instances
        and asks each candidate object rather than asking the model class.
        """
        workflow = Workflow.objects.get(content_type=cls.get_content_type())
        workflow_permissions = [
            ".".join(permission_parts)
            for permission_parts in workflow.workflow_permissions.values_list(
                "permission__content_type__app_label", "permission__codename"
            )
        ]
        if user is not None and (not workflow_permissions or not user.has_perms(workflow_permissions)):
            raise PermissionDenied(
                f"User {user.get_username()!r} does not have workflow permissions for {cls.get_content_type()!r}"
            )
        state_by_object = dict(
            ObjectState.objects.filter(
                workflow__content_type=cls.get_content_type(),
                object_id__in=[getattr(obj, "pk", obj) for obj in objs],
            ).values_list("object_id", "state")
        )
        transitions = (
            Transition.objects.filter(
                workflow=workflow,
                transition_sources__source__in=set(state_by_object.values()),
            )
            .exclude(transition_permissions__isnull=True)
            .select_related("target")
            .all()
        )
        candidates = list(transitions)
        if user is None:
            # Programmatic use sees every candidate, matching ``check_transition_permission``.
            permitted_ids = [transition.id for transition in candidates]
        else:
            permitted_ids = _permitted_transition_ids(cls, candidates, state_by_object, user)
        return transitions.filter(pk__in=permitted_ids)

    @classmethod
    def check_workflow_permission(cls, user: User | None = None) -> bool:
        """
        user as None means superuser, pass django's AnonymousUser if you want to check for anonymous user.
        """
        # programmatic use
        if user is None:
            return True
        workflow = Workflow.objects.get(content_type=cls.get_content_type())
        workflow_permissions = [
            ".".join(permission_parts)
            for permission_parts in WorkflowPermission.objects.filter(
                workflow=workflow,
            ).values_list("permission__content_type__app_label", "permission__codename")
        ]
        # workflow state permissions are inherently row level, so skip the generic check if we have state permissions
        if StatePermission.objects.filter(state__workflow=workflow).exists():
            return True
        # not even superuser can get a workflow without permissions
        if workflow_permissions and user.has_perms(workflow_permissions):
            return True
        raise PermissionDenied(f"User {user.get_username()!r} does not have permission for workflow {workflow.code!r}.")

    def check_state_permission(
        self,
        perm: str,
        groups: Iterable[str] | Iterable[int] | QuerySet["Group"],
        caller: models.Model | None = None,
    ) -> bool | None:
        """
        Check whether the object's current state grants or denies ``perm`` for any of ``groups``.
        Returns ``True`` (grant), ``False`` (deny), or ``None`` (no state rule applies).
        When multiple rules match, deny takes precedence over grant.

        ``caller`` is the user ``groups`` belongs to. Passing it lets one ``cached_workflow_state()``
        block resolve that caller's rules once instead of once per permission. Without it every call
        resolves, which is what an uncached caller gets.
        """
        return self._state_permission_rules(groups, caller).get(perm.rsplit(".", maxsplit=1)[-1])

    def _state_permission_rules(
        self,
        groups: Iterable[str] | Iterable[int] | QuerySet["Group"],
        caller: models.Model | None = None,
    ) -> dict[str, bool]:
        """
        Every state rule that applies to this object for ``groups``, keyed by permission codename.

        One query resolves every codename the current state grants or denies. ``has_perm`` asks
        about one permission at a time, so a pass evaluating several against one object would
        otherwise pay a round trip for each.

        A codename absent from the mapping has no matching rule, which is the ``None`` that
        ``check_state_permission`` returns.

        The cache is keyed by ``caller`` rather than by the group set, so ``groups`` stays a
        subquery on the rule lookup and never becomes a query of its own. Each new block resolves
        again, so a caller whose group membership changed is read afresh on its next authorization
        pass even when the same user instance is reused.
        """
        cache = self._workflow_state_cache
        caller_key = (caller._meta.label, caller.pk) if caller is not None and caller.pk is not None else None
        if cache is not None and caller_key is not None:
            by_caller = cache.setdefault("state_permission_rules", {})
            if caller_key in by_caller:
                return by_caller[caller_key]

        matched = defaultdict(list)
        for codename, grant_or_deny in StatePermission.objects.filter(
            state=self.workflow_state,
            permission__content_type=self.get_content_type(),
            group__in=groups,
        ).values_list("permission__codename", "grant_or_deny"):
            matched[codename].append(grant_or_deny)
        rules = {}
        for codename, values in matched.items():
            # If multiple group rules match, deny takes precedence over grant.
            if any(value is False for value in values):
                rules[codename] = False
            elif any(value is True for value in values):
                rules[codename] = True
        if cache is not None and caller_key is not None:
            cache["state_permission_rules"][caller_key] = rules
        return rules

    def check_transition_permission(self, transition: Transition, user: User | None = None) -> bool:
        """
        user as None means superuser, pass django's AnonymousUser if you want to check for anonymous user.
        """
        # code should see all transitions
        if user is None:
            return True
        transition_permissions = [
            ".".join(x)
            for x in transition.transition_permissions.values_list(
                "permission__content_type__app_label", "permission__codename"
            )
        ]
        # check if user has all permissions, fail if there are no permissions
        # to guard auto transitions even from superusers
        if not transition_permissions:
            return False
        return user.has_perms(transition_permissions, obj=self)

    def allow_transition(self, transition: Transition, user: User | None = None) -> bool | str:
        """
        Check if transition is allowed for this object.
        return falsy or a string will raise a InvalidTransitionError exception in apply_transition

        Resolves only ``transition``. The cost does not grow with the number of other transitions
        leaving the current state. Use ``available_transitions`` when the permitted set itself is
        what is wanted.
        """
        with self.cached_workflow_state():
            if (
                user is not None
                and not WorkflowPermission.objects.filter(
                    workflow__content_type=self.get_content_type(),
                ).exists()
            ):
                raise PermissionDenied(f"No workflow permission(s) defined for {self.get_content_type()!r}")
            workflow = self.workflow
            if workflow is None:
                return False
            # The single-transition form of the source-state filter in fast_available_transitions.
            if not TransitionSource.objects.filter(
                transition=transition,
                transition__workflow=workflow,
                source=self.workflow_state,
                ignored=False,
            ).exists():
                return False
            return self.check_transition_permission(transition, user)

    def get_transition_warnings(self, transition: Transition, user: User | None = None) -> dict:
        """
        Hook returning advisory warnings for a transition, consulted before it is written.

        Override to report warnings that should gate the transition behind confirmation (HTTP 409)
        without denying it outright the way ``allow_transition`` does. Return the aggregate
        ``{field: [messages]}`` warnings dict (use ``"non_field_errors"`` for warnings not tied to a
        field). The default returns ``{}``, meaning no confirmation is required. See
        ``vueda.core.exceptions.gate_warnings`` for how the caller turns this into a 409.
        """
        return {}

    def get_transition(self, transition_code: str) -> Transition:
        """Return the ``Transition`` with the given code in this object's workflow. Raises ``Transition.DoesNotExist`` if not found."""
        try:
            return Transition.objects.get(
                workflow=self.workflow,
                code=transition_code,
            )
        except Transition.DoesNotExist as e:
            raise Transition.DoesNotExist(
                f"Transition {transition_code!r} does not exist for workflow {self.workflow.code!r}."
            ) from e

    def should_ignore_transition_from_state(self, transition: Transition) -> bool:
        """
        Return True if the transition should be treated as a no-op from the current state.
        """
        return TransitionSource.objects.filter(
            transition=transition,
            source=self.workflow_state,
            ignored=True,
        ).exists()

    def check_transition(self, transition_code: str, user: User | None = None) -> tuple[Transition, User]:
        """
        Validate that ``transition_code`` can be applied by ``user``, without writing anything.

        Performs the same permission and ``allow_transition`` checks as ``apply_transition``
        (raising the same exceptions), and resolves the effective ``user`` (falling back to the
        request user from history context, then the system user, exactly as ``apply_transition``
        does). Callers that need to gate a transition on warnings (see ``get_transition_warnings``)
        before writing should call this first, then ``apply_checked_transition``.
        """
        # One cache per call, so the second check under the row lock re-reads the state the lock protects.
        with self.cached_workflow_state():
            self.check_workflow_permission(user)
            transition: Transition = self.get_transition(transition_code)
            if user is None:
                # History middleware records the acting user on the request's action, which is where
                # a caller that was given no user of its own finds one.
                acting_user_id = current_action_metadata().get("user")
                user = User.objects.filter(pk=acting_user_id).first() if acting_user_id else None
                if user is None:
                    user = get_system_user()
            if not self.check_transition_permission(transition, user):
                raise PermissionDenied(
                    f"User {user.get_username()!r} does not have permission for transition"
                    f" {transition.name}({transition.code!r})"
                )
            allowed_or_denied_or_denied_with_message = self.allow_transition(transition, user)
            if not allowed_or_denied_or_denied_with_message or isinstance(
                allowed_or_denied_or_denied_with_message, str
            ):
                raise InvalidTransitionError(
                    allowed_or_denied_or_denied_with_message
                    or f"Transition {transition.code!r} not available from state {self.workflow_state.code!r}"
                )
            return transition, user

    def apply_checked_transition(
        self, transition: Transition, user: User | None = None, dry_run: bool = False
    ) -> tuple[State, str | None]:
        """
        Write an already-authorized transition (as returned by ``check_transition``) without
        re-checking permissions or availability.

        Returns the target state and the object state's new revision, which is ``None`` when the
        object has no state row to record.
        """
        self.update_object_state(transition.target, user=user, change_reason=f"Transition {transition.code!r} applied.")
        self.on_transition(transition, user, dry_run)
        return transition.target, object_revision(self.object_state)

    def apply_transition(
        self, transition_code: str, user: User | None = None, dry_run: bool = False
    ) -> tuple[State, str | None]:
        """
        Apply a transition to the object.
        """
        transition, user = self.check_transition(transition_code, user)
        return self.apply_checked_transition(transition, user, dry_run)

    def fast_transition(self, transition_code: str) -> None:
        """
        Apply a transition without permission checks. Raises ``InvalidTransitionError``
        if the transition is not available from the current state, unless the
        ``TransitionSource`` is marked ``ignored``, in which case ``on_transition_ignored`` is called.
        """
        transition: Transition = self.get_transition(transition_code)
        transitions = self.fast_available_transitions()
        if transition not in transitions:
            if self.should_ignore_transition_from_state(transition):
                self.on_transition_ignored(transition)
                return
            raise InvalidTransitionError(
                f"Transition {transition_code!r} not available from state {self.workflow_state.code!r}"
            )
        self.update_object_state(transition.target)
        self.on_transition(transition)

    def update_object_state(self, state, *, user=None, change_reason=None):  # Used in tests
        """
        Sets the history user to the system user if a user isn't passed in.
        """
        object_state = self.object_state
        object_state.state = state
        object_state._history_user = user if user is not None else get_system_user()
        if change_reason is not None:
            object_state._change_reason = change_reason
        object_state.save()

    def on_transition(self, transition: Transition, user: User | None = None, dry_run: bool = False):
        """
        Override this method to add custom logic on transition.
        """

    def on_transition_ignored(self, transition: Transition, user: User | None = None):
        """
        Override this method to add custom logic when a transition is intentionally ignored.
        """
