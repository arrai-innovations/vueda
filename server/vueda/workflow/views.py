"""Django views for workflow administration and API integration."""

__all__ = (
    "HasWorkflowViewMixin",
    "HasWorkflowViewSetMixin",
    "WorkflowAddView",
    "WorkflowDeleteView",
    "WorkflowEditView",
    "WorkflowOverviewView",
    "WorkflowStateEditView",
    "WorkflowTransitionEditView",
)

from django.apps import apps as django_apps
from django.contrib import messages
from django.contrib.auth.mixins import PermissionRequiredMixin
from django.contrib.contenttypes.models import ContentType
from django.http import HttpResponseRedirect
from django.shortcuts import render
from django.urls import reverse
from django.utils.safestring import mark_safe
from django.utils.timezone import now
from django.views import View
from django.views.generic import TemplateView

from vueda.core.installed_apps import workflow_enabled
from vueda.user.mixins import LogoutMixin
from vueda.workflow import models
from vueda.workflow.globals import CLASSES_TO_HIDE_FROM_WORKFLOW_MANAGEMENT
from vueda.workflow.mixins import WorkflowUrlsMixin


class HasWorkflowViewMixin:
    """
    Marker for REST framework views whose model participates in a workflow.

    Permission classes own model-scope deferral. This mixin deliberately does not suppress
    permission failures because the complete permission expression may contain unrelated gates.
    """


HasWorkflowViewSetMixin = HasWorkflowViewMixin


class WorkflowOverviewView(WorkflowUrlsMixin, LogoutMixin, PermissionRequiredMixin, TemplateView):
    """
    Provide an overview of workflows, showing states and transitions for each content type, grouped by app.
    """

    template_name = "workflow/overview.jinja2"

    permission_required = ("workflow.read_workflow",)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        workflows = (
            models.Workflow.objects.all()
            .select_related("content_type", "initial_state")
            .prefetch_related(
                "states",
                "states__state_permissions",
                "transitions",
                "transitions__target",
                "transitions__transition_permissions",
                "transitions__transition_sources",
                "workflow_permissions",
            )
            .order_by("content_type__app_label", "content_type__model")
        )
        # organize workflows by app
        context["apps"] = {}
        context["models_without_workflow_policy"] = []
        for workflow in workflows:
            app_label = workflow.content_type.app_label
            model_cls = workflow.content_type.model_class()
            if app_label not in context["apps"]:
                context["apps"][app_label] = {}
            context["apps"][app_label][model_cls] = workflow

            # Warn about a workflow row whose model does not enable workflow in its class Vueda policy.
            if not workflow_enabled(model_cls):
                context["models_without_workflow_policy"].append(
                    (workflow.content_type.app_label, workflow.content_type.model, model_cls.__name__)
                )

        # Warn about a model that enables workflow but has no workflow row.
        context["models_without_workflow_row"] = []
        # A proxy shares its concrete model's workflow row, so only concrete models are listed.
        for model in (model for model in django_apps.get_models() if workflow_enabled(model) and not model._meta.proxy):
            content_type = ContentType.objects.get_for_model(model)
            # Some models don't make sense having a workflow.
            if issubclass(model, CLASSES_TO_HIDE_FROM_WORKFLOW_MANAGEMENT):
                continue
            if (
                not hasattr(model, "pgh_tracked_model")
                and not model._meta.abstract
                and not models.Workflow.objects.filter(content_type=ContentType.objects.get_for_model(model)).exists()
            ):
                context["models_without_workflow_row"].append(
                    (content_type.app_label, content_type.model, model.__name__)
                )
        return context


class WorkflowDeleteView(PermissionRequiredMixin, View):
    http_method_names = [
        "post",
    ]
    permission_required = ("workflow.delete_workflow",)

    def post(self, request, *args, **kwargs):
        pk = kwargs["pk"]

        workflow = models.Workflow.objects.filter(pk=pk)
        if workflow.exists():
            workflow.delete()
            messages.add_message(request, messages.INFO, "Workflow deleted.")

        else:
            messages.add_message(request, messages.ERROR, "Unable to find the Workflow to delete.")

        return HttpResponseRedirect(reverse("workflow-overview"))


