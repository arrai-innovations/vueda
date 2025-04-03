import contextlib
import copy
import datetime
import importlib
import inspect
import io
import os
import sys
from pathlib import Path
from pprint import pformat

from django.apps import apps as django_apps
from django.contrib.auth.management import create_permissions
from django.contrib.contenttypes.models import ContentType
from django.core.management import BaseCommand
from django.core.management import call_command
from django.db import migrations
from django.db.models import Q
from django.db.transaction import atomic
from django.utils import timezone

from vueda.workflow import models
from vueda.workflow.custom_migration_operations import SkippableRunSQL


#############################################################################
# A complex situation:
#############################################################################

# Person A and Person B are working in the same branch.
# Both are making changes to workflow, and will make a workflow migration when done.
# Person A pushes their changes into the branch.
# Person B pull and runs the migrations.
# Person B then has history records related to the changes they were working on that
# are older than migrations that were run for the workflow changes that Person A made.
# Person B then tries to make their workflow migration.

# If Person A and Person B are making changes in different branches, then things get
# even more complex.

# So, when figuring out what history records to deal with, we will ignore any history
# records created by workflow migrations, and only look for history records after the
# last workflow migration was run. But, we also need the last history record used by
# a workflow migration, or else we won't detect any changes.

# Doing things this way should cover most situations.  But, multiple people making
# workflow changes at the same time isn't tested.  So, we can't predict if the migrations
# will get created correctly, or run successfully.  Conflicting changes are definitely
# going to have issues.

# If anyone has the time to figure out how to handle changes in a complex situation
# like this, please feel free to contribute.  Otherwise, it might be better to use one of
# the mentioned workarounds here:

# 1. Combine changed_data lists.  If there are conflicting changes, you could merge
# changes together.  We need to apply the changes in the order they were done in history,
# to prevent duplicate key violations, so combining should be possible.  This is a good way
# to make the migration work in tests and on the server, but it makes things difficult for
# the first person that committed to get the changes from the second person.  They could
# roll back the faked migration, which should remove the changes that were manually made.
# Then they could pull and run the merged workflow migration.  This is not an elegant way to
# deal with it, but it should work.

# 2. Have Person A make their changes, create the workflow migration, commit things, and then
# have Person B pull them and run migrations before making any workflow changes of their own.
# The only downside here is that you may have to wait for Person A to get their stuff pushed.


HISTORY_TYPES_ADD = "+"
HISTORY_TYPES_CHANGE = "~"
HISTORY_TYPES_DELETE = "-"

ADDED = "added"
CHANGED = "changed"
DELETED = "deleted"

NEWLINE = os.linesep
INDENT8 = "        "

GUARDED_TEXT = """    if os.environ.get("skip_migration_when_setting_up_db", "").lower() == "true":  # For testing.
        return
"""

# Add a comment right after the Django generated comment, to help find our created migrations.
# This way we can find the last one we did, parse the generated date from the Django comment,
# and look at history to determine what changed in the workflow since the migration was created.
MIGRATION_MODIFIED_COMMENT = (
    f"# Modified using VUEDA makeworkflowmigrations command.  Please do not delete this comment.{NEWLINE}"
)

# We don't run the functions that get copied into migrations, but, so flake8 doesn't complain, define some variables.
# This is less work than finding all the places that use them and adding noqa comments.
changed_data = ()
history_change_reason = ""
keep_history_date = False
migration_app_label = "vueda_workflow"


#############################################################################
# Functions we use when rewriting the empty migration we created.
# We write the source code using inspect.get_source(...) into the migration.
#############################################################################
def forwards_migrate_workflow(apps, schema_editor):
    for changed_item in copy.deepcopy(changed_data):  # Copied, so tests can migrate forwards and backwards.
        match changed_item["model_name"]:
            case "workflow":
                handle_workflow(apps, changed_item)

            case "workflowpermission":
                handle_workflow_permission(apps, changed_item)

            case "state":
                handle_state(apps, changed_item)

            case "statepermission":
                handle_state_permission(apps, changed_item)

            case "initialstate":
                handle_initial_state(apps, changed_item)

            case "transition":
                handle_transition(apps, changed_item)

            case "transitionpermission":
                handle_transition_permission(apps, changed_item)

            case "transitionsource":
                handle_transition_source(apps, changed_item)


def backwards_migrate_workflow(apps, schema_editor):
    # Make sure we go through the changed_data in reverse order, so we undo things correctly.
    for changed_item in reversed(copy.deepcopy(changed_data)):  # Copied, so tests can migrate forwards and backwards.
        match changed_item["history_type"]:
            case "added":
                changed_item["history_type"] = "deleted"

            case "deleted":
                changed_item["history_type"] = "added"

        match changed_item["model_name"]:
            case "workflow":
                handle_workflow(apps, changed_item, reversing=True)

            case "workflowpermission":
                handle_workflow_permission(apps, changed_item, reversing=True)

            case "state":
                handle_state(apps, changed_item, reversing=True)

            case "statepermission":
                handle_state_permission(apps, changed_item, reversing=True)

            case "initialstate":
                handle_initial_state(apps, changed_item, reversing=True)

            case "transition":
                handle_transition(apps, changed_item, reversing=True)

            case "transitionpermission":
                handle_transition_permission(apps, changed_item, reversing=True)

            case "transitionsource":
                handle_transition_source(apps, changed_item, reversing=True)


def handle_workflow(apps, changed_item, *, reversing=False):
    historical_workflow = apps.get_model("vueda_workflow", "HistoricalWorkflow")
    model_content_type = apps.get_model("contenttypes", "ContentType")
    model_workflow = apps.get_model("vueda_workflow", "Workflow")

    data = changed_item["changes"]

    match changed_item["history_type"]:
        case "added":
            content_type = model_content_type.objects.get(**data["content_type_id"])
            data["content_type_id"] = content_type.pk

            del data["id"]  # This needs to be removed before we create.

            workflow = model_workflow.objects.create(**data)

            add_history_to_data(
                data,
                workflow,
                "+",
                changed_item["history_date"],
            )
            historical_workflow.objects.create(**data)

        case "changed":
            workflow = model_workflow.objects.get(**get_id_values_from_dict(data["id"], reversing=reversing))

            del data["id"]

            apply_and_save_changes(workflow, data, reversing=reversing)
            add_history_to_data(
                data,
                workflow,
                "~",
                changed_item["history_date"],
                fields=(
                    "id",
                    "code",
                    "content_type_id",
                    "historical_app_label",
                    "historical_model",
                    "name",
                ),
            )
            historical_workflow.objects.create(**data)

        case "deleted":
            content_type = model_content_type.objects.get(**data["content_type_id"])
            data["content_type_id"] = content_type.pk

            workflow = model_workflow.objects.get(**data["id"])

            del data["id"]

            add_history_to_data(data, workflow, "-", changed_item["history_date"])
            historical_workflow.objects.create(**data)
            workflow.delete()


def handle_workflow_permission(apps, changed_item, *, reversing=False):
    historical_workflow_permission = apps.get_model("vueda_workflow", "HistoricalWorkflowPermission")
    model_content_type = apps.get_model("contenttypes", "ContentType")
    model_permission = apps.get_model("auth", "Permission")
    model_workflow = apps.get_model("vueda_workflow", "Workflow")
    model_workflow_permission = apps.get_model("vueda_workflow", "WorkflowPermission")

    data = changed_item["changes"]

    match changed_item["history_type"]:
        case "added":
            content_type = model_content_type.objects.get(**data["permission_id"]["content_type_id"])
            data["permission_id"]["content_type_id"] = content_type.pk
            permission = model_permission.objects.get(**data["permission_id"])
            data["permission_id"] = permission.pk
            workflow = model_workflow.objects.get(**data["workflow_id"])
            data["workflow_id"] = workflow.pk

            del data["id"]  # This needs to be removed before we create.

            workflow_permission = model_workflow_permission.objects.create(**data)

            add_history_to_data(data, workflow_permission, "+", changed_item["history_date"])
            historical_workflow_permission.objects.create(**data)

        case "changed":
            workflow = model_workflow.objects.get(**data["id"]["workflow_id"])
            data["id"]["workflow_id"] = workflow.pk

            workflow_permission = model_workflow_permission.objects.get(
                **get_id_values_from_dict(data["id"], reversing=reversing)
            )

            del data["id"]

            # If the value is changed, it is a tuple.  We need to get the ids for each item.
            if type(data["permission_id"]) is tuple:
                new_permission_ids = []
                for permission_id in data["permission_id"]:
                    content_type = model_content_type.objects.get(**permission_id["content_type_id"])
                    permission_id["content_type_id"] = content_type.pk
                    permission = model_permission.objects.get(**permission_id)
                    new_permission_ids.append(permission.pk)
                data["permission_id"] = tuple(new_permission_ids)

            apply_and_save_changes(workflow_permission, data, reversing=reversing)
            add_history_to_data(
                data,
                workflow_permission,
                "~",
                changed_item["history_date"],
                fields=(
                    "id",
                    "historical_permission_codename",
                    "historical_permission_content_type_app_label",
                    "historical_permission_content_type_model_name",
                    "permission_id",
                    "workflow_id",
                ),
            )
            historical_workflow_permission.objects.create(**data)

        case "deleted":
            content_type = model_content_type.objects.get(**data["permission_id"]["content_type_id"])
            data["permission_id"]["content_type_id"] = content_type.pk
            permission = model_permission.objects.get(**data["permission_id"])
            data["permission_id"] = permission.pk
            workflow = model_workflow.objects.get(**data["id"]["workflow_id"])
            data["id"]["workflow_id"] = workflow.pk
            data["workflow_id"] = workflow.pk

            workflow_permission = model_workflow_permission.objects.get(**data["id"])

            del data["id"]

            add_history_to_data(data, workflow_permission, "-", changed_item["history_date"])
            historical_workflow_permission.objects.create(**data)
            workflow_permission.delete()


