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
from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.core.management import BaseCommand
from django.core.management import call_command
from django.db import migrations
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
    history_data["history_date"] = timezone.now()
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

    elif old_history_record and old_history_record.history_type == "-":
        # If we don't have an old history record, then this workflow
        # was added and deleted between migrations, so we can ignore it.
        if old_history_record is None:
            return None, None

        empty_record = type(old_history_record)()
        return DELETED, empty_record.diff_against(old_history_record)

    else:  # old_history_record is not None
        return CHANGED, new_history_record.diff_against(old_history_record)


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

        choices = []
        workflow_names = (
            "workflow",
            "workflowpermission",
            "state",
            "statepermission",
            "initialstate",
            "transition",
            "transitionpermission",
            "transitionsource",
        )

        for app_data in self._get_apps_with_workflow().values():
            app_name = app_data["app_name"]
            for model_name in app_data["model_to_content_type_ids"]:
                for workflow_name in workflow_names:
                    choices.append(f"{app_name}.{model_name}.{workflow_name}")

        parser.add_argument(
            "--debug",
            action="append",
            choices=choices,
            default=[],
            help=("Print debug information about an apps model and specified workflow model."),
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

    def _get_generated_date_for_vueda_generated_migration(self, migration_path):
        # Return the date created in the django comment.
        django_comment = None

        with open(migration_path, encoding="utf-8") as f:
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
                        "model_to_content_type_ids": {},
                    }
                apps_with_workflow[app_label]["model_to_content_type_ids"][model_name] = content_type.pk

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

    @staticmethod
    def _get_historical_queryset_for_model(model_name, workflow_model, content_type_id):
        match model_name:
            case "initialstate":
                records = workflow_model.history.filter(state__workflow__content_type_id=content_type_id).order_by(
                    "history_date"
                )
                # The workflow was deleted, so 'state__workflow__content_type_id' can't find the state or
                # workflow.
                if not records.exists():
                    workflow_id = (
                        models.HistoricalWorkflow.objects.filter(content_type_id=content_type_id)
                        .values_list("id", flat=True)
                        .first()
                    )
                    state_ids = frozenset(
                        models.HistoricalState.objects.filter(workflow_id=workflow_id).values_list("id", flat=True)
                    )
                    records = workflow_model.history.filter(state_id__in=state_ids)
                return records

            case "state":
                records = workflow_model.history.filter(workflow__content_type_id=content_type_id).order_by(
                    "history_date"
                )
                # The workflow was deleted, so 'workflow__content_type_id' can't find the workflow.
                if not records.exists():
                    workflow_id = (
                        models.HistoricalWorkflow.objects.filter(content_type_id=content_type_id)
                        .values_list("id", flat=True)
                        .first()
                    )
                    records = workflow_model.history.filter(workflow_id=workflow_id)
                return records

            case "statepermission":
                records = workflow_model.history.filter(state__workflow__content_type_id=content_type_id).order_by(
                    "history_date"
                )
                # The workflow was deleted, so 'state__workflow__content_type_id' can't find the state or
                # workflow.
                if not records.exists():
                    workflow_id = (
                        models.HistoricalWorkflow.objects.filter(content_type_id=content_type_id)
                        .values_list("id", flat=True)
                        .first()
                    )
                    state_ids = frozenset(
                        models.HistoricalState.objects.filter(workflow_id=workflow_id).values_list("id", flat=True)
                    )
                    records = workflow_model.history.filter(state_id__in=state_ids)
                return records

            case "transition":
                records = workflow_model.history.filter(workflow__content_type_id=content_type_id).order_by(
                    "history_date"
                )
                # The workflow was deleted, so 'workflow__content_type_id' can't find the workflow.
                if not records.exists():
                    workflow_id = (
                        models.HistoricalWorkflow.objects.filter(content_type_id=content_type_id)
                        .values_list("id", flat=True)
                        .first()
                    )
                    records = workflow_model.history.filter(workflow_id=workflow_id)
                return records

            case "transitionpermission":
                records = workflow_model.history.filter(transition__workflow__content_type_id=content_type_id).order_by(
                    "history_date"
                )
                # The workflow was deleted, so 'transition__workflow__content_type_id' can't find the transition or
                # workflow.
                if not records.exists():
                    workflow_id = (
                        models.HistoricalWorkflow.objects.filter(content_type_id=content_type_id)
                        .values_list("id", flat=True)
                        .first()
                    )
                    transition_ids = frozenset(
                        models.HistoricalTransition.objects.filter(workflow_id=workflow_id).values_list("id", flat=True)
                    )
                    records = workflow_model.history.filter(transition_id__in=transition_ids)

                return records

            case "transitionsource":
                records = workflow_model.history.filter(transition__workflow__content_type_id=content_type_id).order_by(
                    "history_date"
                )
                # The workflow was deleted, so 'transition__workflow__content_type_id' can't find the transition or
                # workflow.
                if not records.exists():
                    workflow_id = (
                        models.HistoricalWorkflow.objects.filter(content_type_id=content_type_id)
                        .values_list("id", flat=True)
                        .first()
                    )
                    source_ids = frozenset(
                        models.HistoricalState.objects.filter(workflow_id=workflow_id).values_list("id", flat=True)
                    )
                    records = workflow_model.history.filter(source_id__in=source_ids)
                return records

            case "workflow":
                return workflow_model.history.filter(content_type_id=content_type_id).order_by("history_date")

            case "workflowpermission":
                records = workflow_model.history.filter(workflow__content_type_id=content_type_id).order_by(
                    "history_date"
                )
                # The workflow was deleted, so 'workflow__content_type_id' can't find the workflow.
                if not records.exists():
                    workflow_id = (
                        models.HistoricalWorkflow.objects.filter(content_type_id=content_type_id)
                        .values_list("id", flat=True)
                        .first()
                    )
                    records = workflow_model.history.filter(workflow_id=workflow_id)
                return records

    @staticmethod
    def _get_content_type_for_model(model_name, history_type, changed_item):
        changed_item = get_id_values_from_dict(changed_item)

        # Using filter and first, or last for historical records, in case things have been deleted.
        match model_name:
            case "initialstate":
                query = changed_item["state_id"]["workflow_id"]
                if history_type == "changed":
                    query = get_id_values_from_dict(query)
                workflow = models.HistoricalWorkflow.objects.filter(**query).last()
                return ContentType.objects.filter(id=workflow.content_type_id).first()

            case "state":
                query = changed_item["workflow_id"]
                if history_type == "changed":
                    query = get_id_values_from_dict(query)
                workflow = models.HistoricalWorkflow.objects.filter(**query).last()
                return ContentType.objects.filter(id=workflow.content_type_id).first()

            case "statepermission":
                query = changed_item["state_id"]["workflow_id"]
                if history_type == "changed":
                    query = get_id_values_from_dict(query)
                workflow = models.HistoricalWorkflow.objects.filter(**query).last()
                return ContentType.objects.filter(id=workflow.content_type_id).first()

            case "transition":
                query = changed_item["workflow_id"]
                if history_type == "changed":
                    query = get_id_values_from_dict(query)
                workflow = models.HistoricalWorkflow.objects.filter(**query).last()
                return ContentType.objects.filter(id=workflow.content_type_id).first()

            case "transitionpermission":
                query = changed_item["transition_id"]["workflow_id"]
                if history_type == "changed":
                    query = get_id_values_from_dict(query)
                workflow = models.HistoricalWorkflow.objects.filter(**query).last()
                return ContentType.objects.filter(id=workflow.content_type_id).first()

            case "transitionsource":
                query = changed_item["source_id"]["workflow_id"]
                if history_type == "changed":
                    query = get_id_values_from_dict(query)
                workflow = models.HistoricalWorkflow.objects.filter(**query).last()
                return ContentType.objects.filter(id=workflow.content_type_id).first()

            case "workflow":
                query = changed_item["content_type_id"]
                if history_type == "changed":
                    query = get_id_values_from_dict(query)
                return ContentType.objects.filter(**query).first()

            case "workflowpermission":
                query = changed_item["workflow_id"]
                if history_type == "changed":
                    query = get_id_values_from_dict(query)
                workflow = models.HistoricalWorkflow.objects.filter(**query).last()
                return ContentType.objects.filter(id=workflow.content_type_id).first()

    def _recursive_compile_changed_item(self, query):
        # Using filter and first, or last for historical records, in case things have been deleted.
        query = get_id_values_from_dict(query, reversing=True)

        for key in tuple(query.keys()):
            match key:
                case "content_type_id":
                    content_type = ContentType.objects.filter(**query.pop("content_type_id")).first()
                    query["content_type"] = content_type

                case "group_id":
                    group = Group.objects.filter(**query.pop("group_id")).first()
                    query["group"] = group

                case "permission_id":
                    sub_query = self._recursive_compile_changed_item(query.pop("permission_id"))
                    query["permission"] = Permission.objects.filter(**sub_query).first()

                case "source_id":
                    sub_query = self._recursive_compile_changed_item(query.pop("source_id"))
                    historical_state = models.HistoricalState.objects.filter(**sub_query).last()
                    query["source_id"] = historical_state.id if historical_state else None

                case "state_id":
                    sub_query = self._recursive_compile_changed_item(query.pop("state_id"))
                    historical_state = models.HistoricalState.objects.filter(**sub_query).last()
                    query["state_id"] = historical_state.id if historical_state else None

                case "target_id":
                    sub_query = self._recursive_compile_changed_item(query.pop("target_id"))
                    historical_state = models.HistoricalState.objects.filter(**sub_query).last()
                    query["target_id"] = historical_state.id if historical_state else None

                case "transition_id":
                    sub_query = self._recursive_compile_changed_item(query.pop("transition_id"))
                    historical_transition = models.HistoricalTransition.objects.filter(**sub_query).last()
                    query["transition_id"] = historical_transition.id if historical_transition else None

                case "workflow_id":
                    sub_query = self._recursive_compile_changed_item(query.pop("workflow_id"))
                    historical_workflow = models.HistoricalWorkflow.objects.filter(**sub_query).last()
                    query["workflow_id"] = historical_workflow.id if historical_workflow else None

        return query

    def _add_previously_matched_pk(self, obj, model_name):
        if obj is not None:
            if model_name not in self.matched_history_records:
                self.matched_history_records[model_name] = set()
            # Use id because the object may be a historical record.
            self.matched_history_records[model_name].add(obj.pk)

    def _remove_previously_matched_pks(self, queryset, model_name):
        previously_matched_pks = self.matched_history_records.get(model_name, ())
        if previously_matched_pks:
            return queryset.exclude(pk__in=previously_matched_pks)
        return queryset

    def _get_history_obj_from_change(self, model_name, changed_item, historical_queryset):
        history_type_text = changed_item["history_type"]
        match history_type_text:
            case "added":
                history_type = "+"
            case "changed":
                history_type = "~"
            case "deleted":
                history_type = "-"
        historical_queryset = historical_queryset.filter(history_type=history_type)

        match model_name:
            case "initialstate":
                initialstate_query = copy.deepcopy(changed_item["changes"])
                initialstate_query = self._recursive_compile_changed_item(initialstate_query)
                del initialstate_query["id"]

                historical_queryset = historical_queryset.filter(**initialstate_query)
                historical_queryset = self._remove_previously_matched_pks(historical_queryset, model_name)

                historical_obj = historical_queryset.first()
                self._add_previously_matched_pk(historical_obj, model_name)

            case "state":
                state_query = copy.deepcopy(changed_item["changes"])
                state_query = self._recursive_compile_changed_item(state_query)
                del state_query["id"]

                historical_queryset = historical_queryset.filter(**state_query)
                historical_queryset = self._remove_previously_matched_pks(historical_queryset, model_name)

                historical_obj = historical_queryset.first()
                self._add_previously_matched_pk(historical_obj, model_name)

            case "statepermission":
                statepermission_query = copy.deepcopy(changed_item["changes"])
                statepermission_query = self._recursive_compile_changed_item(statepermission_query)
                del statepermission_query["id"]

                historical_queryset = historical_queryset.filter(**statepermission_query)
                historical_queryset = self._remove_previously_matched_pks(historical_queryset, model_name)

                historical_obj = historical_queryset.first()
                self._add_previously_matched_pk(historical_obj, model_name)

            case "transition":
                transition_query = copy.deepcopy(changed_item["changes"])
                transition_query = self._recursive_compile_changed_item(transition_query)
                del transition_query["id"]

                historical_queryset = historical_queryset.filter(**transition_query)
                historical_queryset = self._remove_previously_matched_pks(historical_queryset, model_name)

                historical_obj = historical_queryset.first()
                self._add_previously_matched_pk(historical_obj, model_name)

            case "transitionpermission":
                transitionpermission_query = copy.deepcopy(changed_item["changes"])
                transitionpermission_query = self._recursive_compile_changed_item(transitionpermission_query)
                del transitionpermission_query["id"]

                historical_queryset = historical_queryset.filter(**transitionpermission_query)
                historical_queryset = self._remove_previously_matched_pks(historical_queryset, model_name)

                historical_obj = historical_queryset.first()
                self._add_previously_matched_pk(historical_obj, model_name)

            case "transitionsource":
                transitionsource_query = copy.deepcopy(changed_item["changes"])
                transitionsource_query = self._recursive_compile_changed_item(transitionsource_query)
                del transitionsource_query["id"]

                historical_queryset = historical_queryset.filter(**transitionsource_query)
                historical_queryset = self._remove_previously_matched_pks(historical_queryset, model_name)

                historical_obj = historical_queryset.first()
                self._add_previously_matched_pk(historical_obj, model_name)

            case "workflow":
                workflow_query = copy.deepcopy(changed_item["changes"])
                workflow_query = self._recursive_compile_changed_item(workflow_query)
                del workflow_query["id"]

                historical_queryset = historical_queryset.filter(**workflow_query)
                historical_queryset = self._remove_previously_matched_pks(historical_queryset, model_name)

                historical_obj = historical_queryset.first()
                self._add_previously_matched_pk(historical_obj, model_name)

            case "workflowpermission":
                workflowpermission_query = copy.deepcopy(changed_item["changes"])
                workflowpermission_query = self._recursive_compile_changed_item(workflowpermission_query)
                del workflowpermission_query["id"]

                historical_queryset = historical_queryset.filter(**workflowpermission_query)
                historical_queryset = self._remove_previously_matched_pks(historical_queryset, model_name)

                historical_obj = historical_queryset.first()
                self._add_previously_matched_pk(historical_obj, model_name)

        return historical_obj

    def _get_history_compared_to_existing_changes(self, all_migrated_data):
        # Because of the potential that the history dates may not match, we need to parse the
        # changes we find against the changes that we have in existing workflow migrations.
        for app_migrated_data in all_migrated_data.values():
            history_by_model_name = app_migrated_data["history_by_model_name"]
            migrations = app_migrated_data["migrations"]
            models_to_content_type_ids = app_migrated_data["models_to_content_type_ids"]

            for workflow_model in (
                models.Workflow,
                models.WorkflowPermission,
                models.State,
                models.StatePermission,
                models.InitialState,
                models.Transition,
                models.TransitionPermission,
                models.TransitionSource,
            ):
                workflow_model_name = workflow_model._meta.model_name

                for model_name, content_type_id in models_to_content_type_ids.items():
                    if model_name not in history_by_model_name:
                        history_by_model_name[model_name] = {}

                    historical_queryset = self._get_historical_queryset_for_model(
                        workflow_model_name, workflow_model, content_type_id
                    )
                    history_pks = tuple(historical_queryset.values_list("pk", flat=True))
                    existing_history_pks = set()

                    modified_historical_queryset = historical_queryset

                    for migration_data in migrations.values():
                        changed_data = migration_data["changes_by_model_name"].get(workflow_model_name, ())
                        for changed_item in changed_data:
                            content_type = self._get_content_type_for_model(
                                workflow_model_name, changed_item["history_type"], changed_item["changes"]
                            )
                            if content_type.pk != content_type_id:
                                continue

                            history_obj = self._get_history_obj_from_change(
                                workflow_model_name, changed_item, historical_queryset
                            )
                            if history_obj is not None:
                                existing_history_pks.add(history_obj.pk)
                                changed_item["matches_history"] = history_obj.pk

                        modified_historical_queryset = historical_queryset
                        remove_from_history_queryset = frozenset(history_pks) & existing_history_pks
                        if remove_from_history_queryset:
                            modified_historical_queryset = modified_historical_queryset.exclude(
                                pk__in=remove_from_history_queryset
                            )

                    history_by_model_name[model_name][workflow_model_name] = {
                        "queryset": historical_queryset,
                        "unmatched": modified_historical_queryset,
                    }

        return all_migrated_data

    def _get_vueda_generated_migration_data_per_app(self, selected_apps=()):
        migrations_by_app = {}

        for app_label, model_data in self._get_apps_with_workflow(selected_apps).items():
            app_name = model_data["app_name"]

            show_migration_results = self._call_command("showmigrations", app_label)
            if not show_migration_results:  # Erred.  The reason will be printed to the console via the command.
                return None

            migration_names = self._parse_migrations_from_show_migrations(show_migration_results)

            migration_data = {
                "app_label": app_label,
                "app_name": app_name,
                "history_by_model_name": {},
                "history_change_reasons": [],
                "migrations": {},
                "models_to_content_type_ids": model_data["model_to_content_type_ids"],
            }

            for migration_name in migration_names:
                migration_path = os.path.join(*app_name.split("."), "migrations", f"{migration_name}.py")
                django_date = self._get_generated_date_for_vueda_generated_migration(migration_path)
                if django_date:
                    migration_data["history_change_reasons"].append(f"Workflow Migration - {migration_name}")

                    if migration_name not in migration_data["migrations"]:
                        migration_data["migrations"][migration_name] = {
                            "changes_by_model_name": {},
                            "migration_path": migration_path,
                        }

                    spec = importlib.util.spec_from_file_location("migration", migration_path)
                    module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(module)

                    # Break the changes up by model here, so we don't need to do it later.
                    changes_by_model_name = migration_data["migrations"][migration_name]["changes_by_model_name"]
                    for changed_item in module.changed_data:
                        model_name = changed_item["model_name"]
                        if model_name not in changes_by_model_name:
                            changes_by_model_name[model_name] = []

                        changes_by_model_name[model_name].append(changed_item)

            migrations_by_app[app_name] = migration_data

        return migrations_by_app

    @staticmethod
    def _get_history_record_for_date(hist_model, obj_id, history_date):
        hist_obj = hist_model.objects.filter(id=obj_id, history_date__gte=history_date).order_by("history_date").first()

        if hist_obj is None or hist_obj.history_type != "-":
            hist_obj = (
                hist_model.objects.filter(id=obj_id, history_date__lte=history_date).order_by("-history_date").first()
            )

        return hist_obj

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
                # Because there is no transaction number in simple history:
                # If the workflow was deleted, then the history record we
                # want will be the first history record after the date we have.
                # If the workflow wasn't deleted, then the history record we
                # want will be the last history record before the date we have.
                # But, at this point in the code, we don't know if the workflow was deleted or not.
                if change.new:
                    hist_workflow = self._get_history_record_for_date(
                        models.HistoricalWorkflow, change.new, history_diff.new_record.history_date
                    )

                    new = {"code": hist_workflow.code}

                if change.old:
                    hist_workflow = self._get_history_record_for_date(
                        models.HistoricalWorkflow, change.old, history_diff.old_record.history_date
                    )

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
                # Because there is no transaction number in simple history:
                # If the workflow or state was deleted, then the history record we
                # want will be the first history record after the date we have.
                # If the workflow or state wasn't deleted, then the history record we
                # want will be the last history record before the date we have.
                # But, at this point in the code, we don't know if the workflow or state was deleted or not.
                if change.new:
                    hist_state = self._get_history_record_for_date(
                        models.HistoricalState, change.new, history_diff.new_record.history_date
                    )
                    hist_workflow = self._get_history_record_for_date(
                        models.HistoricalWorkflow, hist_state.workflow_id, history_diff.new_record.history_date
                    )

                    new = {
                        "code": hist_state.code,
                        "workflow_id": {"code": hist_workflow.code},
                    }

                if change.old:
                    hist_state = self._get_history_record_for_date(
                        models.HistoricalState, change.old, history_diff.old_record.history_date
                    )
                    hist_workflow = self._get_history_record_for_date(
                        models.HistoricalWorkflow, hist_state.workflow_id, history_diff.old_record.history_date
                    )

                    old = {
                        "code": hist_state.code,
                        "workflow_id": {"code": hist_workflow.code},
                    }

            case "target_id":
                if change.new:
                    hist_state = self._get_history_record_for_date(
                        models.HistoricalState, change.new, history_diff.new_record.history_date
                    )
                    hist_workflow = self._get_history_record_for_date(
                        models.HistoricalWorkflow, hist_state.workflow_id, history_diff.new_record.history_date
                    )

                    new = {
                        "code": hist_state.code,
                        "workflow_id": {"code": hist_workflow.code},
                    }

                if change.old:
                    hist_state = self._get_history_record_for_date(
                        models.HistoricalState, change.old, history_diff.old_record.history_date
                    )
                    hist_workflow = self._get_history_record_for_date(
                        models.HistoricalWorkflow, hist_state.workflow_id, history_diff.old_record.history_date
                    )

                    old = {
                        "code": hist_state.code,
                        "workflow_id": {"code": hist_workflow.code},
                    }

            case "source_id":
                if change.new:
                    hist_state = self._get_history_record_for_date(
                        models.HistoricalState, change.new, history_diff.new_record.history_date
                    )
                    hist_workflow = self._get_history_record_for_date(
                        models.HistoricalWorkflow, hist_state.workflow_id, history_diff.new_record.history_date
                    )

                    new = {
                        "code": hist_state.code,
                        "workflow_id": {"code": hist_workflow.code},
                    }

                if change.old:
                    hist_state = self._get_history_record_for_date(
                        models.HistoricalState, change.old, history_diff.old_record.history_date
                    )
                    hist_workflow = self._get_history_record_for_date(
                        models.HistoricalWorkflow, hist_state.workflow_id, history_diff.old_record.history_date
                    )

                    old = {
                        "code": hist_state.code,
                        "workflow_id": {"code": hist_workflow.code},
                    }

            case "transition_id":
                if change.new:
                    hist_transition = self._get_history_record_for_date(
                        models.HistoricalTransition, change.new, history_diff.new_record.history_date
                    )
                    hist_workflow = self._get_history_record_for_date(
                        models.HistoricalWorkflow, hist_transition.workflow_id, history_diff.new_record.history_date
                    )

                    new = {
                        "code": hist_transition.code,
                        "workflow_id": {"code": hist_workflow.code},
                    }

                if change.old:
                    hist_transition = self._get_history_record_for_date(
                        models.HistoricalTransition, change.old, history_diff.old_record.history_date
                    )
                    hist_workflow = self._get_history_record_for_date(
                        models.HistoricalWorkflow, hist_transition.workflow_id, history_diff.old_record.history_date
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
        capture = False
        for result in results:
            self.stdout.write(result)
            result = result.strip()
            if result == f"Migrations for '{app_label}':":
                capture = True
            if capture and result.endswith(".py"):
                return_value = Path(result).name
                break  # make sure we don't keep looping, in case there are other apps and py files listed.

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
            for app_name, app_migration_name in dependencies.items():
                dependency_data.append(f'{INDENT8}("{app_name}", "{app_migration_name}"),{NEWLINE}')

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

    def print_debug(self, debug_name, app_data):
        if debug_name in self.debug:
            _app_name, model_name, workflow_model_name = debug_name.rsplit(".", 2)
            history_data = app_data["history_by_model_name"][model_name][workflow_model_name]
            queryset = history_data["queryset"]
            unmatched = history_data["unmatched"]

            heading_printed = False
            for migration_name, migration_data in app_data["migrations"].items():
                for change in migration_data["changes_by_model_name"].get(workflow_model_name, ()):
                    if "matches_history" in change and queryset.filter(pk=change["matches_history"]).exists():
                        if not heading_printed:
                            heading_printed = True
                            print("")  # noqa: T201
                            print(f"Changes matching history records - {debug_name}")  # noqa: T201
                            print("")  # noqa: T201

                        print(f"  Change from {migration_name} matches history pk {change['matches_history']}:")  # noqa: T201
                        print("    Change:")  # noqa: T201
                        print(f"      {change}")  # noqa: T201
                        print("    History:")  # noqa: T201
                        print(f"      {queryset.filter(pk=change['matches_history']).values()}")  # noqa: T201

            heading_printed = False
            for migration_name, migration_data in app_data["migrations"].items():
                for change in migration_data["changes_by_model_name"].get(workflow_model_name, ()):
                    if "matches_history" not in change:
                        if not heading_printed:
                            heading_printed = True
                            print("")  # noqa: T201
                            print(f"Changes not matching history records - {debug_name}")  # noqa: T201
                            print("")  # noqa: T201

                        print(f"  Change from {migration_name} does not match history:")  # noqa: T201
                        print("    Change:")  # noqa: T201
                        print(f"      {change}")  # noqa: T201

            heading_printed = False
            if unmatched.exists():
                for history_record in unmatched:
                    if not heading_printed:
                        heading_printed = True
                        print("")  # noqa: T201
                        print(f"Unmatched history - {debug_name}")  # noqa: T201
                        print("")  # noqa: T201

                    print("  History which will be added to the migration:")  # noqa: T201
                    print(f"    {unmatched.filter(pk=history_record.pk).values()}")  # noqa: T201

            print("")  # noqa: T201

    @atomic
    def handle(self, *app_labels, **options):
        self.dry_run = options["dry_run"]
        self.env_guarded_operations = options["env_guarded_operations"]
        self.import_instead = options["import_instead"]
        self.debug = options["debug"]

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

        # Since we are not using the history date anymore, to handle multiple history records that have identical data
        # like the following, we need to keep a cache of the history record pks that we have matched to existing
        # workflow migration changes.  That will allow us to filter from the last history record, so duplicate history
        # data can be handled correctly.
        # Duplicate history data is like this, where they have the same workflow id, state id, and history type.
        # {'id': 1, 'workflow_id': 1, 'state_id': 1, 'history_id':  1, 'history_type': '+', 'history_date': 2024...
        # {'id': 7, 'workflow_id': 1, 'state_id': 1, 'history_id': 11, 'history_type': '+', 'history_date': 2025...
        # The first one is in a migration, the second one isn't.  We need to know the first matches an existing change.
        # Or, if both were in a migration, we need to not match the first record twice, and then add the second to the
        # new migration.
        self.matched_history_records = {}

        all_migrated_data = self._get_vueda_generated_migration_data_per_app(app_labels)
        all_migrated_data = self._get_history_compared_to_existing_changes(all_migrated_data)

        content_types = {x.pk: x for x in ContentType.objects.all()}
        changes_by_app = {}

        for app_name, app_data in all_migrated_data.items():
            app_label = app_data["app_label"]

            changes_by_app[app_label] = {
                "app_name": app_name,
                "app_label": app_label,
                "migrations_path": None,
                "changes": [],
            }

            for model_name, model_data in app_data["history_by_model_name"].items():
                for workflow_model_name, model_history in model_data.items():
                    self.print_debug(f"{app_name}.{model_name}.{workflow_model_name}", app_data)

                    queryset = model_history["queryset"]
                    unmatched = model_history["unmatched"]

                    if unmatched.exists():
                        content_type_id = app_data["models_to_content_type_ids"][model_name]
                        model = content_types[content_type_id].model_class()
                        model_meta = model._meta

                        changes_by_app[app_label]["migrations_path"] = os.path.join(
                            model_meta.app_config.path, "migrations"
                        )

                    for new_record in unmatched:
                        match new_record.history_type:
                            case "+":
                                old_record = None
                                history_date = new_record.history_date

                            case "~":
                                old_record = queryset.filter(
                                    pk__lt=new_record.pk,
                                    id=new_record.id,
                                ).first()
                                history_date = new_record.history_date

                            case "-":
                                old_record = new_record
                                new_record = None
                                history_date = old_record.history_date

                        history_type, history_diff = get_history_diff(old_record, new_record)

                        historical_change = {
                            "diff": history_diff,
                            "type": history_type,
                            "date": history_date,
                        }

                        historical_record = self._convert_historical_change(
                            historical_change,
                            content_type_id,
                            workflow_model_name,
                            workflow_model_field_names_to_attname,
                        )
                        changes_by_app[app_label]["changes"].append(historical_record)

        changes_by_app = self.clean_changes_by_app(changes_by_app)

        if not changes_by_app:
            self.stdout.write(self.style.SUCCESS("No workflow changes detected."))
            return

        self._create_migration_per_app(changes_by_app)