class WorkflowAddView(WorkflowUrlsMixin, LogoutMixin, PermissionRequiredMixin, TemplateView):
    template_name = "workflow/add.jinja2"

    permission_required = ("workflow.create_workflow",)

    def get(self, request, *args, **kwargs):
        # Local import, so django doesn't blow up when the django_content_type table doesn't exist.
        from vueda.workflow import forms

        context = self.get_context_data(**kwargs)
        context["title"] = "Workflow"
        context["formset"] = forms.WorkflowModelAddFormSet(queryset=models.Workflow.objects.none())

        return render(request, self.get_template_names(), context)

    def post(self, request, *args, **kwargs):
        # Local import, so django doesn't blow up when the django_content_type table doesn't exist.
        from vueda.workflow import forms

        context = self.get_context_data(**kwargs)
        context["title"] = "Workflow"
        context["formset"] = formset = forms.WorkflowModelAddFormSet(request.POST, request.FILES)

        if formset.is_valid():
            instance = formset.save()
            if instance:
                instance = instance[0]

            return HttpResponseRedirect(reverse("workflow-edit", args=(instance.pk,)))

        messages.add_message(request, messages.ERROR, "Correct the errors below")

        return render(request, self.get_template_names(), context)


class WorkflowEditView(WorkflowUrlsMixin, LogoutMixin, PermissionRequiredMixin, TemplateView):
    template_name = "workflow/edit.jinja2"

    permission_required = ("workflow.update_workflow",)

    def get(self, request, *args, **kwargs):
        # Local import, so django doesn't blow up when the django_content_type table doesn't exist.
        from vueda.workflow import forms

        pk = kwargs["pk"]
        queryset = models.Workflow.objects.filter(pk=pk)
        model_instance = queryset.get()

        context = self.get_context_data(**kwargs)
        context["title"] = "Workflow"
        context["formset"] = forms.WorkflowModelEditFormSet(queryset=queryset)
        context["inline_formsets"] = self.get_inlines_context_data(
            formsets=(
                forms.WorkflowPermissionFormSet(instance=model_instance),
                forms.InitialStateFormSet(instance=model_instance),
                forms.StateFormSet(instance=model_instance),
                forms.TransitionFormSet(instance=model_instance),
            )
        )

        return render(request, self.get_template_names(), context)

    def post(self, request, *args, **kwargs):
        # Local import, so django doesn't blow up when the django_content_type table doesn't exist.
        from vueda.workflow import forms

        pk = kwargs["pk"]
        queryset = models.Workflow.objects.filter(pk=pk)
        model_instance = queryset.get()

        context = self.get_context_data(**kwargs)
        context["title"] = "Workflow"
        context["formset"] = forms.WorkflowModelEditFormSet(request.POST, request.FILES)
        context["inline_formsets"] = self.get_inlines_context_data(
            formsets=(
                forms.WorkflowPermissionFormSet(request.POST, request.FILES, instance=model_instance),
                forms.InitialStateFormSet(request.POST, request.FILES, instance=model_instance),
                forms.StateFormSet(request.POST, request.FILES, instance=model_instance),
                forms.TransitionFormSet(request.POST, request.FILES, instance=model_instance),
            )
        )

        # Since we are going to display state, initial state, and transition inlines on the edit form, and states are
        # in select boxes for the initial state and transitions, we want to save states if they are valid, even if the
        # entire form is invalid, so they can appear in the select boxes.
        is_valid = context["formset"].is_valid()
        for inline_data in context["inline_formsets"]:
            formset = inline_data["formset"]

            if inline_data["name"] == "States":
                if formset.is_valid():
                    saved_objects = formset.save()
                    saved_pks = [obj.pk for obj in saved_objects]

                    for form in formset:
                        if form.instance.pk in saved_pks and form.data[f"{form.prefix}-id"] == "":
                            form.data._mutable = True
                            form.data[f"{form.prefix}-id"] = form.instance.pk
                            # We need to subtract the extra form, or we end up with 1 too many.
                            form.data[f"{formset.management_form.prefix}-INITIAL_FORMS"] = len(formset) - 1
                            form.data._mutable = False

                else:
                    is_valid &= False

            else:
                is_valid &= formset.is_valid()

        if is_valid:
            instance = context["formset"].save()

            for inline_data in context["inline_formsets"]:
                if inline_data["name"] != "States":
                    inline_data["formset"].save()

            # If you save a form with nothing changed, then instance is an empty list, so we need the pk.
            if instance:
                pk = instance[0].pk

            messages.add_message(request, messages.INFO, f"Saved - {now().strftime('%c')}")

            return HttpResponseRedirect(reverse("workflow-edit", args=(pk,)))

        messages.add_message(request, messages.ERROR, "Correct the errors below")

        return render(request, self.get_template_names(), context)