def handle_state(apps, changed_item, *, reversing=False):
    historical_state = apps.get_model("vueda_workflow", "HistoricalState")
    model_state = apps.get_model("vueda_workflow", "State")
    model_workflow = apps.get_model("vueda_workflow", "Workflow")

    data = changed_item["changes"]

    match changed_item["history_type"]:
        case "added":
            workflow = model_workflow.objects.get(**data["workflow_id"])
            data["workflow_id"] = workflow.pk

            del data["id"]  # This needs to be removed before we create.

            state = model_state.objects.create(**data)

            add_history_to_data(data, state, "+", changed_item["history_date"])
            historical_state.objects.create(**data)

        case "changed":
            workflow = model_workflow.objects.get(**data["id"]["workflow_id"])
            data["id"]["workflow_id"] = workflow.pk
            state = model_state.objects.get(**get_id_values_from_dict(data["id"], reversing=reversing))

            del data["id"]

            apply_and_save_changes(state, data, reversing=reversing)
            add_history_to_data(
                data,
                state,
                "~",
                changed_item["history_date"],
                fields=(
                    "id",
                    "code",
                    "name",
                    "workflow_id",
                ),
            )
            historical_state.objects.create(**data)

        case "deleted":
            workflow = model_workflow.objects.get(**data["id"]["workflow_id"])
            data["id"]["workflow_id"] = workflow.pk
            data["workflow_id"] = workflow.pk

            state = model_state.objects.get(**data["id"])

            del data["id"]

            add_history_to_data(data, state, "-", changed_item["history_date"])
            historical_state.objects.create(**data)
            state.delete()


def handle_state_permission(apps, changed_item, *, reversing=False):
    historical_state_permission = apps.get_model("vueda_workflow", "HistoricalStatePermission")
    model_content_type = apps.get_model("contenttypes", "ContentType")
    model_group = apps.get_model("auth", "Group")
    model_permission = apps.get_model("auth", "Permission")
    model_state = apps.get_model("vueda_workflow", "State")
    model_state_permission = apps.get_model("vueda_workflow", "StatePermission")
    model_workflow = apps.get_model("vueda_workflow", "Workflow")

    data = changed_item["changes"]

    match changed_item["history_type"]:
        case "added":
            workflow = model_workflow.objects.get(**data["state_id"]["workflow_id"])
            data["state_id"]["workflow_id"] = workflow.pk
            state = model_state.objects.get(**data["state_id"])
            data["state_id"] = state.pk
            content_type = model_content_type.objects.get(**data["permission_id"]["content_type_id"])
            data["permission_id"]["content_type_id"] = content_type.pk
            permission = model_permission.objects.get(**data["permission_id"])
            data["permission_id"] = permission.pk
            group = model_group.objects.get(**data["group_id"])
            data["group_id"] = group.pk

            del data["id"]  # This needs to be removed before we create.

            state_permission = model_state_permission.objects.create(**data)

            add_history_to_data(data, state_permission, "+", changed_item["history_date"])
            historical_state_permission.objects.create(**data)

        case "changed":
            workflow = model_workflow.objects.get(**data["id"]["state_id"]["workflow_id"])
            data["id"]["state_id"]["workflow_id"] = workflow.pk
            state = model_state.objects.get(**data["id"]["state_id"])
            data["id"]["state_id"] = state.pk
            group = model_group.objects.get(**get_id_values_from_item(data["id"]["group_id"], reversing=reversing))
            data["id"]["group_id"] = group.pk
            state_permission = model_state_permission.objects.get(
                **get_id_values_from_dict(data["id"], reversing=reversing)
            )

            del data["id"]

            # If the value is changed, it is a tuple.  We need to get the ids for each item.
            if type(data["permission_id"]) is tuple:
                new_permission_ids = []
                for permission_id in data["permission_id"]:
                    content_type = model_content_type.objects.get(**permission_id["content_type_id"])
                    permission_id["content_type_id"] = content_type.pk
                    permission = model_permission.objects.get(**permission_id)
                    new_permission_ids.append(permission.pk)
                data["permission_id"] = tuple(new_permission_ids)

            # If the value is changed, it is a tuple.  We need to get the ids for each item.
            if type(data["group_id"]) is tuple:
                new_group_ids = []
                for group_id in data["group_id"]:
                    group = model_group.objects.get(**group_id)
                    new_group_ids.append(group.pk)
                data["group_id"] = tuple(new_group_ids)

            apply_and_save_changes(state_permission, data, reversing=reversing)
            add_history_to_data(
                data,
                state_permission,
                "~",
                changed_item["history_date"],
                fields=(
                    "id",
                    "grant_or_deny",
                    "group_id",
                    "historical_group_name",
                    "historical_permission_codename",
                    "permission_id",
                    "state_id",
                ),
            )
            historical_state_permission.objects.create(**data)

        case "deleted":
            workflow = model_workflow.objects.get(**data["id"]["state_id"]["workflow_id"])
            data["id"]["state_id"]["workflow_id"] = workflow.pk
            data["state_id"]["workflow_id"] = workflow.pk
            state = model_state.objects.get(**data["id"]["state_id"])
            data["id"]["state_id"] = state.pk
            data["state_id"] = state.pk
            content_type = model_content_type.objects.get(**data["permission_id"]["content_type_id"])
            data["permission_id"]["content_type_id"] = content_type.pk
            permission = model_permission.objects.get(**data["permission_id"])
            data["permission_id"] = permission.pk
            group = model_group.objects.get(**data["id"]["group_id"])
            data["id"]["group_id"] = group.pk
            data["group_id"] = group.pk

            state_permission = model_state_permission.objects.get(**data["id"])

            del data["id"]

            add_history_to_data(data, state_permission, "-", changed_item["history_date"])
            historical_state_permission.objects.create(**data)
            state_permission.delete()


def handle_initial_state(apps, changed_item, *, reversing=False):
    historical_initial_state = apps.get_model("vueda_workflow", "HistoricalInitialState")
    model_initial_state = apps.get_model("vueda_workflow", "InitialState")
    model_state = apps.get_model("vueda_workflow", "State")
    model_workflow = apps.get_model("vueda_workflow", "Workflow")

    data = changed_item["changes"]

    match changed_item["history_type"]:
        case "added":
            workflow = model_workflow.objects.get(**data["state_id"]["workflow_id"])
            data["state_id"]["workflow_id"] = workflow.pk
            state = model_state.objects.get(**data["state_id"])

            data["state_id"] = state.pk
            data["workflow_id"] = workflow.pk

            del data["id"]  # This needs to be removed before we create.

            initial_state = model_initial_state.objects.create(**data)

            add_history_to_data(data, initial_state, "+", changed_item["history_date"])
            historical_initial_state.objects.create(**data)

        case "changed":
            data["id"]["state_id"] = get_id_values_from_item(data["id"]["state_id"], reversing=reversing)
            workflow = model_workflow.objects.get(**data["id"]["state_id"]["workflow_id"])
            data["id"]["state_id"]["workflow_id"] = workflow.pk
            state = model_state.objects.get(**data["id"]["state_id"])
            data["id"]["state_id"] = state.pk
            data["id"]["workflow_id"] = workflow.pk

            initial_state = model_initial_state.objects.get(**get_id_values_from_dict(data["id"], reversing=reversing))

            del data["id"]

            # If the value is changed, it is a tuple.  We need to get the ids for each item.
            if type(data["state_id"]) is tuple:
                state_ids = []
                for state_data in data["state_id"]:
                    workflow = model_workflow.objects.get(**state_data["workflow_id"])
                    state_data["workflow_id"] = workflow.pk
                    state = model_state.objects.get(**state_data)
                    state_ids.append(state.pk)
                    data["workflow_id"] = workflow.pk
                data["state_id"] = tuple(state_ids)

            apply_and_save_changes(initial_state, data, reversing=reversing)
            add_history_to_data(
                data,
                initial_state,
                "~",
                changed_item["history_date"],
                fields=(
                    "id",
                    "state_id",
                    "workflow_id",
                ),
            )
            historical_initial_state.objects.create(**data)

        case "deleted":
            workflow = model_workflow.objects.get(**data["id"]["state_id"]["workflow_id"])
            data["id"]["state_id"]["workflow_id"] = workflow.pk
            data["state_id"]["workflow_id"] = workflow.pk
            state = model_state.objects.get(**data["id"]["state_id"])
            data["id"]["state_id"] = state.pk
            data["state_id"] = state.pk
            data["id"]["workflow_id"] = workflow.pk
            data["workflow_id"] = workflow.pk

            initial_state = model_initial_state.objects.get(**get_id_values_from_dict(data["id"], reversing=reversing))

            del data["id"]

            add_history_to_data(data, initial_state, "-", changed_item["history_date"])
            historical_initial_state.objects.create(**data)
            initial_state.delete()


