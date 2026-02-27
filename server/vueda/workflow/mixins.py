"""Django view context mixin that injects workflow management URLs."""

__all__ = ("WorkflowUrlsMixin",)

from django.template.loader import render_to_string
from django.urls import reverse
from django.utils.safestring import mark_safe

from vueda.workflow import models


class WorkflowUrlsMixin:
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        context["workflow_overview"] = mark_safe(render_to_string("workflow/view_button.html", request=self.request))
        context["add_workflow"] = mark_safe(render_to_string("workflow/add_button.html", request=self.request))
        context["delete_workflow"] = {}  # Only allowed through here, if there are no associated objects.
        context["edit_workflow"] = {}
        context["edit_state"] = {}
        context["edit_transition"] = {}

        edit_context = context.copy()  # So we don't add 'url' into the context that gets used by the page.
        for workflow_pk in models.Workflow.objects.values_list("pk", flat=True):
            safe_to_delete = True
            edit_context["url"] = reverse("workflow-edit", args=(workflow_pk,))
            edit_context["title"] = "Workflow"
            context["edit_workflow"][workflow_pk] = mark_safe(
                render_to_string(
                    "workflow/edit_button.html",
                    context=edit_context,
                    request=self.request,
                )
            )
            context["edit_state"][workflow_pk] = {}
            context["edit_transition"][workflow_pk] = {}

            edit_context = context.copy()  # So we don't add 'url' into the context that gets used by the page.
            for state_pk in models.State.objects.filter(workflow_id=workflow_pk).values_list("pk", flat=True):
                safe_to_delete = False
                edit_context["url"] = reverse("state-edit", args=(state_pk,))
                edit_context["title"] = "State"
                context["edit_state"][workflow_pk][state_pk] = mark_safe(
                    render_to_string(
                        "workflow/edit_button.html",
                        context=edit_context,
                        request=self.request,
                    )
                )

            edit_context = context.copy()  # So we don't add 'url' into the context that gets used by the page.
            for transition_pk in models.Transition.objects.filter(workflow_id=workflow_pk).values_list("pk", flat=True):
                safe_to_delete = False
                edit_context["url"] = reverse("transition-edit", args=(transition_pk,))
                edit_context["title"] = "Transition"
                context["edit_transition"][workflow_pk][transition_pk] = mark_safe(
                    render_to_string(
                        "workflow/edit_button.html",
                        context=edit_context,
                        request=self.request,
                    )
                )

            if safe_to_delete and (
                models.InitialState.objects.filter(workflow_id=workflow_pk).exists()
                or models.WorkflowPermission.objects.filter(workflow_id=workflow_pk).exists()
                or models.ObjectState.objects.filter(workflow_id=workflow_pk).exists()
            ):
                safe_to_delete = False

            if safe_to_delete:
                delete_context = context.copy()
                delete_context["url"] = reverse("workflow-delete", args=(workflow_pk,))
                delete_context["title"] = "Workflow"

                context["delete_workflow"][workflow_pk] = mark_safe(
                    render_to_string(
                        "workflow/delete_button.html",
                        context=delete_context,
                        request=self.request,
                    )
                )

        return context