class WorkflowStateEditView(WorkflowUrlsMixin, LogoutMixin, PermissionRequiredMixin, TemplateView):
    template_name = "workflow/edit.jinja2"

    permission_required = ("workflow.update_state",)

    def get(self, request, *args, **kwargs):
        # Local import, so django doesn't blow up when the django_content_type table doesn't exist.
        from vueda.workflow import forms

        pk = kwargs["pk"]
        queryset = models.State.objects.filter(pk=pk)
        model_instance = queryset.get()

        context = self.get_context_data(**kwargs)
        context["head_title"] = "State"
        context["title"] = mark_safe('<span class="state_title">State</span>')
        context["formset"] = forms.StateModelFormSet(queryset=queryset)
        context["inline_formsets"] = self.get_inlines_context_data(
            formsets=(forms.StatePermissionFormSet(instance=model_instance),)
        )
        return render(request, self.get_template_names(), context)

    def post(self, request, *args, **kwargs):
        # Local import, so django doesn't blow up when the django_content_type table doesn't exist.
        from vueda.workflow import forms

        pk = kwargs["pk"]
        queryset = models.State.objects.filter(pk=pk)
        model_instance = queryset.get()

        context = self.get_context_data(**kwargs)
        context["head_title"] = "State"
        context["title"] = mark_safe('<span class="state_title">State</span>')
        context["formset"] = forms.StateModelFormSet(request.POST, request.FILES)
        context["inline_formsets"] = self.get_inlines_context_data(
            formsets=(forms.StatePermissionFormSet(request.POST, request.FILES, instance=model_instance),)
        )
        is_valid = context["formset"].is_valid()
        for inline_data in context["inline_formsets"]:
            is_valid &= inline_data["formset"].is_valid()

        if is_valid:
            instance = context["formset"].save()

            for inline_data in context["inline_formsets"]:
                inline_data["formset"].save()

            # If you save a form with nothing changed, then instance is an empty list, so we need the pk.
            if instance:
                pk = instance[0].pk

            messages.add_message(request, messages.INFO, f"Saved - {now().strftime('%c')}")

            return HttpResponseRedirect(reverse("state-edit", args=(pk,)))

        messages.add_message(request, messages.ERROR, "Correct the errors below")

        return render(request, self.get_template_names(), context)


class WorkflowTransitionEditView(WorkflowUrlsMixin, LogoutMixin, PermissionRequiredMixin, TemplateView):
    template_name = "workflow/edit.jinja2"

    permission_required = ("workflow.update_transition",)

    def get(self, request, *args, **kwargs):
        # Local import, so django doesn't blow up when the django_content_type table doesn't exist.
        from vueda.workflow import forms

        pk = kwargs["pk"]
        queryset = models.Transition.objects.filter(pk=pk)
        model_instance = queryset.get()

        context = self.get_context_data(**kwargs)
        context["head_title"] = "Transition"
        context["title"] = mark_safe('<span class="transition_title">Transition</span>')
        context["formset"] = forms.TransitionModelFormSet(queryset=queryset)
        context["inline_formsets"] = self.get_inlines_context_data(
            formsets=(
                forms.TransitionPermissionFormSet(instance=model_instance),
                forms.TransitionSourceFormSet(instance=model_instance),
            )
        )
        return render(request, self.get_template_names(), context)

    def post(self, request, *args, **kwargs):
        # Local import, so django doesn't blow up when the django_content_type table doesn't exist.
        from vueda.workflow import forms

        pk = kwargs["pk"]
        queryset = models.Transition.objects.filter(pk=pk)
        model_instance = queryset.get()

        context = self.get_context_data(**kwargs)
        context["head_title"] = "Transition"
        context["title"] = mark_safe('<span class="transition_title">Transition</span>')
        context["formset"] = forms.TransitionModelFormSet(request.POST, request.FILES)
        context["inline_formsets"] = self.get_inlines_context_data(
            formsets=(
                forms.TransitionPermissionFormSet(request.POST, request.FILES, instance=model_instance),
                forms.TransitionSourceFormSet(request.POST, request.FILES, instance=model_instance),
            )
        )
        is_valid = context["formset"].is_valid()
        for inline_data in context["inline_formsets"]:
            is_valid &= inline_data["formset"].is_valid()

        if is_valid:
            instance = context["formset"].save()

            for inline_data in context["inline_formsets"]:
                inline_data["formset"].save()

            # If you save a form with nothing changed, then instance is an empty list, so we need the pk.
            if instance:
                pk = instance[0].pk

            messages.add_message(request, messages.INFO, f"Saved - {now().strftime('%c')}")

            return HttpResponseRedirect(reverse("transition-edit", args=(pk,)))

        messages.add_message(request, messages.ERROR, "Correct the errors below")

        return render(request, self.get_template_names(), context)