def handle_transition(apps, changed_item, *, reversing=False):
    historical_transition = apps.get_model("vueda_workflow", "HistoricalTransition")
    model_state = apps.get_model("vueda_workflow", "State")
    model_transition = apps.get_model("vueda_workflow", "Transition")
    model_workflow = apps.get_model("vueda_workflow", "Workflow")

    data = changed_item["changes"]

    match changed_item["history_type"]:
        case "added":
            workflow = model_workflow.objects.get(**data["workflow_id"])
            data["workflow_id"] = workflow.pk
            data["target_id"]["workflow_id"] = workflow.pk
            state = model_state.objects.get(**data["target_id"])
            data["target_id"] = state.pk

            del data["id"]  # This needs to be removed before we create.

            transition = model_transition.objects.create(**data)

            add_history_to_data(data, transition, "+", changed_item["history_date"])
            historical_transition.objects.create(**data)

        case "changed":
            workflow = model_workflow.objects.get(**data["id"]["workflow_id"])
            data["id"]["workflow_id"] = workflow.pk

            transition = model_transition.objects.get(**get_id_values_from_dict(data["id"], reversing=reversing))

            del data["id"]

            # If the value is changed, it is a tuple.  We need to get the ids for each item.
            if type(data["target_id"]) is tuple:
                state_ids = []
                for state_data in data["target_id"]:
                    workflow = model_workflow.objects.get(**state_data["workflow_id"])
                    state_data["workflow_id"] = workflow.pk
                    state = model_state.objects.get(**state_data)
                    state_ids.append(state.pk)
                    data["workflow_id"] = workflow.pk
                data["target_id"] = tuple(state_ids)

            apply_and_save_changes(transition, data, reversing=reversing)
            add_history_to_data(
                data,
                transition,
                "~",
                changed_item["history_date"],
                fields=(
                    "id",
                    "code",
                    "name",
                    "target_id",
                    "workflow_id",
                ),
            )
            historical_transition.objects.create(**data)

        case "deleted":
            workflow = model_workflow.objects.get(**data["id"]["workflow_id"])
            data["id"]["workflow_id"] = workflow.pk
            data["workflow_id"] = workflow.pk
            data["target_id"]["workflow_id"] = workflow.pk
            state = model_state.objects.get(**data["target_id"])
            data["target_id"] = state.pk

            transition = model_transition.objects.get(**data["id"])

            del data["id"]

            add_history_to_data(data, transition, "-", changed_item["history_date"])
            historical_transition.objects.create(**data)
            transition.delete()


def handle_transition_permission(apps, changed_item, *, reversing=False):
    historical_transition_permission = apps.get_model("vueda_workflow", "HistoricalTransitionPermission")
    model_content_type = apps.get_model("contenttypes", "ContentType")
    model_permission = apps.get_model("auth", "Permission")
    model_transition = apps.get_model("vueda_workflow", "Transition")
    model_transition_permission = apps.get_model("vueda_workflow", "TransitionPermission")
    model_workflow = apps.get_model("vueda_workflow", "Workflow")

    data = changed_item["changes"]

    match changed_item["history_type"]:
        case "added":
            content_type = model_content_type.objects.get(**data["permission_id"]["content_type_id"])
            data["permission_id"]["content_type_id"] = content_type.pk
            permission = model_permission.objects.get(**data["permission_id"])
            data["permission_id"] = permission.pk
            workflow = model_workflow.objects.get(**data["transition_id"]["workflow_id"])
            data["transition_id"]["workflow_id"] = workflow.pk
            transition = model_transition.objects.get(**data["transition_id"])
            data["transition_id"] = transition.pk

            del data["id"]  # This needs to be removed before we create.

            transition_permission = model_transition_permission.objects.create(**data)

            add_history_to_data(data, transition_permission, "+", changed_item["history_date"])
            historical_transition_permission.objects.create(**data)

        case "changed":
            workflow = model_workflow.objects.get(**data["id"]["transition_id"]["workflow_id"])
            data["id"]["transition_id"]["workflow_id"] = workflow.pk

            transition = model_transition.objects.get(**data["id"]["transition_id"])
            data["id"]["transition_id"] = transition.pk

            transition_permission = model_transition_permission.objects.get(
                **get_id_values_from_dict(data["id"], reversing=reversing)
            )

            del data["id"]

            # If the value is changed, it is a tuple.  We need to get the ids for each item.
            if type(data["permission_id"]) is tuple:
                new_permission_ids = []
                for permission_id in data["permission_id"]:
                    content_type = model_content_type.objects.get(**permission_id["content_type_id"])
                    permission_id["content_type_id"] = content_type.pk
                    permission = model_permission.objects.get(**permission_id)
                    new_permission_ids.append(permission.pk)
                data["permission_id"] = tuple(new_permission_ids)

            # If the value is changed, it is a tuple.  We need to get the ids for each item.
            if type(data["transition_id"]) is tuple:
                transition_ids = []
                for transition_data in data["transition_id"]:
                    workflow = model_workflow.objects.get(**transition_data["workflow_id"])
                    transition_data["workflow_id"] = workflow.pk
                    state = model_transition.objects.get(**transition_data)
                    transition_ids.append(state.pk)
                    data["workflow_id"] = workflow.pk
                data["transition_id"] = tuple(transition_ids)

            apply_and_save_changes(transition_permission, data, reversing=reversing)
            add_history_to_data(
                data,
                transition_permission,
                "~",
                changed_item["history_date"],
                fields=(
                    "id",
                    "historical_permission_codename",
                    "historical_permission_content_type_app_label",
                    "historical_permission_content_type_model_name",
                    "permission_id",
                    "transition_id",
                ),
            )
            historical_transition_permission.objects.create(**data)

        case "deleted":
            content_type = model_content_type.objects.get(**data["permission_id"]["content_type_id"])
            data["permission_id"]["content_type_id"] = content_type.pk
            permission = model_permission.objects.get(**data["permission_id"])
            data["permission_id"] = permission.pk
            workflow = model_workflow.objects.get(**data["id"]["transition_id"]["workflow_id"])
            data["id"]["transition_id"]["workflow_id"] = workflow.pk
            data["transition_id"]["workflow_id"] = workflow.pk
            transition = model_transition.objects.get(**data["id"]["transition_id"])
            data["id"]["transition_id"] = transition.pk
            data["transition_id"] = transition.pk

            transition_permission = model_transition_permission.objects.get(**data["id"])

            del data["id"]

            add_history_to_data(data, transition_permission, "-", changed_item["history_date"])
            historical_transition_permission.objects.create(**data)
            transition_permission.delete()


