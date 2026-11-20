"""The ``makevuedamigrations`` tool for workflow changes."""

__all__ = (
    "RecordChange",
    "RecordDelta",
    "WorkflowChangeTool",
    "compare_records",
    "get_attr_names_for_workflow_models",
    "get_history_diff",
    "tracked_field_names",
    "workflow_identity",
)

import copy
import importlib

from django.apps import apps as django_apps
from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.core.management import CommandError
from django.db.migrations import operations
from django.db.migrations.loader import MigrationLoader
from django.db.models import Q

from vueda.core.audit import audited_action
from vueda.core.installed_apps import workflow_enabled
from vueda.user.management.commands.utils import NEWLINE
from vueda.user.migration_generation.tools import MigrationContent
from vueda.user.migration_generation.tools import MigrationTool
from vueda.user.migration_generation.tools import PendingChange
from vueda.user.migration_generation.utils import app_migration_names
from vueda.user.migration_generation.utils import generated_migrations
from vueda.user.migration_generation.utils import is_installed_package_app
from vueda.user.migration_generation.utils import user_app_label
from vueda.workflow import models
from vueda.workflow.migration_generation.operations import MIGRATION_ACTION_KIND
from vueda.workflow.migration_generation.operations import MIGRATION_MODIFIED_COMMENTS
from vueda.workflow.migration_generation.operations import WorkflowChangeTypes
from vueda.workflow.migration_generation.operations import get_id_values_from_dict
from vueda.workflow.migration_generation.operations import get_id_values_from_item
from vueda.workflow.migration_generation.operations import get_migration_imports
from vueda.workflow.migration_generation.operations import get_migration_sources
from vueda.workflow.migration_generation.operations import manage_state_objects


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


# The fields whose value in a change names a workflow row by code, and the event model recording it.
# A code identifies a row only among those alive at the time, so resolving one needs a moment to
# resolve it at.
VERSIONED_REFERENCE_EVENT_MODELS = {
    "source_id": models.StateEvent,
    "state_id": models.StateEvent,
    "target_id": models.StateEvent,
    "transition_id": models.TransitionEvent,
    "workflow_id": models.WorkflowEvent,
}


def _content_type_of(workflow_event):
    """Return the content type an event's workflow names, or ``None`` when there is no such event."""
    if workflow_event is None:
        return None
    return ContentType.objects.filter(id=workflow_event.content_type_id).first()


def workflow_identity(workflow_event):
    """Name a workflow the way a change does: its code, and the app and model it was written for.

    A workflow code is unique among live workflows but not over time, so a code alone cannot say
    which workflow a change means once another model has taken that code over. These two columns are
    recorded on the workflow itself for exactly this, and they survive the content type going away.
    """
    return {
        "code": workflow_event.code,
        "historical_app_label": workflow_event.historical_app_label,
        "historical_model": workflow_event.historical_model,
    }


#############################################################################
# Functions used by the management command.
# These are added here for easy testing.
#############################################################################
def get_attr_names_for_workflow_models():
    """Map each workflow model name to a mapping of its field names to their attribute names (``attname``).

    The command adds fields renamed by migrations to this, then reads recorded field names through it.
    """
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


class RecordChange:
    """One field's value before and after a write."""

    __slots__ = ("field", "new", "old")

    def __init__(self, field, old, new):
        self.field = field
        self.old = old
        self.new = new


class RecordDelta:
    """What differs between two events, and the two events themselves.

    A pghistory event model holds the tracked row's own columns and nothing that compares them, so
    the comparison lives here. Everything downstream reads ``changes``, ``old_record``, and
    ``new_record``.
    """

    __slots__ = ("changes", "new_record", "old_record")

    def __init__(self, changes, old_record, new_record):
        self.changes = changes
        self.old_record = old_record
        self.new_record = new_record


def tracked_field_names(event_model):
    """Return an event model's tracked columns as ``(name, attname)`` pairs.

    pghistory copies the tracked row's concrete fields and adds its own ``pgh_`` columns. Change data
    is keyed by field name and read by attname, so both are needed.
    """
    return [
        (field.name, field.attname)
        for field in event_model._meta.concrete_fields
        if not field.attname.startswith("pgh_")
    ]


def compare_records(old_record, new_record):
    """Return the fields whose value differs between two events."""
    changes = [
        RecordChange(name, getattr(old_record, attname), getattr(new_record, attname))
        for name, attname in tracked_field_names(type(new_record))
        if getattr(old_record, attname) != getattr(new_record, attname)
    ]
    return RecordDelta(changes, old_record, new_record)


def get_history_diff(old_history_record, new_history_record):
    """Classify one write and return what it changed.

    A write with nothing before it is an add, and one whose event records a delete is a delete. Each
    compares against an empty row of the same model, so every field the write set or cleared shows
    up as a change.
    """
    if old_history_record is None:
        empty_record = type(new_history_record)()
        return WorkflowChangeTypes.ADDED.value, compare_records(empty_record, new_history_record)

    elif old_history_record.pgh_label == "delete":
        empty_record = type(old_history_record)()
        return WorkflowChangeTypes.DELETED.value, compare_records(old_history_record, empty_record)

    else:  # old_history_record is not None
        return WorkflowChangeTypes.CHANGED.value, compare_records(old_history_record, new_history_record)


