from typing import Iterable
from typing import List
from typing import Optional
from typing import Union

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.fields import GenericRelation
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ObjectDoesNotExist
from django.db import models
from django.db.models import QuerySet
from rest_framework.exceptions import PermissionDenied
from simple_history.models import HistoricalRecords

from vueda.core.models import BaseModelMeta
from vueda.core.models import Lookup
from vueda.core.utils import get_system_user
from vueda.history.models import SimpleHistoryModelMixin
from vueda.workflow.exceptions import InvalidTransitionError


User = get_user_model()


class Workflow(SimpleHistoryModelMixin, Lookup):
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

    def __str__(self):
        return f"name: {self.name}, code: {self.code}"

    def save(self, *args, **kwargs):
        self.historical_app_label = self.content_type.app_label
        self.historical_model = self.content_type.model

        super().save(*args, **kwargs)


class WorkflowPermission(SimpleHistoryModelMixin):
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

    def __str__(self):
        # When debugging where an object has been deleted, get data from the history rather than blow up.
        deleted_workflow = False
        try:
            workflow = self.workflow
        except ObjectDoesNotExist:
            deleted_workflow = True
            if self.workflow_id is not None:
                workflow = Workflow.history.filter(id=self.workflow_id).latest()
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

    def save(self, *args, **kwargs):
        # Set the historical permission codename, so if the permission is deleted,
        # we don't just have an id that may not be the same on the server.
        self.historical_permission_codename = self.permission.codename
        self.historical_permission_content_type_app_label = self.permission.content_type.app_label
        self.historical_permission_content_type_model_name = self.permission.content_type.model

        super().save(*args, **kwargs)


class State(SimpleHistoryModelMixin):
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

    def __str__(self):
        return f"name: {self.name}, code: {self.code}"


class StatePermission(SimpleHistoryModelMixin):
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

    def __str__(self):
        # When debugging where an object has been deleted, get data from the history rather than blow up.
        deleted_state = False
        try:
            state = self.state
        except ObjectDoesNotExist:
            deleted_state = True
            if self.state_id is not None:
                state = State.history.filter(id=self.state_id).latest()
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

    def save(self, *args, **kwargs):
        # Set the historical permission codename, so if the permission is deleted,
        # we don't just have an id that may not be the same on the server.
        self.historical_permission_codename = self.permission.codename
        self.historical_permission_content_type_app_label = self.permission.content_type.app_label
        self.historical_permission_content_type_model_name = self.permission.content_type.model
        self.historical_group_name = self.group.name
        super().save(*args, **kwargs)


class InitialState(SimpleHistoryModelMixin):
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

    def __str__(self):
        # When debugging where an object has been deleted, get data from the history rather than blow up.
        deleted_workflow = False
        try:
            workflow = self.workflow
        except ObjectDoesNotExist:
            deleted_workflow = True
            if self.workflow_id is not None:
                workflow = Workflow.history.filter(id=self.workflow_id).latest()
            else:
                workflow = None

        deleted_state = False
        try:
            state = self.state
        except ObjectDoesNotExist:
            deleted_state = True
            if self.state_id is not None:
                state = State.history.filter(id=self.state_id).latest()
            else:
                state = None

        return (
            f"{'deleted ' if deleted_workflow else ''}workflow: {workflow}, "
            f"{'deleted ' if deleted_state else ''}state: {state} "
        )


class Transition(SimpleHistoryModelMixin):
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

    def __str__(self):
        # When debugging where an object has been deleted, get data from the history rather than blow up.
        deleted_state = False
        try:
            state = self.target
        except ObjectDoesNotExist:
            deleted_state = True
            if self.target_id is not None:
                state = State.history.filter(id=self.target_id).latest()
            else:
                state = None

        return f"name: {self.name}, code: {self.code}, {'deleted ' if deleted_state else ''}target: {state}"


class TransitionPermission(SimpleHistoryModelMixin):
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

    def __str__(self):
        # When debugging where an object has been deleted, get data from the history rather than blow up.
        deleted_transition = False
        try:
            transition = self.transition
        except ObjectDoesNotExist:
            deleted_transition = True
            if self.transition_id is not None:
                transition = Transition.history.filter(id=self.transition_id).latest()
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

    def save(self, *args, **kwargs):
        # Set the historical permission codename, so if the permission is deleted,
        # we don't just have an id that may not be the same on the server.
        self.historical_permission_codename = self.permission.codename
        self.historical_permission_content_type_app_label = self.permission.content_type.app_label
        self.historical_permission_content_type_model_name = self.permission.content_type.model
        super().save(*args, **kwargs)


class TransitionSource(SimpleHistoryModelMixin):
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

    class Meta(BaseModelMeta):
        default_related_name = "transition_sources"
        constraints = [
            models.UniqueConstraint(
                fields=["transition", "source"],
                name="unique_transition_source",
            )
        ]

    def __str__(self):
        # When debugging where an object has been deleted, get data from the history rather than blow up.
        deleted_transition = False
        try:
            transition = self.transition
        except ObjectDoesNotExist:
            deleted_transition = True
            if self.transition_id is not None:
                transition = Transition.history.filter(id=self.transition_id).latest()
            else:
                transition = None

        deleted_state = False
        try:
            state = self.source
        except ObjectDoesNotExist:
            deleted_state = True
            if self.source_id is not None:
                state = State.history.filter(id=self.source_id).latest()
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


class ObjectState(SimpleHistoryModelMixin):
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