def handle_transition_source(apps, changed_item, *, reversing=False):
    historical_transition_source = apps.get_model("vueda_workflow", "HistoricalTransitionSource")
    model_state = apps.get_model("vueda_workflow", "State")
    model_transition = apps.get_model("vueda_workflow", "Transition")
    model_transition_source = apps.get_model("vueda_workflow", "TransitionSource")
    model_workflow = apps.get_model("vueda_workflow", "Workflow")

    data = changed_item["changes"]

    match changed_item["history_type"]:
        case "added":
            workflow = model_workflow.objects.get(**data["source_id"]["workflow_id"])
            data["source_id"]["workflow_id"] = workflow.pk
            state = model_state.objects.get(**data["source_id"])
            data["source_id"] = state.pk
            workflow = model_workflow.objects.get(**data["transition_id"]["workflow_id"])
            data["transition_id"]["workflow_id"] = workflow.pk
            transition = model_transition.objects.get(**data["transition_id"])
            data["transition_id"] = transition.pk

            del data["id"]  # This needs to be removed before we create.

            transition_source = model_transition_source.objects.create(**data)

            add_history_to_data(data, transition_source, "+", changed_item["history_date"])
            historical_transition_source.objects.create(**data)

        case "changed":
            data["id"]["source_id"] = get_id_values_from_item(data["id"]["source_id"], reversing=reversing)
            workflow = model_workflow.objects.get(**data["id"]["source_id"]["workflow_id"])
            data["id"]["source_id"]["workflow_id"] = workflow.pk
            state = model_state.objects.get(**data["id"]["source_id"])
            data["id"]["source_id"] = state.pk

            workflow = model_workflow.objects.get(**data["id"]["transition_id"]["workflow_id"])
            data["id"]["transition_id"]["workflow_id"] = workflow.pk
            transition = model_transition.objects.get(**data["id"]["transition_id"])
            data["id"]["transition_id"] = transition.pk

            transition_source = model_transition_source.objects.get(
                **get_id_values_from_dict(data["id"], reversing=reversing)
            )

            del data["id"]

            # If the value is changed, it is a tuple.  We need to get the ids for each item.
            if type(data["source_id"]) is tuple:
                state_ids = []
                for state_data in data["source_id"]:
                    workflow = model_workflow.objects.get(**state_data["workflow_id"])
                    state_data["workflow_id"] = workflow.pk
                    state = model_state.objects.get(**state_data)
                    state_ids.append(state.pk)
                data["source_id"] = tuple(state_ids)

            # If the value is changed, it is a tuple.  We need to get the ids for each item.
            if type(data["transition_id"]) is tuple:
                transition_ids = []
                for transition_data in data["transition_id"]:
                    workflow = model_workflow.objects.get(**transition_data["workflow_id"])
                    transition_data["workflow_id"] = workflow.pk
                    transition = model_transition.objects.get(**transition_data)
                    transition_ids.append(transition.pk)
                data["transition_id"] = tuple(transition_ids)

            apply_and_save_changes(transition_source, data, reversing=reversing)
            add_history_to_data(
                data,
                transition_source,
                "~",
                changed_item["history_date"],
                fields=(
                    "id",
                    "source_id",
                    "transition_id",
                ),
            )
            historical_transition_source.objects.create(**data)

        case "deleted":
            workflow = model_workflow.objects.get(**data["id"]["source_id"]["workflow_id"])
            data["id"]["source_id"]["workflow_id"] = workflow.pk
            data["source_id"]["workflow_id"] = workflow.pk
            state = model_state.objects.get(**data["id"]["source_id"])
            data["id"]["source_id"] = state.pk
            data["source_id"] = state.pk
            workflow = model_workflow.objects.get(**data["id"]["transition_id"]["workflow_id"])
            data["id"]["transition_id"]["workflow_id"] = workflow.pk
            data["transition_id"]["workflow_id"] = workflow.pk
            transition = model_transition.objects.get(**data["id"]["transition_id"])
            data["id"]["transition_id"] = transition.pk
            data["transition_id"] = transition.pk

            transition_source = model_transition_source.objects.get(**data["id"])

            del data["id"]

            add_history_to_data(data, transition_source, "-", changed_item["history_date"])
            historical_transition_source.objects.create(**data)
            transition_source.delete()


def add_history_to_data(history_data, obj, history_type, history_date, fields=()):
    # For changed history
    for field_name in fields:
        history_data[field_name] = getattr(obj, field_name)

    # For all history
    history_data["history_change_reason"] = history_change_reason
    history_data["history_date"] = history_date if keep_history_date else timezone.now()
    history_data["history_relation_id"] = obj.pk
    history_data["history_type"] = history_type
    history_data["id"] = obj.pk


def get_id_values_from_item(values, reversing=False):
    # The changed fields have a tuple with 2 values, the other fields do not.
    # Testing as tuple instead of length, because values could be a dictionary
    # with 2 keys, or a 2 character string.  A single value can't be a tuple.
    if type(values) is tuple:
        return values[1 if reversing else 0]

    return values


def get_id_values_from_dict(id_data, reversing=False):
    results = {}
    for field_name, values in id_data.items():
        results[field_name] = get_id_values_from_item(values, reversing)

    return results


def make_sure_permissions_exist(apps, schema_editor):
    app = django_apps.get_app_config(migration_app_label)
    create_permissions(app, interactive=False)


#############################################################################
# Functions used by the management command.
# These are added here for easy testing.
#############################################################################
def get_attr_names_for_workflow_models():
    workflow_model_field_names_to_attname = {}

    for model in (
        models.Workflow,
        models.WorkflowPermission,
        models.State,
        models.StatePermission,
        models.InitialState,
        models.Transition,
        models.TransitionPermission,
        models.TransitionSource,
    ):
        model_name = model._meta.model_name
        workflow_model_field_names_to_attname[model_name] = {}
        for field in model._meta._get_fields(reverse=False, include_hidden=True):
            if hasattr(field, "attname"):
                workflow_model_field_names_to_attname[model_name][field.name] = field.attname

    return workflow_model_field_names_to_attname


def get_history_diff(old_history_record, new_history_record):
    if old_history_record is None:
        empty_record = type(new_history_record)()
        return ADDED, new_history_record.diff_against(empty_record)

    elif new_history_record.history_type == HISTORY_TYPES_DELETE:
        # If we don't have an old history record, then this workflow
        # was added and deleted between migrations, so we can ignore it.
        if old_history_record is None:
            return None, None

        empty_record = type(new_history_record)()
        return DELETED, empty_record.diff_against(new_history_record)

    else:  # old_history_record is not None
        return CHANGED, new_history_record.diff_against(old_history_record)


def get_history_diff_workflow(historical_queryset, last_migrated_date, last_historical_pk):
    # Get each historical change, because we need to run through history ordered
    # by the history date, otherwise we could get duplicate key violations.
    historical_changes = []

    if last_migrated_date is None:
        old_history_record = None

    else:
        if last_historical_pk is not None:
            # We need to keep the last historical record, which could be before the last migrated date.
            historical_queryset = historical_queryset.filter(
                Q(history_date__gte=last_migrated_date) | Q(history_id=last_historical_pk)
            )

        else:
            historical_queryset = historical_queryset.filter(history_date__lte=last_migrated_date)

        old_history_record = historical_queryset.order_by("history_date").first()

    if old_history_record is not None:
        historical_queryset = historical_queryset.filter(history_date__gt=old_history_record.history_date)

    previous_history_record = old_history_record
    for history_record in historical_queryset.order_by("history_date"):
        history_type, history_diff = get_history_diff(previous_history_record, history_record)

        # If the new and old history record are identical, then there are no changes to migrate.
        if history_type is not None and history_diff is not None and history_diff.changed_fields:
            historical_changes.append(
                {
                    "diff": history_diff,
                    "type": history_type,
                    "date": history_record.history_date,
                }
            )

        previous_history_record = history_record

    return historical_changes


def get_history_diff_other_models(historical_queryset, last_migrated_date, last_historical_pks):
    # Get each historical change, because we need to run through history ordered
    # by the history date, otherwise we could get duplicate key violations.
    historical_changes = []

    # Get the diffs for each of the pks.
    for pk in set(historical_queryset.values_list("id", flat=True)):
        old_history_records_by_pk = historical_queryset.filter(id=pk)
        last_historical_pk = last_historical_pks.get(pk, None)

        if last_migrated_date is None:
            old_history_records = old_history_records_by_pk.none()

        else:
            if last_historical_pk is not None:
                # We need to keep the last historical record, which could be before the last migrated date.
                old_history_records = old_history_records_by_pk.filter(
                    Q(history_date__gte=last_migrated_date) | Q(history_id=last_historical_pk)
                )

            else:
                old_history_records = old_history_records_by_pk.filter(history_date__gte=last_migrated_date)

        # If we only have 1 historical record, are we adding?
        if old_history_records.count() == 1 and old_history_records.first().history_type == "+":
            old_history_record = None

            if last_historical_pk:
                old_history_records_by_pk = old_history_records_by_pk.exclude(history_id=last_historical_pk)

        else:
            old_history_record = old_history_records.order_by("history_date").first()

        if old_history_record is not None:
            old_history_records_by_pk = old_history_records_by_pk.filter(
                history_date__gt=old_history_record.history_date,
            )

        if last_migrated_date:
            old_history_records_by_pk = old_history_records_by_pk.filter(history_date__gte=last_migrated_date)

        previous_history_record = old_history_record
        for history_record in old_history_records_by_pk.order_by("history_date"):
            history_type, history_diff = get_history_diff(previous_history_record, history_record)

            if history_type is not None and history_diff is not None and history_diff.changed_fields:
                historical_changes.append(
                    {
                        "diff": history_diff,
                        "type": history_type,
                        "date": history_record.history_date,
                    }
                )

            previous_history_record = history_record

    return historical_changes