# The workflow models whose events a workflow migration replays, by the model name that a change records.
WORKFLOW_MODEL_NAMES = (
    "workflow",
    "workflowpermission",
    "state",
    "statepermission",
    "initialstate",
    "transition",
    "transitionpermission",
    "transitionsource",
)


class WorkflowChangeTool(MigrationTool):
    """Write the workflow changes that pghistory recorded for every app that has, or had, a workflow.

    A change is pending when a person made it and no generated workflow migration holds a matching change. The
    writes that a workflow migration makes are recorded under its own action, so they are never pending. Each
    app's changes go into that app's migration.
    """

    key = "workflow"
    migration_name = "workflow_migrations"
    tie_order = 10

    def add_arguments(self, parser):
        parser.add_argument(
            "--workflow-debug",
            action="append",
            nargs="?",
            const=None,
            default=[],
            metavar="APP.MODEL.WORKFLOWMODEL",
            help=(
                "Print how the recorded workflow changes of a model matched the existing workflow migrations. "
                "Name a model's workflow model as app.model.workflowmodel, or pass all. Give no name to list the "
                "names. Repeat the option to name several."
            ),
        )

    def configure(self, options):
        self.import_instead = options["import_instead"]
        self.debug = options["workflow_debug"]

        if not self.debug:
            return False

        debug_names = self.debug_names()
        if None in self.debug:
            self.stdout.write("Names that --workflow-debug accepts:")
            for debug_name in debug_names:
                self.stdout.write(f"  {debug_name}")
            return True

        unknown = sorted(set(self.debug) - set(debug_names))
        if unknown:
            raise CommandError(
                f"Unknown --workflow-debug name(s): {', '.join(unknown)}. "
                "Pass --workflow-debug with no name to list the names that it accepts."
            )

        return False

    def debug_names(self):
        """Return every name that ``--workflow-debug`` accepts: ``all``, then ``app.model.workflowmodel`` names."""
        names = ["all"]
        for app_data in self._get_apps_with_workflow().values():
            app_name = app_data["app_name"]
            for model_name in app_data["model_to_content_type_ids"]:
                for workflow_model_name in WORKFLOW_MODEL_NAMES:
                    names.append(f"{app_name}.{model_name}.{workflow_model_name}")

        return tuple(names)

    def dependency_app_labels(self):
        # A workflow migration writes workflow rows, names groups and permissions, and attributes its writes to
        # the system user.
        return ("auth", "vueda_user", "vueda_workflow", user_app_label())

    def migration_content(self, app_label, migration_name, changed_data):
        return MigrationContent(
            imports=tuple(get_migration_imports(self.import_instead)),
            preamble=(
                # The app label keeps the action name unique, because migration names no longer carry a date.
                f'history_change_reason = "Workflow Migration - {app_label}.{migration_name}"{NEWLINE}',
                f'migration_app_label = "{app_label}"{NEWLINE}',
            ),
            sources=tuple(get_migration_sources(self.import_instead)),
            permissions_forwards="make_sure_permissions_exist_through_imports",
            permissions_backwards="migrations.RunPython.noop",
            forwards="forwards_migrate_workflow_through_imports",
            backwards="backwards_migrate_workflow_through_imports",
        )

    def finish(self, *, dry_run):
        """Give local objects the states that the new migrations would give them, unless this is a dry run.

        The developer fakes the new migrations locally, so their state sync never runs here. Like that sync, this
        covers every workflow, including one whose model no longer enables workflow.
        """
        if dry_run:
            return

        with audited_action("makevuedamigrations", kind="command"):
            for workflow in models.Workflow.objects.select_related("content_type", "initial_state"):
                model_class = workflow.content_type.model_class()
                if model_class is not None:
                    manage_state_objects(
                        workflow,
                        model_class,
                        models.ObjectState,
                        models.ObjectStateEvent,
                        models.InitialStateEvent,
                    )

    def _get_apps_with_workflow(self, selected_apps=()):
        apps_with_workflow = {}

        for model in django_apps.get_models(include_auto_created=True, include_swapped=True):
            model_meta = model._meta
            app_label = model_meta.app_label
            model_name = model_meta.model_name

            # If you specify apps, skip models not in your app.
            if selected_apps and app_label not in selected_apps:
                continue

            content_type = ContentType.objects.get_for_model(model, for_concrete_model=False)

            if workflow_enabled(model):
                if app_label not in apps_with_workflow:
                    apps_with_workflow[app_label] = {
                        "app_name": model_meta.app_config.name,
                        "model_to_content_type_ids": {},
                    }
                apps_with_workflow[app_label]["model_to_content_type_ids"][model_name] = content_type.pk

            else:  # Deleted Workflows
                # The model no longer carries a workflow, so the only trace of one is what history
                # recorded about it.
                recorded_workflows = models.WorkflowEvent.objects.filter(
                    historical_app_label=app_label, historical_model=model_name
                )
                if recorded_workflows.exists():
                    if app_label not in apps_with_workflow:
                        apps_with_workflow[app_label] = {
                            "app_name": model_meta.app_config.name,
                            "model_to_content_type_ids": {},
                        }
                    apps_with_workflow[app_label]["model_to_content_type_ids"][model_name] = content_type.pk

        return apps_with_workflow

    @staticmethod
    def _get_historical_queryset_for_model(model_name, workflow_model, content_type_id):
        """Return every recorded write for one workflow model, narrowed to one app's workflow.

        The narrowing walks the ids each event recorded, not the rows those ids point at now. A row
        that has since been deleted still has events, and they still belong to the workflow that
        owned it, so selecting through the live relation would drop exactly the writes that a round
        removing a state or a transition made: that row's permissions, and the source rows it
        parented.

        A content type can have owned more than one workflow over time, so every workflow ever
        recorded against it counts.
        """
        events = workflow_model.pgh_event_model.objects

        workflow_ids = frozenset(
            models.WorkflowEvent.objects.filter(content_type_id=content_type_id).values_list("id", flat=True)
        )

        def state_ids():
            return frozenset(
                models.StateEvent.objects.filter(workflow_id__in=workflow_ids).values_list("id", flat=True)
            )

        def transition_ids():
            return frozenset(
                models.TransitionEvent.objects.filter(workflow_id__in=workflow_ids).values_list("id", flat=True)
            )

        match model_name:
            case "workflow":
                return events.filter(content_type_id=content_type_id).order_by("pgh_id")

            case "workflowpermission" | "state" | "initialstate" | "transition":
                return events.filter(workflow_id__in=workflow_ids).order_by("pgh_id")

            case "statepermission":
                return events.filter(state_id__in=state_ids()).order_by("pgh_id")

            case "transitionpermission" | "transitionsource":
                return events.filter(transition_id__in=transition_ids()).order_by("pgh_id")

    @staticmethod
    def _get_content_type_for_model(model_name, history_type, changed_item):
        """Return the content type a change belongs to, or ``None`` when history cannot say.

        A change in a migration file names its workflow by code. Nothing guarantees this database
        recorded that workflow: it may predate the event tables, or belong to a project the file was
        written against. Such a change simply matches nothing here.
        """
        changed_item = get_id_values_from_dict(changed_item)

        # Using filter and first, or last, in case things have been deleted.
        match model_name:
            case "initialstate":
                query = changed_item["state_id"]["workflow_id"]
                if history_type == WorkflowChangeTypes.CHANGED.value:
                    query = get_id_values_from_dict(query)
                workflow = models.WorkflowEvent.objects.filter(**query).order_by("pgh_id").last()
                return _content_type_of(workflow)

            case "state":
                query = changed_item["workflow_id"]
                if history_type == WorkflowChangeTypes.CHANGED.value:
                    query = get_id_values_from_dict(query)
                workflow = models.WorkflowEvent.objects.filter(**query).order_by("pgh_id").last()
                return _content_type_of(workflow)

            case "statepermission":
                query = changed_item["state_id"]["workflow_id"]
                if history_type == WorkflowChangeTypes.CHANGED.value:
                    query = get_id_values_from_dict(query)
                workflow = models.WorkflowEvent.objects.filter(**query).order_by("pgh_id").last()
                return _content_type_of(workflow)

            case "transition":
                query = changed_item["workflow_id"]
                if history_type == WorkflowChangeTypes.CHANGED.value:
                    query = get_id_values_from_dict(query)
                workflow = models.WorkflowEvent.objects.filter(**query).order_by("pgh_id").last()
                return _content_type_of(workflow)

            case "transitionpermission":
                query = changed_item["transition_id"]["workflow_id"]
                if history_type == WorkflowChangeTypes.CHANGED.value:
                    query = get_id_values_from_dict(query)
                workflow = models.WorkflowEvent.objects.filter(**query).order_by("pgh_id").last()
                return _content_type_of(workflow)

            case "transitionsource":
                query = changed_item["source_id"]["workflow_id"]
                if history_type == WorkflowChangeTypes.CHANGED.value:
                    query = get_id_values_from_dict(query)
                workflow = models.WorkflowEvent.objects.filter(**query).order_by("pgh_id").last()
                return _content_type_of(workflow)

            case "workflow":
                query = changed_item["content_type_id"]
                if history_type == WorkflowChangeTypes.CHANGED.value:
                    query = get_id_values_from_dict(query)
                return ContentType.objects.filter(**query).first()

            case "workflowpermission":
                query = changed_item["workflow_id"]
                if history_type == WorkflowChangeTypes.CHANGED.value:
                    query = get_id_values_from_dict(query)
                workflow = models.WorkflowEvent.objects.filter(**query).order_by("pgh_id").last()
                return _content_type_of(workflow)

    def _compile_unversioned_references(self, query):
        """Resolve the references a change makes to rows history does not version.

        Content types, groups and permissions are not workflow rows and have no events, so a change
        naming one can only mean the row that carries that name now.
        """
        query = get_id_values_from_dict(query, reversing=True)

        for key in tuple(query.keys()):
            match key:
                case "content_type_id":
                    query["content_type"] = ContentType.objects.filter(**query.pop("content_type_id")).first()

                case "group_id":
                    group = Group.objects.filter(**query.pop("group_id")).first()
                    # If we don't get back a group, then it was deleted, so we must try to match without it.
                    if group is not None:
                        query["group"] = group

                case "permission_id":
                    sub_query = self._compile_unversioned_references(query.pop("permission_id"))
                    query["permission"] = Permission.objects.filter(**sub_query).first()

        return query

    def _split_change_for_matching(self, changes):
        """Split a change into the values an event can be filtered by and the rows it names by code.

        A code names a row only among the rows alive at the time, so a reference cannot be resolved
        to one row here. It is carried out to be answered against each candidate event instead.
        """
        values = get_id_values_from_dict(changes, reversing=True)
        references = {key: values.pop(key) for key in tuple(values) if key in VERSIONED_REFERENCE_EVENT_MODELS}

        return self._compile_unversioned_references(values), references

    @staticmethod
    def _narrow_to_referenced_codes(candidates, references):
        """Keep only the candidates whose references name a row that has ever carried the codes a change names.

        Answering a reference takes a lookup per candidate, and the values a change can be filtered by
        often leave many candidates alike: every permission for one group differs only in the state
        or transition it names. A row that never carried the code cannot be the one the change means,
        so narrowing to the rows that did first leaves the lookups only the candidates that differ in
        when they carried it. This narrows and never decides: ``_reference_matches`` still answers
        each reference at the moment its candidate was recorded.
        """
        for field, expected in references.items():
            expected = get_id_values_from_item(expected, reversing=True)
            if expected is None:
                candidates = candidates.filter(**{f"{field}__isnull": True})
                continue

            carried = {
                key: get_id_values_from_item(value, reversing=True)
                for key, value in expected.items()
                if key not in VERSIONED_REFERENCE_EVENT_MODELS
            }
            rows = VERSIONED_REFERENCE_EVENT_MODELS[field].objects.filter(**carried).values("id")
            candidates = candidates.filter(**{f"{field}__in": rows})

        return candidates

    def _reference_matches(self, event, field, expected, recorded_at=None):
        """Say whether the row an event names held the codes a change names, when that event was recorded.

        The event records the id of the row it pointed at, which is exact, and the moment it was
        recorded. Together those answer what that row was called at the time, without choosing the
        newest row that ever carried the code and without reading a date recorded on another
        database.

        A nested reference is answered at that same moment, not at the moment its parent row was
        last recorded. A change names every row by the codes they held when it was made, so a
        transition added after its workflow was renamed names its target state under the new
        workflow code, even though the state's own last event predates the rename.
        """
        if recorded_at is None:
            recorded_at = event.pgh_created_at

        expected = get_id_values_from_item(expected, reversing=True)
        recorded_id = getattr(event, field)

        if recorded_id is None:
            return expected is None

        record = self._get_history_record_at(VERSIONED_REFERENCE_EVENT_MODELS[field], recorded_id, recorded_at)
        if record is None:
            return False

        for key, value in expected.items():
            if key in VERSIONED_REFERENCE_EVENT_MODELS:
                if not self._reference_matches(record, key, value, recorded_at):
                    return False

            elif getattr(record, key) != get_id_values_from_item(value, reversing=True):
                return False

        return True

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

    def _replace_renamed_fields(self, query, workflow_model_field_names_to_attname):
        for old_name, new_name in workflow_model_field_names_to_attname.items():
            if old_name in query:
                query[new_name] = query[old_name]
                del query[old_name]

        return query

    def _get_history_obj_from_change(
        self, model_name, changed_item, historical_queryset, workflow_model_field_names_to_attname
    ):
        """Return the recorded write a change describes, or ``None`` when this database has none.

        Candidates are the writes of the same kind whose own values match, which narrows to the rows
        that carried the codes the change names. Where a code was carried by more than one row over
        time those candidates are alike, so the earliest unclaimed one is the change's: changes are
        matched in the order their migrations were generated, and a claimed write is not offered
        twice.
        """
        match changed_item["history_type"]:
            case WorkflowChangeTypes.ADDED.value:
                event_label = "insert"
            case WorkflowChangeTypes.CHANGED.value:
                event_label = "update"
            case WorkflowChangeTypes.DELETED.value:
                event_label = "delete"

        changes = copy.deepcopy(changed_item["changes"])
        del changes["id"]
        changes = self._replace_renamed_fields(changes, workflow_model_field_names_to_attname)

        values, references = self._split_change_for_matching(changes)

        candidates = historical_queryset.filter(pgh_label=event_label).filter(**values)
        candidates = self._narrow_to_referenced_codes(candidates, references)
        candidates = self._remove_previously_matched_pks(candidates, model_name)

        historical_obj = None
        for candidate in candidates.order_by("pgh_id"):
            if all(self._reference_matches(candidate, field, expected) for field, expected in references.items()):
                historical_obj = candidate
                break

        self._add_previously_matched_pk(historical_obj, model_name)

        return historical_obj

    def add_renamed_fields_and_models_to_attr_names(self, workflow_model_field_names_to_attname):
        """Map each renamed field of a workflow model from its old name to its new one, and return the mapping.

        The renames come from vueda_workflow's own migrations, read from the module that ``MIGRATION_MODULES``
        names for it. Without such a module, the mapping is returned unchanged.
        """
        migrations_module, _explicit = MigrationLoader.migrations_module("vueda_workflow")
        if migrations_module is None:
            return workflow_model_field_names_to_attname

        for migration_name in app_migration_names("vueda_workflow"):
            try:
                module = importlib.import_module(f"{migrations_module}.{migration_name}")
            except ModuleNotFoundError:
                continue

            for operation in module.Migration.operations:
                model_name = getattr(operation, "model_name", None)
                if (
                    isinstance(operation, operations.RenameField)
                    and model_name in workflow_model_field_names_to_attname
                ):
                    workflow_model_field_names_to_attname[model_name][operation.old_name] = operation.new_name

        return workflow_model_field_names_to_attname

    def _get_history_compared_to_existing_changes(self, all_migrated_data, workflow_model_field_names_to_attname):
        # Because of the potential that the history dates may not match, we need to parse the
        # changes we find against the changes that we have in existing workflow migrations.
        for app_migrated_data in all_migrated_data.values():
            app_label = app_migrated_data["app_label"]
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

                    recorded = self._get_historical_queryset_for_model(
                        workflow_model_name, workflow_model, content_type_id
                    )
                    # A generated workflow migration opens an action naming itself, so its own
                    # writes are known exactly. Matching them by value could not work anyway: an
                    # event carries the moment it was really written, which for a migration is when
                    # it was applied, not the date of the edit it replays.
                    # A write with no action at all is an edit, so it has to survive this. An
                    # ``exclude`` across the nullable context join would drop it: the comparison is
                    # unknown for a null join, and unknown is not true.
                    historical_queryset = recorded.filter(
                        Q(pgh_context__isnull=True) | ~Q(pgh_context__metadata__kind=MIGRATION_ACTION_KIND)
                    )
                    history_pks = tuple(historical_queryset.values_list("pk", flat=True))
                    existing_history_pks = set()

                    for migration_name, migration_data in migrations.items():
                        changed_data = migration_data["changes_by_model_name"].get(workflow_model_name, ())

                        # A migration that ran here wrote its changes under the action it opened, and
                        # those writes are not candidates. That it ran says nothing about whether the
                        # edits it was generated from are here too: its author fakes it, and rolling
                        # it back and forth afterwards runs it for real on top of those edits. So its
                        # changes are still matched, but only against edits recorded before it first
                        # ran. An edit someone made here afterwards cannot be one it was generated
                        # from, and claiming it would leave it out of the migration they generate.
                        # Faking a migration writes nothing, so its changes are matched against every
                        # edit, which is what the author of a migration does.
                        candidate_queryset = historical_queryset
                        first_ran_at = (
                            # Migrations generated before makevuedamigrations name their action without the app.
                            recorded.filter(
                                pgh_context__metadata__action__in=(
                                    f"Workflow Migration - {app_label}.{migration_name}",
                                    f"Workflow Migration - {migration_name}",
                                )
                            )
                            .order_by("pgh_created_at", "pgh_id")
                            .values_list("pgh_created_at", flat=True)
                            .first()
                        )
                        if first_ran_at is not None:
                            candidate_queryset = historical_queryset.filter(pgh_created_at__lt=first_ran_at)

                        for changed_item in changed_data:
                            content_type = self._get_content_type_for_model(
                                workflow_model_name, changed_item["history_type"], changed_item["changes"]
                            )
                            if content_type is None or content_type.pk != content_type_id:
                                continue

                            history_obj = self._get_history_obj_from_change(
                                workflow_model_name,
                                changed_item,
                                candidate_queryset,
                                workflow_model_field_names_to_attname[workflow_model_name],
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
                        # Every write, which is what a change is diffed against.
                        "queryset": recorded,
                        "unmatched": modified_historical_queryset,
                    }

        return all_migrated_data

    def _get_vueda_generated_migration_data_per_app(self, selected_apps=(), existing_changed_data=None):
        migrations_by_app = {}

        for app_label, model_data in self._get_apps_with_workflow(selected_apps).items():
            app_name = model_data["app_name"]

            migration_data = {
                "app_label": app_label,
                "app_name": app_name,
                "history_by_model_name": {},
                "migrations": {},
                "models_to_content_type_ids": model_data["model_to_content_type_ids"],
            }

            if existing_changed_data is None:
                existing = generated_migrations(app_label, MIGRATION_MODIFIED_COMMENTS)
            else:
                existing = existing_changed_data.get(app_label, ())

            for migration in existing:
                # Break the changes up by model here, so we don't need to do it later.
                changes_by_model_name = {}
                for changed_item in migration.changed_data:
                    model_name = changed_item["model_name"]
                    if model_name not in changes_by_model_name:
                        changes_by_model_name[model_name] = []

                    changes_by_model_name[model_name].append(changed_item)

                migration_data["migrations"][migration.name] = {
                    "changes_by_model_name": changes_by_model_name,
                    "migration_path": migration.path,
                }

            migrations_by_app[app_name] = migration_data

        return migrations_by_app

    @staticmethod
    def _get_history_record_at(event_model, obj_id, recorded_at):
        """Return a related row as it stood when the write being described was recorded.

        A deleted row's closest record is the first event at or after that moment, which is the
        delete itself. A row that still exists is described by its last event at or before it. Which
        applies is not known here, so a delete found first wins and otherwise the earlier event does.

        Ordering is by recorded time, not by event id: ids number each event table separately and
        this compares across two of them. Every event is stamped with ``clock_timestamp()``, so
        writes inside one transaction still order.
        """
        recorded = event_model.objects.filter(id=obj_id)
        event = recorded.filter(pgh_created_at__gte=recorded_at).order_by("pgh_created_at", "pgh_id").first()

        if event is None or event.pgh_label != "delete":
            event = recorded.filter(pgh_created_at__lte=recorded_at).order_by("-pgh_created_at", "-pgh_id").first()

        return event

    # This function is a complexity of 25, but is much cleaner as a single function.
    def _parse_related_fields_into_changes_data(self, history_diff, historical_date, change, field_name, ct):  # noqa C901
        new = change.new
        old = change.old

        match field_name:
            case "content_type_id":
                if change.new:
                    new = {"app_label": ct.app_label, "model": ct.model}

                if change.old:
                    old = {"app_label": ct.app_label, "model": ct.model}

            case "workflow_id":
                # Because an event record carries no transaction number:
                # If the workflow was deleted, then the history record we
                # want will be the first history record after the date we have.
                # If the workflow wasn't deleted, then the history record we
                # want will be the last history record before the date we have.
                # But, at this point in the code, we don't know if the workflow was deleted or not.
                if change.new:
                    hist_workflow = self._get_history_record_at(models.WorkflowEvent, change.new, historical_date)

                    new = workflow_identity(hist_workflow)

                if change.old:
                    hist_workflow = self._get_history_record_at(models.WorkflowEvent, change.old, historical_date)

                    old = workflow_identity(hist_workflow)

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
                # Name the group as each write recorded it, not by its current name. A group that was
                # renamed or deleted since then would otherwise name a group the write never saw.
                if change.new:
                    new = {"name": history_diff.new_record.historical_group_name}

                if change.old:
                    old = {"name": history_diff.old_record.historical_group_name}

            case "state_id":
                # Because an event record carries no transaction number:
                # If the workflow or state was deleted, then the history record we
                # want will be the first history record after the date we have.
                # If the workflow or state wasn't deleted, then the history record we
                # want will be the last history record before the date we have.
                # But, at this point in the code, we don't know if the workflow or state was deleted or not.
                if change.new:
                    hist_state = self._get_history_record_at(models.StateEvent, change.new, historical_date)
                    hist_workflow = self._get_history_record_at(
                        models.WorkflowEvent, hist_state.workflow_id, historical_date
                    )

                    new = {
                        "code": hist_state.code,
                        "workflow_id": workflow_identity(hist_workflow),
                    }

                if change.old:
                    hist_state = self._get_history_record_at(models.StateEvent, change.old, historical_date)
                    hist_workflow = self._get_history_record_at(
                        models.WorkflowEvent, hist_state.workflow_id, historical_date
                    )

                    old = {
                        "code": hist_state.code,
                        "workflow_id": workflow_identity(hist_workflow),
                    }

            case "target_id":
                if change.new:
                    hist_state = self._get_history_record_at(models.StateEvent, change.new, historical_date)
                    hist_workflow = self._get_history_record_at(
                        models.WorkflowEvent, hist_state.workflow_id, historical_date
                    )

                    new = {
                        "code": hist_state.code,
                        "workflow_id": workflow_identity(hist_workflow),
                    }

                if change.old:
                    hist_state = self._get_history_record_at(models.StateEvent, change.old, historical_date)
                    hist_workflow = self._get_history_record_at(
                        models.WorkflowEvent, hist_state.workflow_id, historical_date
                    )

                    old = {
                        "code": hist_state.code,
                        "workflow_id": workflow_identity(hist_workflow),
                    }

            case "source_id":
                if change.new:
                    hist_state = self._get_history_record_at(models.StateEvent, change.new, historical_date)
                    hist_workflow = self._get_history_record_at(
                        models.WorkflowEvent, hist_state.workflow_id, historical_date
                    )

                    new = {
                        "code": hist_state.code,
                        "workflow_id": workflow_identity(hist_workflow),
                    }

                if change.old:
                    hist_state = self._get_history_record_at(models.StateEvent, change.old, historical_date)
                    hist_workflow = self._get_history_record_at(
                        models.WorkflowEvent, hist_state.workflow_id, historical_date
                    )

                    old = {
                        "code": hist_state.code,
                        "workflow_id": workflow_identity(hist_workflow),
                    }

            case "transition_id":
                if change.new:
                    hist_transition = self._get_history_record_at(models.TransitionEvent, change.new, historical_date)
                    hist_workflow = self._get_history_record_at(
                        models.WorkflowEvent, hist_transition.workflow_id, historical_date
                    )

                    new = {
                        "code": hist_transition.code,
                        "workflow_id": workflow_identity(hist_workflow),
                    }

                if change.old:
                    hist_transition = self._get_history_record_at(models.TransitionEvent, change.old, historical_date)
                    hist_workflow = self._get_history_record_at(
                        models.WorkflowEvent, hist_transition.workflow_id, historical_date
                    )

                    old = {
                        "code": hist_transition.code,
                        "workflow_id": workflow_identity(hist_workflow),
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
            new, old = self._parse_related_fields_into_changes_data(
                historical_diff, historical_date, change, field_name, ct
            )

            match historical_type:
                case WorkflowChangeTypes.ADDED.value:
                    current_changes[field_name] = new

                case WorkflowChangeTypes.CHANGED.value:
                    current_changes[field_name] = (old, new)

                case WorkflowChangeTypes.DELETED.value:
                    current_changes[field_name] = old

        # Getting the additional information for 'id' will be easier if we have all the data.
        if historical_type == WorkflowChangeTypes.CHANGED.value:
            _, extra_data_diff = get_history_diff(None, historical_diff.new_record)

            for change in extra_data_diff.changes:
                field_name = change.field

                if field_name == "id":
                    continue

                field_name = workflow_model_field_names_to_attname[model_name][field_name]

                if field_name not in current_changes:
                    new, old = self._parse_related_fields_into_changes_data(
                        extra_data_diff, historical_date, change, field_name, ct
                    )

                    current_changes[field_name] = new

        # Add in the id information, so we can change, delete, and reverse add.
        match model_name:
            case "workflow":
                current_changes["id"] = {
                    "code": current_changes["code"],
                    # Blank when the workflow recorded none, which matches a row that has none.
                    "historical_app_label": current_changes.get("historical_app_label", ""),
                    "historical_model": current_changes.get("historical_model", ""),
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

    def print_debug_unowned_changes(self, app_name, app_data):
        """Print the app's unmatched changes that belong to none of its models, in one section for the app.

        A change belongs to the model whose content type ``_get_content_type_for_model`` returns for
        it, which is how matching decides it. A change belongs to none of the app's models when this
        database never recorded its workflow, or when its workflow belongs to a model outside the app.
        Listing those under each model's heading would repeat every one of them once per model, so
        they get a single section, printed after every model's debug output. The section lists the
        workflow models that ``--workflow-debug`` selects for any model of the app. ``--workflow-debug all``
        selects every workflow model.
        """
        selected_workflow_model_names = None
        if "all" not in self.debug:
            selected_workflow_model_names = set()
            # Every name other than "all" is "app.model.workflowmodel", because configure() refuses any other name.
            for debug_name in self.debug:
                debug_app_name, _model_name, workflow_model_name = debug_name.rsplit(".", 2)
                if debug_app_name == app_name:
                    selected_workflow_model_names.add(workflow_model_name)
            if not selected_workflow_model_names:
                return

        app_content_type_ids = frozenset(app_data["models_to_content_type_ids"].values())

        heading_printed = False
        for migration_name, migration_data in app_data["migrations"].items():
            for workflow_model_name, changes in migration_data["changes_by_model_name"].items():
                if (
                    selected_workflow_model_names is not None
                    and workflow_model_name not in selected_workflow_model_names
                ):
                    continue

                for change in changes:
                    if "matches_history" in change:
                        continue

                    content_type = self._get_content_type_for_model(
                        workflow_model_name, change["history_type"], change["changes"]
                    )
                    if content_type is not None and content_type.pk in app_content_type_ids:
                        continue

                    if not heading_printed:
                        heading_printed = True
                        self.stdout.write("")
                        self.stdout.write(
                            self.style.HTTP_NOT_FOUND(f"Changes not belonging to a recorded model - {app_name}")
                        )
                        self.stdout.write("")

                    self.stdout.write(
                        self.style.MIGRATE_HEADING(
                            f"  {workflow_model_name} change from {migration_name} does not match history:"
                        )
                    )
                    self.stdout.write(self.style.HTTP_NOT_MODIFIED("    Change:"))
                    self.stdout.write(f"      {change}")

        if heading_printed:
            self.stdout.write("")

    def print_debug(self, debug_name, app_data):
        if debug_name in self.debug or "all" in self.debug:
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
                            self.stdout.write("")
                            self.stdout.write(
                                self.style.HTTP_NOT_FOUND(f"Changes matching history records - {debug_name}")
                            )
                            self.stdout.write("")

                        self.stdout.write(
                            self.style.MIGRATE_HEADING(
                                f"  Change from {migration_name} matches history pk {change['matches_history']}:"
                            )
                        )
                        self.stdout.write(self.style.HTTP_NOT_MODIFIED("    Change:"))
                        self.stdout.write(f"      {change}")
                        self.stdout.write(self.style.HTTP_NOT_MODIFIED("    History:"))
                        self.stdout.write(f"      {queryset.filter(pk=change['matches_history']).values()}")

            # Only this model's changes. A change that belongs to no model of the app is listed once,
            # in its own section, by print_debug_unowned_changes.
            own_content_type_id = app_data["models_to_content_type_ids"][model_name]
            heading_printed = False
            for migration_name, migration_data in app_data["migrations"].items():
                for change in migration_data["changes_by_model_name"].get(workflow_model_name, ()):
                    if "matches_history" in change:
                        continue

                    content_type = self._get_content_type_for_model(
                        workflow_model_name, change["history_type"], change["changes"]
                    )
                    if content_type is None or content_type.pk != own_content_type_id:
                        continue

                    if not heading_printed:
                        heading_printed = True
                        self.stdout.write("")
                        self.stdout.write(
                            self.style.HTTP_NOT_FOUND(f"Changes not matching history records - {debug_name}")
                        )
                        self.stdout.write("")

                    self.stdout.write(
                        self.style.MIGRATE_HEADING(f"  Change from {migration_name} does not match history:")
                    )
                    self.stdout.write(self.style.HTTP_NOT_MODIFIED("    Change:"))
                    self.stdout.write(f"      {change}")

            heading_printed = False
            if unmatched.exists():
                for history_record in unmatched:
                    if not heading_printed:
                        heading_printed = True
                        self.stdout.write("")
                        self.stdout.write(self.style.HTTP_NOT_FOUND(f"Unmatched history - {debug_name}"))
                        self.stdout.write("")

                    self.stdout.write(self.style.MIGRATE_HEADING("  History which will be added to the migration:"))
                    self.stdout.write(f"    {unmatched.filter(pk=history_record.pk).values()}")

            self.stdout.write("")

    def pending_changes(self, selected_apps=(), existing_changed_data=None):
        """Return the workflow changes that no generated workflow migration holds, as pending changes.

        ``selected_apps`` narrows the search to those app labels. The command always searches every app, so its
        migrations stay in the order that the changes were made. Tests narrow it to the app that they check.

        ``existing_changed_data`` maps an app label to the ``GeneratedMigration`` records of its earlier
        migrations, in the order applied. Tests pass it so they need no migration files. When it is ``None``,
        the earlier migrations are read from each app's migration files.
        """
        workflow_model_field_names_to_attname = get_attr_names_for_workflow_models()
        workflow_model_field_names_to_attname = self.add_renamed_fields_and_models_to_attr_names(
            workflow_model_field_names_to_attname
        )

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

        all_migrated_data = self._get_vueda_generated_migration_data_per_app(selected_apps, existing_changed_data)
        all_migrated_data = self._get_history_compared_to_existing_changes(
            all_migrated_data, workflow_model_field_names_to_attname
        )

        pending = []

        for app_name, app_data in all_migrated_data.items():
            app_label = app_data["app_label"]

            # Changes recorded at one moment keep the order that the old command wrote them in: by model, then by
            # workflow model, then by event.
            for model_index, (model_name, model_data) in enumerate(app_data["history_by_model_name"].items()):
                for workflow_model_index, (workflow_model_name, model_history) in enumerate(model_data.items()):
                    self.print_debug(f"{app_name}.{model_name}.{workflow_model_name}", app_data)

                    queryset = model_history["queryset"]
                    unmatched = model_history["unmatched"]

                    if unmatched.exists():
                        content_type_id = app_data["models_to_content_type_ids"][model_name]

                        for new_record in unmatched:
                            pgh_id = new_record.pgh_id
                            match new_record.pgh_label:
                                case "insert":
                                    old_record = None
                                    history_date = new_record.pgh_created_at

                                case "update":
                                    # What a write changed is what it changed from, which is the
                                    # write just before it on the same row. Events are ordered
                                    # oldest first, so the row's own most recent earlier event is
                                    # the last of them, not the first: a row written three times
                                    # would otherwise be described against the values it was
                                    # created with, and reversing the write would restore those.
                                    old_record = (
                                        queryset.filter(
                                            pgh_id__lt=new_record.pgh_id,
                                            id=new_record.id,
                                        )
                                        .order_by("pgh_id")
                                        .last()
                                    )
                                    history_date = new_record.pgh_created_at

                                case "delete":
                                    old_record = new_record
                                    new_record = None
                                    history_date = old_record.pgh_created_at

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
                            pending.append(
                                PendingChange(
                                    recorded_at=history_date,
                                    tiebreak=(model_index, workflow_model_index, pgh_id),
                                    app_label=app_label,
                                    data=historical_record,
                                )
                            )

        # After every model's debug output, so the changes that no model claims are the last debug section.
        for app_name, app_data in all_migrated_data.items():
            self.print_debug_unowned_changes(app_name, app_data)

        return self._without_installed_packages(pending)

    def _without_installed_packages(self, pending):
        """Leave out the changes in apps installed as packages, and warn about each such app.

        A project cannot commit a migration written into a package, and a reinstall puts the package's own files
        back.
        """
        packaged = sorted({change.app_label for change in pending if is_installed_package_app(change.app_label)})
        for app_label in packaged:
            count = sum(1 for change in pending if change.app_label == app_label)
            self.stderr.write(
                f"Left out {count} workflow change(s) in {app_label}, because the app is installed as a package. "
                "A project cannot commit a migration into a package."
            )

        return tuple(change for change in pending if change.app_label not in packaged)
