from typing import Iterable

from vueda.utils import create_historical_record


def setup_workflow(
    apps,
    workflow_code: str,
    workflow_name: str,
    content_type,
    states: Iterable[tuple[str, str]],
    transitions: Iterable[tuple[str, str, str]],
    initial_state: str,
    transition_sources: Iterable[tuple[str, str]],
    workflow_permissions: Iterable[tuple[any, str, str]],
    transition_permissions: Iterable[tuple[tuple[any, str, str], Iterable[str]]],
    state_permissions: Iterable[tuple[str, tuple[any, str, str], bool]] = (),
):
    """
    When using this, add auth, permissions and workflows for migration dependencies.
    Probably contenttypes since some arguments are contenttypes.
    """
    workflow_class = apps.get_model("workflows", "Workflow")
    target_model_class = apps.get_model(content_type.app_label, content_type.model)
    object_state_class = apps.get_model("workflows", "ObjectState")
    permission_class = apps.get_model("auth", "Permission")
    workflow = workflow_class.objects.create(
        name=workflow_name,
        code=workflow_code,
        content_type=content_type,
    )

    created_states = {}
    for state_code, state_name in states:
        created_states[state_code] = workflow.states.create(code=state_code, name=state_name)

    created_transitions = {}
    for transition_code, transition_name, target_state_code in transitions:
        created_transitions[transition_code] = workflow.transitions.create(
            code=transition_code, name=transition_name, target=created_states[target_state_code]
        )

    initial_state = workflow.states.get(code=initial_state)

    initial_state_class = apps.get_model("workflows", "InitialState")
    initial_state_class.objects.create(
        workflow=workflow,
        state=initial_state,
    )

    for source_state_code, transition_code in transition_sources:
        created_transitions[transition_code].transition_sources.create(
            source=created_states[source_state_code],
        )

    for permission_content_type, permission_codename, permission_name in workflow_permissions:
        # the permission may not exist yet, if this is the first time any migration is run
        permission = permission_class.objects.get_or_create(
            content_type=permission_content_type,
            codename=permission_codename,
            defaults={"name": permission_name},
        )[0]
        workflow.workflow_permissions.create(permission=permission)

    for (
        [permission_content_type, permission_codename, permission_name],
        state_codes,
        grant_or_deny,
    ) in state_permissions:
        # the permission may not exist yet, if this is the first time any migration is run
        permission = permission_class.objects.get_or_create(
            content_type=permission_content_type,
            codename=permission_codename,
            defaults={"name": permission_name},
        )[0]
        for state_code in state_codes:
            workflow.workflow_permissions.create(
                permission=permission, state=workflow.states.get(code=state_code), grant_or_deny=grant_or_deny
            )

    for (
        [permission_content_type, permission_codename, permission_name],
        transition_codes,
    ) in transition_permissions:
        # the permission may not exist yet, if this is the first time any migration is run
        permission = permission_class.objects.get_or_create(
            content_type=permission_content_type,
            codename=permission_codename,
            defaults={"name": permission_name},
        )[0]
        for transition_code in transition_codes:
            transition = created_transitions[transition_code]
            transition.transition_permissions.create(permission=permission)

    # create object states for all existing target models
    for pk in target_model_class.objects.all().values_list("pk", flat=True):
        object_state = object_state_class.objects.get_or_create(
            workflow_id=workflow.id, object_id=pk, defaults={"state": initial_state}
        )[0]
        create_historical_record(apps, object_state, history_type="+")