# We need the last historical pk for each of the objects that exist, so we can correctly get a diff for each.
def get_historical_pks(historical_queryset, history_change_reasons):
    all_historical_pks = {}

    for pk, history_pk in (
        historical_queryset.filter(history_change_reason__in=history_change_reasons)
        .order_by("-history_date")
        .values_list("id", "pk")  # pk = history_id
    ):
        if pk not in all_historical_pks:
            all_historical_pks[pk] = []
        all_historical_pks[pk].append(history_pk)

    last_historical_pks = {}
    excluded_historical_pks = []
    for pk, historical_pks in all_historical_pks.items():
        if historical_pks:
            last_historical_pks[pk] = historical_pks[0]
            if len(historical_pks) > 1:
                excluded_historical_pks.extend(historical_pks[1:])

    return last_historical_pks, excluded_historical_pks


def get_object_pks(historical_queryset):
    return frozenset(historical_queryset.values_list("id", flat=True))


def apply_and_save_changes(obj, data, *, reversing=False):
    # The changed fields have a tuple with 2 values, the other fields do not.
    # Testing as tuple instead of length, because values could be a dictionary
    # with 2 keys, or a 2 character string.  A single value can't be a tuple.
    for key, values in data.items():
        if type(values) is not tuple:
            continue

        old_value, new_value = values

        if reversing:
            setattr(obj, key, old_value)

        else:
            setattr(obj, key, new_value)

    obj.save()


