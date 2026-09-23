"""Give objects of workflow-enabled models that have no object state their workflow's initial state."""

__all__ = ("Command",)

from django.apps import apps
from django.core.exceptions import ObjectDoesNotExist
from django.core.management.base import BaseCommand
from django.core.management.base import CommandError
from django.db import transaction

from vueda.core.audit import audited_action
from vueda.core.installed_apps import workflow_enabled
from vueda.workflow.exceptions import WorkflowNotConfiguredError
from vueda.workflow.models import ObjectState
from vueda.workflow.models import get_workflow_for_model
from vueda.workflow.models import objects_without_object_state


class Command(BaseCommand):
    help = (
        "Create the missing object state of every object of a workflow-enabled model, in its workflow's "
        "initial state. Existing object states are left as they are, so running it again changes nothing. "
        "Run it after a deploy that enables workflow, for objects the previous release created while the "
        "migrations ran."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "labels",
            nargs="*",
            metavar="app_label[.ModelName]",
            help="Limit the backfill to these apps or models. By default, every workflow-enabled model.",
        )

    def handle(self, *args, labels, **options):
        models = self._selected_models(labels)
        if not models:
            self.stdout.write("No workflow-enabled models selected.")
            return

        failures = []
        with audited_action("backfillworkflowstates", kind="command"):
            for model in models:
                # One model that cannot be backfilled does not stop the others.
                try:
                    created = self._backfill(model)
                except CommandError as exc:
                    failures.append(str(exc))
                    self.stderr.write(str(exc))
                    continue
                self.stdout.write(f"{model._meta.label}: created {created} object state(s).")
        if failures:
            raise CommandError(f"{len(failures)} model(s) could not be backfilled.")

    @staticmethod
    def _selected_models(labels):
        enabled = [model for model in apps.get_models() if workflow_enabled(model) and not model._meta.proxy]
        if not labels:
            return enabled

        selected = []
        for label in labels:
            app_label, _, model_name = label.partition(".")
            try:
                apps.get_app_config(app_label)
            except LookupError as exc:
                raise CommandError(f"No installed app with label {app_label!r}.") from exc
            matches = [
                model
                for model in enabled
                if model._meta.app_label == app_label
                and (not model_name or model._meta.model_name == model_name.lower())
            ]
            if model_name and not matches:
                raise CommandError(f"{label} is not a workflow-enabled model.")
            selected.extend(model for model in matches if model not in selected)
        return selected

    @staticmethod
    def _backfill(model):
        try:
            workflow = get_workflow_for_model(model)
        except WorkflowNotConfiguredError as exc:
            raise CommandError(str(exc)) from exc
        try:
            initial_state = workflow.initial_state.state
        except ObjectDoesNotExist as exc:
            raise CommandError(f"The workflow of {model._meta.label} has no initial state.") from exc

        object_states = ObjectState.objects.filter(workflow=workflow)
        with transaction.atomic():
            before = object_states.count()
            missing = objects_without_object_state(model, workflow).values_list("pk", flat=True)
            ObjectState.objects.bulk_create(
                [ObjectState(workflow=workflow, object_id=pk, state=initial_state) for pk in missing],
                batch_size=1000,
                # A save that created its own object state while this ran keeps it.
                ignore_conflicts=True,
            )
            return object_states.count() - before
