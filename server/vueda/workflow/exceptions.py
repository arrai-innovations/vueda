"""Exceptions raised by workflow configuration and state machine transitions."""

__all__ = (
    "AlreadyInTargetStateError",
    "InvalidTransitionError",
    "WorkflowNotConfiguredError",
)

from django.core.exceptions import ImproperlyConfigured


class InvalidTransitionError(Exception):
    pass


class AlreadyInTargetStateError(InvalidTransitionError):
    """A transition is refused, and the object is already in the state that the transition moves it to.

    ``check_transition`` raises this subclass so that a caller can tell an object that needs no change apart from one
    that cannot take the transition. A bulk execute-transition marks such an object with ``already_in_target_state``.
    """


class WorkflowNotConfiguredError(ImproperlyConfigured):
    """A model enables ``class Vueda.Workflow``, but no ``Workflow`` definition exists for it.

    Enabling workflow promises the workflow fields, filters, and authorization rules. Without the
    definition there are no states or transitions to honour that promise with, so every workflow
    path reports this one error rather than treating the model as an ordinary one. The API
    exception handler returns it as HTTP 500 with the message as ``detail``.
    """

    def __init__(self, model):
        self.model = model
        super().__init__(
            f"{model._meta.label} enables class Vueda.Workflow but has no workflow definition. Apply the "
            "migration that creates its workflow, or set enabled = False until the definition exists."
        )