class Command(BaseCommand):
    help = (
        "In the appropriate app, two files will get created. "
        "`sql/view-view_name-0000.sql` - contains the SQL for the view. "
        "`migrations/0000_view_name.py` - a migration that reads the appropriate files in the sql folder. "
        "If the `migrations` and `sql` folder do not exist, they will be created, along with the apps initial "
        "migration, and an empty migration for the view."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "args",
            metavar="app_label",
            nargs="*",
            help="Specify the app label(s) to create workflow migrations for.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Just show what migrations would be made; don't actually write them.",
        )
        parser.add_argument(
            "--keep-history-date",
            action="store_true",
            help="Will set keep_history_date to True in the created migration.  This is mainly used by tests.",
        )
        parser.add_argument(
            "--env-guarded-operations",
            action="store_true",
            help=(
                "This causes created migrations to not run the migration sql, when the environment "
                "variable 'skip_migration_when_setting_up_db' is 'true'.  In a test you can "
                "use this to fake and roll back a migration, then update the environment "
                "variable and run the migration manually.  If not set, the test for the "
                "environment variable will not be added into the migration."
            ),
        )
        parser.add_argument(
            "--import-instead",
            action="store_true",
            help=(
                "This causes created migrations to not copy functions from the management command "
                "into the migration.  Imports are added instead.  This is used by tests, so the "
                "coverage report will reflect actual code usage."
            ),
        )

    def _call_command(self, *args):
        err = io.StringIO()
        out = io.StringIO()

        if self.dry_run and args[0] == "makemigrations":
            args = args + ("--dry-run",)

        # If we don't do this, sometimes we can't import a newly created migration.
        # Do it here, so we don't need to know which calls require it, and which don't.
        importlib.invalidate_caches()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            try:
                call_command(*args)
            except SystemExit:
                pass

        # Did an error occur?
        if err.tell():
            err.seek(0)
            self.stdout.write(self.style.ERROR(err.read()))
            sys.exit(2)

        # Return the results.
        out.seek(0)
        return out.readlines()

    @staticmethod
    def _parse_migrations_from_show_migrations(lines):
        migrations = []

        for line in lines:
            line = line.strip()
            if line.startswith("["):
                line = line.replace("[ ]", "").replace("[X]", "").strip()
                migrations.append(line)

        return migrations

    @staticmethod
    def _parse_date_from_django_comment(django_comment):
        # Generated by Django 5.0.3 on 2024-03-26 19:08
        date_string = django_comment.split(" on ")[-1].strip()
        # The date in the migration is in UTC.  Make sure it acquires the UTC timezone.
        created_date = datetime.datetime.strptime(f"{date_string}:00 +0000", "%Y-%m-%d %H:%M:%S %z")
        return created_date.astimezone()

    def _get_migration_names_from_show_migrations(self, app_label):
        show_migration_results = self._call_command("showmigrations", app_label)

        if not show_migration_results:  # Erred.  The reason will be printed to the console via the command.
            return None

        return self._parse_migrations_from_show_migrations(show_migration_results)

    def _get_generated_date_for_vueda_generated_migration(self, app_name, migration_name):
        # Return the date created in the django comment.
        django_comment = None

        with open(os.path.join(*app_name.split("."), "migrations", f"{migration_name}.py"), "r", encoding="utf-8") as f:
            is_modified_by_us = False
            # Did we modify this migration?  Check the first 20 lines for our modified comment.
            for migration_line_no, migration_line in enumerate(f.readlines()):
                if migration_line.startswith("# Generated by Django"):
                    django_comment = migration_line

                if migration_line == MIGRATION_MODIFIED_COMMENT:
                    is_modified_by_us = True

                if migration_line_no > 20:
                    break

        if is_modified_by_us:
            return self._parse_date_from_django_comment(django_comment)

        return False

    def _get_apps_with_workflow(self, selected_apps=()):
        apps_with_workflow = {}

        for model in django_apps.get_models(include_auto_created=True, include_swapped=True):
            model_meta = model._meta
            app_label = model_meta.app_label
            model_name = model_meta.model_name

            # If you specify apps, skip models not in your app.
            if selected_apps and app_label not in selected_apps:
                continue

            content_type = ContentType.objects.get_for_model(model)

            if issubclass(model, models.HasWorkflowModelMixin):
                if app_label not in apps_with_workflow:
                    apps_with_workflow[app_label] = {
                        "app_name": model_meta.app_config.name,
                        "content_type_ids": [],
                    }
                apps_with_workflow[app_label]["content_type_ids"].append(content_type.pk)

            else:  # Deleted Workflows
                historical_workflows = models.Workflow.history.filter(
                    historical_app_label=app_label, historical_model=model_name
                )
                if historical_workflows.exists():
                    if app_label not in apps_with_workflow:
                        apps_with_workflow[app_label] = {
                            "app_name": model_meta.app_config.name,
                            "content_type_ids": [],
                        }
                    apps_with_workflow[app_label]["content_type_ids"].append(content_type.pk)

        return apps_with_workflow

    def _get_vueda_generated_migration_data_per_content_type(self, selected_apps=()):
        migrations_by_content_type = {}

        for app_label, model_data in self._get_apps_with_workflow(selected_apps).items():
            app_name = model_data["app_name"]
            content_type_ids = tuple(model_data["content_type_ids"])

            migrations_by_content_type[content_type_ids] = None

            show_migration_results = self._call_command("showmigrations", app_label)

            if not show_migration_results:  # Erred.  The reason will be printed to the console via the command.
                return None

            migration_names = self._parse_migrations_from_show_migrations(show_migration_results)

            history_change_reasons = []
            workflow_migration_dates = {}
            for migration_name in migration_names:
                django_date = self._get_generated_date_for_vueda_generated_migration(app_name, migration_name)
                if django_date:
                    history_change_reasons.append(f"Workflow Migration - {migration_name}")
                    workflow_migration_dates[django_date] = migration_name

            if workflow_migration_dates:
                max_date = max(workflow_migration_dates)
                migrations_by_content_type[content_type_ids] = {
                    "history_change_reasons": history_change_reasons,
                    "last_migration_date": max_date,
                    "name": workflow_migration_dates[max_date],
                }

        return migrations_by_content_type

    @staticmethod
    def _get_history_record_for_date(model, pk, history_diff):
        history_record = None

        if history_diff.new_record.id:
            history_record = (
                model.history.filter(id=pk, history_date__lte=history_diff.new_record.history_date)
                .order_by("-history_date")
                .first()
            )

        if history_diff.old_record.id and history_record is None:
            history_record = (
                model.history.filter(id=pk, history_date__lte=history_diff.old_record.history_date)
                .order_by("-history_date")
                .first()
            )

        return history_record

    # This function is a complexity of 25, but is much cleaner as a single function.
    def _parse_related_fields_into_changes_data(self, history_diff, change, field_name, ct):  # noqa C901
        new = change.new
        old = change.old

        match field_name:
            case "content_type_id":
                if change.new:
                    new = {"app_label": ct.app_label, "model": ct.model}

                if change.old:
                    old = {"app_label": ct.app_label, "model": ct.model}

            case "workflow_id":
                if change.new:
                    hist_workflow = self._get_history_record_for_date(models.Workflow, change.new, history_diff)
                    new = {"code": hist_workflow.code}

                if change.old:
                    hist_workflow = self._get_history_record_for_date(models.Workflow, change.old, history_diff)
                    old = {"code": hist_workflow.code}

            case "permission_id":
                if change.new:
                    new = {
                        "codename": history_diff.new_record.permission.codename,
                        "content_type_id": {
                            "app_label": history_diff.new_record.permission.content_type.app_label,
                            "model": history_diff.new_record.permission.content_type.model,
                        },
                    }

                if change.old:
                    old = {
                        "codename": history_diff.old_record.historical_permission_codename,
                        "content_type_id": {"app_label": ct.app_label, "model": ct.model},
                    }

            case "group_id":
                if change.new:
                    new = {
                        "name": history_diff.new_record.group.name,
                    }

                if change.old:
                    old = {
                        "name": history_diff.old_record.historical_group_name,
                    }

            case "state_id":
                if change.new:
                    hist_state = self._get_history_record_for_date(models.State, change.new, history_diff)
                    hist_workflow = self._get_history_record_for_date(
                        models.Workflow, hist_state.workflow_id, history_diff
                    )

                    new = {
                        "code": hist_state.code,
                        "workflow_id": {"code": hist_workflow.code},
                    }

                if change.old:
                    hist_state = self._get_history_record_for_date(models.State, change.old, history_diff)
                    hist_workflow = self._get_history_record_for_date(
                        models.Workflow, hist_state.workflow_id, history_diff
                    )

                    old = {
                        "code": hist_state.code,
                        "workflow_id": {"code": hist_workflow.code},
                    }

            case "target_id":
                if change.new:
                    hist_state = self._get_history_record_for_date(models.State, change.new, history_diff)
                    hist_workflow = self._get_history_record_for_date(
                        models.Workflow, hist_state.workflow_id, history_diff
                    )

                    new = {
                        "code": hist_state.code,
                        "workflow_id": {"code": hist_workflow.code},
                    }

                if change.old:
                    hist_state = self._get_history_record_for_date(models.State, change.old, history_diff)
                    hist_workflow = self._get_history_record_for_date(
                        models.Workflow, hist_state.workflow_id, history_diff
                    )

                    old = {
                        "code": hist_state.code,
                        "workflow_id": {"code": hist_workflow.code},
                    }

            case "source_id":
                if change.new:
                    hist_state = self._get_history_record_for_date(models.State, change.new, history_diff)
                    hist_workflow = self._get_history_record_for_date(
                        models.Workflow, hist_state.workflow_id, history_diff
                    )

                    new = {
                        "code": hist_state.code,
                        "workflow_id": {"code": hist_workflow.code},
                    }

                if change.old:
                    hist_state = self._get_history_record_for_date(models.State, change.old, history_diff)
                    hist_workflow = self._get_history_record_for_date(
                        models.Workflow, hist_state.workflow_id, history_diff
                    )

                    old = {
                        "code": hist_state.code,
                        "workflow_id": {"code": hist_workflow.code},
                    }

            case "transition_id":
                if change.new:
                    hist_transition = self._get_history_record_for_date(models.Transition, change.new, history_diff)
                    hist_workflow = self._get_history_record_for_date(
                        models.Workflow, hist_transition.workflow_id, history_diff
                    )

                    new = {
                        "code": hist_transition.code,
                        "workflow_id": {"code": hist_workflow.code},
                    }

                if change.old:
                    hist_transition = self._get_history_record_for_date(models.Transition, change.old, history_diff)
                    hist_workflow = self._get_history_record_for_date(
                        models.Workflow, hist_transition.workflow_id, history_diff
                    )

                    old = {
                        "code": hist_transition.code,
                        "workflow_id": {"code": hist_workflow.code},
                    }

        return new, old

    def _convert_historical_change(
        self,
        historical_change,
        content_type_id,
        model_name,
        workflow_model_field_names_to_attname,
    ):
        ct = ContentType.objects.get(pk=content_type_id)
        historical_date = historical_change["date"]
        historical_diff = historical_change["diff"]
        historical_type = historical_change["type"]

        current_changes = {}
        for change in historical_diff.changes:
            field_name = change.field

            if field_name == "id":  # We don't need ids, because they could be different in other databases.
                continue

            field_name = workflow_model_field_names_to_attname[model_name][field_name]

            # Certain fields need information other than a pk, so we have a way to get the object
            # from a database where the pks may be different.  Added and deleted could get their
            # data from the objects that are already added into current_changes, but changed may
            # not have that data.  So, we assume we don't have the data and fetch it every time.
            new, old = self._parse_related_fields_into_changes_data(historical_diff, change, field_name, ct)

            match historical_type:
                case "added":
                    current_changes[field_name] = new

                case "changed":
                    current_changes[field_name] = (old, new)

                case "deleted":
                    current_changes[field_name] = old

        # Getting the additional information for 'id' will be easier if we have all the data.
        if historical_type == "changed":
            _, extra_data_diff = get_history_diff(None, historical_diff.new_record)

            for change in extra_data_diff.changes:
                field_name = change.field

                if field_name == "id":
                    continue

                field_name = workflow_model_field_names_to_attname[model_name][field_name]

                if field_name not in current_changes:
                    new, old = self._parse_related_fields_into_changes_data(extra_data_diff, change, field_name, ct)

                    current_changes[field_name] = new

        # Add in the id information, so we can change, delete, and reverse add.
        match model_name:
            case "workflow":
                current_changes["id"] = {
                    "code": current_changes["code"],
                }

            case "workflowpermission":
                current_changes["id"] = {
                    "historical_permission_codename": current_changes["historical_permission_codename"],
                    "historical_permission_content_type_app_label": current_changes[
                        "historical_permission_content_type_app_label"
                    ],
                    "historical_permission_content_type_model_name": current_changes[
                        "historical_permission_content_type_model_name"
                    ],
                    "workflow_id": current_changes["workflow_id"],
                }

            case "state":
                current_changes["id"] = {
                    "code": current_changes["code"],
                    "workflow_id": current_changes["workflow_id"],
                }

            case "statepermission":
                current_changes["id"] = {
                    "group_id": current_changes["group_id"],
                    "historical_group_name": current_changes["historical_group_name"],
                    "historical_permission_codename": current_changes["historical_permission_codename"],
                    "historical_permission_content_type_app_label": current_changes[
                        "historical_permission_content_type_app_label"
                    ],
                    "historical_permission_content_type_model_name": current_changes[
                        "historical_permission_content_type_model_name"
                    ],
                    "state_id": current_changes["state_id"],
                }

            case "initialstate":
                current_changes["id"] = {
                    "state_id": current_changes["state_id"],
                    "workflow_id": current_changes["workflow_id"],
                }

            case "transition":
                current_changes["id"] = {
                    "code": current_changes["code"],
                    "workflow_id": current_changes["workflow_id"],
                }

            case "transitionpermission":
                current_changes["id"] = {
                    "historical_permission_codename": current_changes["historical_permission_codename"],
                    "historical_permission_content_type_app_label": current_changes[
                        "historical_permission_content_type_app_label"
                    ],
                    "historical_permission_content_type_model_name": current_changes[
                        "historical_permission_content_type_model_name"
                    ],
                    "transition_id": current_changes["transition_id"],
                }

            case "transitionsource":
                current_changes["id"] = {
                    "source_id": current_changes["source_id"],
                    "transition_id": current_changes["transition_id"],
                }

        results = {
            "changes": current_changes,
            "history_date": historical_date,
            "history_type": historical_type,
            "model_name": model_name,
        }

        return results

    def _create_and_get_empty_migration(self, app_label):
        self.stdout.write(f"{NEWLINE}Creating empty migration for workflow changes.")

        # Force the migration to have a RunPython operation that we can easily find/replace.
        migrations.Migration.operations = [
            migrations.RunPython(
                code=dict,
                reverse_code=type,
            ),
            migrations.RunPython(
                code=str,
                reverse_code=int,
            ),
        ]

        date_string = datetime.datetime.now().date().isoformat().replace("-", "_")
        results = self._call_command(
            "makemigrations", app_label, "--empty", f"--name=workflow_migrations_{date_string}", "--noinput"
        )
        migrations.Migration.operations = []  # Reset the operations in the class.

        if not results:  # Erred.
            return False

        return_value = None
        for result in results:
            self.stdout.write(result)

            result = result.strip()
            if result.endswith(".py"):
                return_value = Path(result).name

        return return_value

    def _rewrite_migration(self, migration_file, changed_data, app_label, migration_name, dependencies):
        with open(migration_file, "r+", encoding="utf-8") as f:
            generated_index = class_index = dependencies_index = p_forwards_index = p_reverse_index = forwards_index = (
                reverse_index
            ) = 0

            lines = f.readlines()
            for line_no, line in enumerate(lines):
                if line.find("Generated by Django") != -1:
                    # Should be the first line, but we shouldn't assume that.
                    generated_index = line_no

                elif line.startswith("class Migration"):
                    class_index = line_no

                elif line.find("dependencies = [") != -1:
                    dependencies_index = line_no

                # Separate tests, so code=dict and reverse_code=type are fine if they are on the same line.
                if line.find("code=dict") != -1:
                    p_forwards_index = line_no

                if line.find("reverse_code=type") != -1:
                    p_reverse_index = line_no

                # Separate tests, so code=str and reverse_code=str are fine if they are on the same line.
                if line.find("code=str") != -1:
                    forwards_index = line_no

                if line.find("reverse_code=int") != -1:
                    reverse_index = line_no

            # We write lines starting from the bottom to the top, so our line numbers are correct through the process.
            lines[reverse_index] = lines[reverse_index].replace("int", "backwards_migrate_workflow")
            lines[forwards_index] = lines[forwards_index].replace("str", "forwards_migrate_workflow")
            lines[p_reverse_index] = lines[p_reverse_index].replace("type", "migrations.RunPython.noop")
            lines[p_forwards_index] = lines[p_forwards_index].replace("dict", "make_sure_permissions_exist")

            forwards = inspect.getsource(forwards_migrate_workflow)
            backwards = inspect.getsource(backwards_migrate_workflow)

            # Add Dependencies

            dependency_data = [
                f"{INDENT8}migrations.swappable_dependency(settings.AUTH_USER_MODEL),{NEWLINE}",
            ]
            for app_name, migration_name in dependencies.items():
                dependency_data.append(f'{INDENT8}("{app_name}", "{migration_name}"),{NEWLINE}')

            lines[dependencies_index + 1 : dependencies_index + 1] = dependency_data

            if self.env_guarded_operations:
                forwards = forwards.split("\n")
                forwards[1:1] = [GUARDED_TEXT]
                forwards = "\n".join(forwards)

                backwards = backwards.split("\n")
                backwards[1:1] = [GUARDED_TEXT]
                backwards = "\n".join(backwards)

            copied_code = [
                f'''{NEWLINE}history_change_reason = "Workflow Migration - {migration_name.replace(".py", "")}"''',
                f"{NEWLINE}keep_history_date = {self.keep_history_date}",
                f'{NEWLINE}migration_app_label = "{app_label}"',
                # Pretty Print is not formatted as nice as black.  At least a small width is better than nothing.
                f"{NEWLINE}changed_data = {pformat(changed_data, width=20)}{NEWLINE}{NEWLINE}",
                f"{forwards}{NEWLINE}{NEWLINE}",
                f"{backwards}{NEWLINE}{NEWLINE}",
                f"{inspect.getsource(SkippableRunSQL)}{NEWLINE}{NEWLINE}",
            ]

            if not self.import_instead:
                copied_code.extend(
                    [
                        f"{inspect.getsource(make_sure_permissions_exist)}{NEWLINE}{NEWLINE}",
                        f"{inspect.getsource(handle_workflow)}{NEWLINE}{NEWLINE}",
                        f"{inspect.getsource(handle_workflow_permission)}{NEWLINE}{NEWLINE}",
                        f"{inspect.getsource(handle_state)}{NEWLINE}{NEWLINE}",
                        f"{inspect.getsource(handle_state_permission)}{NEWLINE}{NEWLINE}",
                        f"{inspect.getsource(handle_initial_state)}{NEWLINE}{NEWLINE}",
                        f"{inspect.getsource(handle_transition)}{NEWLINE}{NEWLINE}",
                        f"{inspect.getsource(handle_transition_permission)}{NEWLINE}{NEWLINE}",
                        f"{inspect.getsource(handle_transition_source)}{NEWLINE}{NEWLINE}",
                        f"{inspect.getsource(add_history_to_data)}{NEWLINE}{NEWLINE}",
                        f"{inspect.getsource(apply_and_save_changes)}{NEWLINE}{NEWLINE}",
                        f"{inspect.getsource(get_id_values_from_item)}{NEWLINE}{NEWLINE}",
                        f"{inspect.getsource(get_id_values_from_dict)}{NEWLINE}{NEWLINE}",
                    ]
                )

            # Changed data and forwards/reverse functions.
            lines[class_index - 1 : class_index] = copied_code

            # Migration Modified Comment - Used to find the latest migration we modified using this management command.

            copied_imports = [
                MIGRATION_MODIFIED_COMMENT,
                "import copy",
                f"{NEWLINE}import datetime",
                f"{NEWLINE}import os",
                f"{NEWLINE}{NEWLINE}",
                "" if self.import_instead else f"from django.apps import apps as django_apps{NEWLINE}",
                f"from django.conf import settings{NEWLINE}",
                (
                    ""
                    if self.import_instead
                    else f"from django.contrib.auth.management import create_permissions{NEWLINE}"
                ),
            ]

            if self.import_instead:
                copied_imports.extend(
                    [
                        f"{NEWLINE}from vueda.workflow.management.commands.makeworkflowmigrations "
                        f"import handle_workflow{NEWLINE}",
                        "from vueda.workflow.management.commands.makeworkflowmigrations "
                        f"import handle_workflow_permission{NEWLINE}",
                        f"from vueda.workflow.management.commands.makeworkflowmigrations import handle_state{NEWLINE}",
                        "from vueda.workflow.management.commands.makeworkflowmigrations "
                        f"import handle_state_permission{NEWLINE}",
                        "from vueda.workflow.management.commands.makeworkflowmigrations "
                        f"import handle_initial_state{NEWLINE}",
                        "from vueda.workflow.management.commands.makeworkflowmigrations "
                        f"import handle_transition{NEWLINE}",
                        "from vueda.workflow.management.commands.makeworkflowmigrations "
                        f"import handle_transition_permission{NEWLINE}",
                        "from vueda.workflow.management.commands.makeworkflowmigrations "
                        f"import handle_transition_source{NEWLINE}",
                        "from vueda.workflow.management.commands.makeworkflowmigrations "
                        f"import make_sure_permissions_exist{NEWLINE}",
                    ]
                )

            else:
                copied_imports.extend(
                    [
                        "from django.utils import timezone",
                    ]
                )

            lines[generated_index + 1 : generated_index + 1] = copied_imports

            f.seek(0)
            f.writelines(lines)

    def _create_migration_per_app(self, changes_by_app):
        for app_label, app_data in changes_by_app.items():
            if "last_migration_path" in app_data:
                # Compare the last migration with the changes data we have.  If they are the same, then
                # you tried to makegroupmigrations multiple times, without faking the last created one.
                # It is also possible that the current changes could contain the last migrations changes, and some more.
                # In this case we need to let the user know they need to delete and try again, or fake and try again.
                spec = importlib.util.spec_from_file_location("migration", app_data["last_migration_path"])
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                previous_changed_data = {data["history_date"]: data for data in module.changed_data}

                similarity = set()
                for current_change in app_data["changes"]:
                    similarity.add(current_change["history_date"] in previous_changed_data)

                if True in similarity and False in similarity:
                    self.stdout.write(
                        self.style.ERROR(
                            f"""{NEWLINE}Workflow changes detected in app "{app_label}", """
                            "but we can't make a migration yet.  Do one of the following:"
                            f"""{NEWLINE}{NEWLINE}1. Delete migration "{app_data["last_migration_path"]}", if """
                            "uncommitted."
                            f"""{NEWLINE}2. Fake migration "{app_data["last_migration_path"]}"."""
                            f'{NEWLINE}{NEWLINE}Once done, run "makeworkflowmigrations" again.'
                        )
                    )
                    return

                elif True in similarity:
                    self.stdout.write(self.style.SUCCESS(f"{NEWLINE}No group changes detected."))
                    return

            migrations_path = Path(app_data["migrations_path"])

            migration_name = self._create_and_get_empty_migration(app_label)
            if migration_name is None:
                raise RuntimeError("Unable to find the name of the newly created migration.")

            if not migration_name:  # Erred.
                return

            migration_file = migrations_path.joinpath(migration_name)

            changes = sorted(app_data["changes"], key=lambda x: x["history_date"])

            if not self.dry_run:
                # Get the last vueda workflow migration name, for dependencies.
                dependency_names = self._get_migration_names_from_show_migrations("vueda_workflow")
                dependencies = {"vueda_workflow": dependency_names[-1]}
                self._rewrite_migration(migration_file, changes, app_label, migration_name, dependencies)

            self.stdout.write(
                self.style.SUCCESS(
                    f"{NEWLINE}Modified migration '{migration_name}' to migrate workflow for {app_label}."
                )
            )
            self.stdout.write(
                self.style.NOTICE(
                    f"{NEWLINE}NOTE: You will need to fake this migration, "
                    f"because you already have the changes.{NEWLINE}"
                )
            )

    def clean_changes_by_app(self, changes):
        for app_label in tuple(changes):
            app_data = changes[app_label]
            if not app_data["changes"]:
                del changes[app_label]
        return changes

    @atomic
    def handle(self, *app_labels, **options):
        self.dry_run = options["dry_run"]
        self.keep_history_date = options["keep_history_date"]
        self.env_guarded_operations = options["env_guarded_operations"]
        self.import_instead = options["import_instead"]

        # If you pass in a specific app, validate that it exists.
        app_labels = set(app_labels)
        has_bad_labels = False
        for app_label in app_labels:
            try:
                django_apps.get_app_config(app_label)
            except LookupError as err:
                self.stderr.write(str(err))
                has_bad_labels = True
        if has_bad_labels:
            sys.exit(2)

        workflow_model_field_names_to_attname = get_attr_names_for_workflow_models()

        all_migrated_data = self._get_vueda_generated_migration_data_per_content_type(app_labels)

        # Models can only have 1 workflow, but associated workflow models may have more than 1 object,
        # so we need to get back the history per associated object.
        # History records will have 1 or 2 results.
        # 1 result means the workflow model hasn't been changed since it was created.
        # 2 results can have 2 meanings:
        # If the results are identical, then the workflow model hasn't changed.
        # If the results are different, then the workflow model has changes which we need to reflect in the migration.
        changes_by_app = {}

        for content_type_ids, migrated_data in all_migrated_data.items():
            for content_type_id in content_type_ids:
                content_type = ContentType.objects.get_for_id(content_type_id)
                model = content_type.model_class()
                model_meta = model._meta
                app_label = model_meta.app_label
                app_name = model_meta.app_config.name

                if app_label not in changes_by_app:
                    migrations_path = os.path.join(model_meta.app_config.path, "migrations")

                    changes_by_app[app_label] = {
                        "app_name": app_name,
                        "app_label": app_label,
                        "migrations_path": migrations_path,
                        "changes": [],
                    }

                    if migrated_data:
                        changes_by_app[app_label].update(
                            {
                                "last_migration_date": migrated_data["last_migration_date"],
                                "last_migration_name": migrated_data["name"],
                                "last_migration_path": os.path.join(
                                    *app_name.split("."), "migrations", f"{migrated_data['name']}.py"
                                ),
                            }
                        )

                if migrated_data is None:
                    last_migrated_date = None
                    history_change_reasons = ()

                else:
                    last_migrated_date = migrated_data["last_migration_date"]
                    history_change_reasons = migrated_data["history_change_reasons"]

                # Workflow - One Object
                model_name = models.Workflow._meta.model_name
                obj = models.Workflow.objects.filter(content_type_id=content_type_id).first()

                historical_workflow_queryset = models.Workflow.history.filter(content_type_id=content_type_id)
                historical_pks = (
                    historical_workflow_queryset.filter(history_change_reason__in=history_change_reasons)
                    .order_by("-history_date")
                    .values_list("pk", flat=True)  # pk = history_id
                )
                last_historical_pk = historical_pks.first()
                excluded_historical_pks = historical_pks[1:]
                historical_queryset = historical_workflow_queryset.exclude(pk__in=excluded_historical_pks)

                if obj is None and not historical_queryset.exists():
                    # Model with HasWorkflowModelMixin class, but no workflow created yet.
                    continue

                elif obj is not None:
                    pk_workflow = obj.id

                else:
                    pk_workflow = historical_workflow_queryset.first().id  # pk = history_id

                historical_changes = get_history_diff_workflow(
                    historical_queryset, last_migrated_date, last_historical_pk
                )

                for historical_change in historical_changes:
                    historical_record = self._convert_historical_change(
                        historical_change, content_type_id, model_name, workflow_model_field_names_to_attname
                    )
                    changes_by_app[app_label]["changes"].append(historical_record)

                # Workflow Permissions - Multiple Objects
                model_name = models.WorkflowPermission._meta.model_name
                historical_queryset = models.WorkflowPermission.history.filter(workflow_id=pk_workflow)
                last_historical_pks, excluded_historical_pks = get_historical_pks(
                    historical_queryset, history_change_reasons
                )
                historical_queryset = historical_queryset.exclude(pk__in=excluded_historical_pks)

                historical_changes = get_history_diff_other_models(
                    historical_queryset, last_migrated_date, last_historical_pks
                )

                for historical_change in historical_changes:
                    historical_record = self._convert_historical_change(
                        historical_change, content_type_id, model_name, workflow_model_field_names_to_attname
                    )
                    changes_by_app[app_label]["changes"].append(historical_record)

                # State - Multiple Objects
                model_name = models.State._meta.model_name
                historical_queryset = models.State.history.filter(workflow_id=pk_workflow)
                last_historical_pks, excluded_historical_pks = get_historical_pks(
                    historical_queryset, history_change_reasons
                )
                pks_state = get_object_pks(historical_queryset)
                historical_queryset = historical_queryset.exclude(pk__in=excluded_historical_pks)

                historical_changes = get_history_diff_other_models(
                    historical_queryset, last_migrated_date, last_historical_pks
                )

                for historical_change in historical_changes:
                    historical_record = self._convert_historical_change(
                        historical_change, content_type_id, model_name, workflow_model_field_names_to_attname
                    )
                    changes_by_app[app_label]["changes"].append(historical_record)

                # State Permissions - Multiple Objects
                model_name = models.StatePermission._meta.model_name
                historical_queryset = models.StatePermission.history.filter(state_id__in=pks_state)
                last_historical_pks, excluded_historical_pks = get_historical_pks(
                    historical_queryset, history_change_reasons
                )
                historical_queryset = historical_queryset.exclude(pk__in=excluded_historical_pks)

                historical_changes = get_history_diff_other_models(
                    historical_queryset, last_migrated_date, last_historical_pks
                )

                for historical_change in historical_changes:
                    historical_record = self._convert_historical_change(
                        historical_change, content_type_id, model_name, workflow_model_field_names_to_attname
                    )
                    changes_by_app[app_label]["changes"].append(historical_record)

                # Initial State - One Object
                model_name = models.InitialState._meta.model_name
                historical_queryset = models.InitialState.history.filter(workflow_id=pk_workflow)
                last_historical_pks, excluded_historical_pks = get_historical_pks(
                    historical_queryset, history_change_reasons
                )
                historical_queryset = historical_queryset.exclude(pk__in=excluded_historical_pks)

                historical_changes = get_history_diff_other_models(
                    historical_queryset, last_migrated_date, last_historical_pks
                )

                for historical_change in historical_changes:
                    historical_record = self._convert_historical_change(
                        historical_change, content_type_id, model_name, workflow_model_field_names_to_attname
                    )
                    changes_by_app[app_label]["changes"].append(historical_record)

                # Transition - Multiple Objects
                model_name = models.Transition._meta.model_name
                historical_queryset = models.Transition.history.filter(workflow_id=pk_workflow)
                last_historical_pks, excluded_historical_pks = get_historical_pks(
                    historical_queryset, history_change_reasons
                )
                pks_transition = get_object_pks(historical_queryset)
                historical_queryset = historical_queryset.exclude(pk__in=excluded_historical_pks)

                historical_changes = get_history_diff_other_models(
                    historical_queryset, last_migrated_date, last_historical_pks
                )

                for historical_change in historical_changes:
                    historical_record = self._convert_historical_change(
                        historical_change, content_type_id, model_name, workflow_model_field_names_to_attname
                    )
                    changes_by_app[app_label]["changes"].append(historical_record)

                # Transition Permissions - Multiple Objects
                model_name = models.TransitionPermission._meta.model_name
                historical_queryset = models.TransitionPermission.history.filter(transition_id__in=pks_transition)
                last_historical_pks, excluded_historical_pks = get_historical_pks(
                    historical_queryset, history_change_reasons
                )
                historical_queryset = historical_queryset.exclude(pk__in=excluded_historical_pks)

                historical_changes = get_history_diff_other_models(
                    historical_queryset, last_migrated_date, last_historical_pks
                )

                for historical_change in historical_changes:
                    historical_record = self._convert_historical_change(
                        historical_change, content_type_id, model_name, workflow_model_field_names_to_attname
                    )
                    changes_by_app[app_label]["changes"].append(historical_record)

                # Transition Sources - Multiple Objects
                model_name = models.TransitionSource._meta.model_name
                historical_queryset = models.TransitionSource.history.filter(transition_id__in=pks_transition)
                last_historical_pks, excluded_historical_pks = get_historical_pks(
                    historical_queryset, history_change_reasons
                )
                historical_queryset = historical_queryset.exclude(pk__in=excluded_historical_pks)

                historical_changes = get_history_diff_other_models(
                    historical_queryset, last_migrated_date, last_historical_pks
                )

                for historical_change in historical_changes:
                    historical_record = self._convert_historical_change(
                        historical_change, content_type_id, model_name, workflow_model_field_names_to_attname
                    )
                    changes_by_app[app_label]["changes"].append(historical_record)

        changes_by_app = self.clean_changes_by_app(changes_by_app)

        if not changes_by_app:
            self.stdout.write(self.style.SUCCESS("No workflow changes detected."))
            return

        self._create_migration_per_app(changes_by_app)