class HasWorkflowModelMixin(models.Model):
    """
    Model-level utility methods for objects with workflow.
    """

    # there is no generic one to one, so this is plural despite the fact that there is only one
    object_states_proxy = GenericRelation(
        ObjectStateProxy,
        content_type_field="content_type_id",
        object_id_field="object_id",
    )

    class Meta:
        abstract = True

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
    def content_type(cls) -> ContentType:
        # get_for_model() is cached
        return ContentType.objects.get_for_model(cls)

    @property
    def workflow(self) -> Optional[Workflow]:
        return Workflow.objects.filter(content_type=self.content_type()).first()

    @property
    def object_state(self) -> Optional[ObjectState]:
        osp = self.object_states_proxy.all().first()
        return osp and osp.object_state

    @property
    def workflow_state(self) -> Optional[State]:
        object_state = self.object_state
        return object_state and object_state.state

    def available_transitions(self, user: Optional[User] = None) -> QuerySet[Transition]:
        """
        Returns available transitions for this object.
        """
        if (
            user is not None
            and not WorkflowPermission.objects.filter(
                workflow__content_type=self.content_type(),
            ).exists()
        ):
            raise PermissionDenied(
                f"User {user.get_username()!r} does not have workflow permissions for {self.content_type()!r}"
            )
        transitions = (
            Transition.objects.filter(
                workflow=self.workflow,
                transition_sources__source=self.workflow_state,
            )
            .exclude(transition_permissions__isnull=True)
            .select_related("target")
            .all()
        )
        return transitions.filter(pk__in=[t.id for t in transitions if self.check_transition_permission(t, user)])

    @classmethod
    def available_transitions_for(
        cls,
        objs: Union[List["HasWorkflowModelMixin"], List[int], QuerySet["HasWorkflowModelMixin"]],
        user: Optional[User] = None,
    ) -> QuerySet[Transition]:
        """
        Returns available transitions for a list of objects.
        """
        workflow = Workflow.objects.get(content_type=cls.content_type()).workflow
        if user is not None and user.has_perms(
            [
                ".".join(permission_parts)
                for permission_parts in workflow.workflow_permissions.values_list(
                    "permission__content_type__app_label", "permission__codename"
                )
            ]
        ):
            raise PermissionDenied(
                f"User {user.get_username()!r} does not have workflow permissions for {cls.content_type()!r}"
            )
        object_states = ObjectState.objects.filter(
            workflow__content_type=cls.content_type(),
            object_id__in=objs,
        ).values_list("state", flat=True)
        transitions = (
            Transition.objects.filter(
                workflow=workflow,
                transition_sources__source__in=object_states,
            )
            .exclude(transition_permissions__isnull=True)
            .select_related("target")
            .all()
        )
        return transitions.filter(pk__in=[t.id for t in transitions if cls.check_transition_permission(t, user)])

    @classmethod
    def check_workflow_permission(cls, user: Optional[User] = None) -> bool:
        """
        user as None means superuser, pass django's AnonymousUser if you want to check for anonymous user.
        """
        # programmatic use
        if user is None:
            return True
        workflow = Workflow.objects.get(content_type=cls.content_type())
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
        self, perm: str, groups: Union[Iterable[str], Iterable[int], QuerySet["Group"]]
    ) -> Optional[bool]:
        # for our state are there any StatePermissions related to this permission?
        state_permission = StatePermission.objects.filter(
            state=self.workflow_state,
            permission__codename=perm.split(".")[-1],
            permission__content_type=self.content_type(),
            group__in=groups,
        ).first()
        if state_permission is None:
            return None
        return state_permission.grant_or_deny

    def check_transition_permission(self, transition: Transition, user: Optional[User] = None) -> bool:
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

    def allow_transition(self, transition: Transition, user: Optional[User] = None) -> Union[bool, str]:
        """
        Check if transition is allowed for this object.
        return falsy or a string will raise a InvalidTransitionError exception in apply_transition
        """
        return transition in self.available_transitions(user=user)

    def get_transition(self, transition_code: str) -> Transition:
        try:
            return Transition.objects.get(
                workflow=self.workflow,
                code=transition_code,
            )
        except Transition.DoesNotExist:
            raise ValueError(f"Transition {transition_code!r} does not exist for workflow {self.workflow.code!r}.")

    def apply_transition(self, transition_code: str, user: Optional[User] = None) -> tuple[State, Optional[int]]:
        """
        Apply a transition to the object.
        """
        self.check_workflow_permission(user)
        transition: Transition = self.get_transition(transition_code)
        if user is None:
            # this assumes we are using HistoryRequestMiddleware, which populates the request in the history context
            request = getattr(HistoricalRecords.context, "request", None)
            if request:
                user = request.user
            else:
                user = get_system_user()
        if not self.check_transition_permission(transition, user):
            raise PermissionDenied(
                f"User {user.get_username()!r} does not have permission for transition"
                f" {transition.name}({transition.code!r})"
            )
        allowed_or_denied_or_denied_with_message = self.allow_transition(transition, user)
        if not allowed_or_denied_or_denied_with_message or isinstance(allowed_or_denied_or_denied_with_message, str):
            raise InvalidTransitionError(
                allowed_or_denied_or_denied_with_message
                or f"Transition {transition.code!r} not available from state {self.workflow_state.code!r}"
            )
        object_state = self.object_state
        object_state._history_user = user if user is not None else get_system_user()
        object_state._change_reason = f"Transition {transition.code!r} applied."
        object_state.state = transition.target
        object_state.save()
        self.on_transition(transition, user)
        if hasattr(object_state, "history"):
            # return the new latest history record id
            return transition.target, object_state.history.latest().history_id
        return transition.target, None

    def on_transition(self, transition: Transition, user: Optional[User] = None):
        """
        Override this method to add custom logic on transition.
        """
        pass
