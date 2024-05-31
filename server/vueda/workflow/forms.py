from django import forms
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from simple_history.models import HistoricalChanges

from vueda.core.fields import form as core_form
from vueda.workflow import models


class WorkflowAddForm(forms.ModelForm):
    # Remove the historical content types, vueda.workflow, and django.contrib apps.
    content_type = core_form.ContentTypeModelChoiceField(
        queryset=ContentType.objects.exclude(
            pk__in=[
                content_type.pk
                for content_type in ContentType.objects.all()
                if issubclass(content_type.model_class(), HistoricalChanges)
                or content_type.app_label in ("workflow", "auth", "contenttypes", "sessions", "sites")
            ]
        ).order_by("app_label", "model"),
    )
    name = forms.CharField(max_length=255, required=True)

    class Meta:
        model = models.Workflow
        fields = [
            "content_type",
            "name",
            "code",
        ]


class WorkflowEditForm(forms.ModelForm):
    name = forms.CharField(max_length=255, required=True)

    class Meta:
        model = models.Workflow
        fields = [
            "name",
            "code",
        ]


class RemoveHistoricalPermissionsForm(forms.ModelForm):
    # Remove the historical content types.
    permission = forms.ModelChoiceField(
        queryset=Permission.objects.exclude(
            content_type_id__in=[
                content_type.pk
                for content_type in ContentType.objects.all()
                if issubclass(content_type.model_class(), HistoricalChanges)
            ]
        ).order_by("content_type__app_label", "content_type__model", "codename")
    )

    class Meta:
        model = models.WorkflowPermission
        fields = [
            "permission",
        ]


class ValidateStateNotUsedForm(forms.ModelForm):
    class Meta:
        model = models.State
        fields = [
            "name",
            "code",
        ]

    def clean(self):
        cleaned_data = super().clean()

        if "DELETE" in self.changed_data:
            used_by = []
            errors = []

            if self.instance.object_states.exists():
                errors.append("This state is used by objects in the site.  It cannot be deleted.")

            if self.instance.state_permissions.exists():
                used_by.append("State Permissions")

            if self.instance.transition_sources.exists():
                used_by.append("Transition Sources")

            if self.instance.transitions.exists():
                used_by.append("Transitions")

            if used_by:
                errors.append(
                    f"This state is used by {', '.join(used_by)}.  Please delete these before deleting the state."
                )

            # If you are deleting the initial state as well as the state, then allow deletion.
            if (
                self.instance.workflow.initial_state
                and self.instance == self.instance.workflow.initial_state.state
                and "initial_state-0-DELETE" not in self.data
            ):
                errors.append("This state is used by Initial State.  You can delete it at the same time as the state.")

            if errors:
                raise ValidationError({"DELETE": errors})

        return cleaned_data


class ValidateTransitionNotUsedForm(forms.ModelForm):
    class Meta:
        model = models.Transition
        fields = [
            "name",
            "code",
            "target",
        ]

    def clean(self):
        cleaned_data = super().clean()

        if "DELETE" in self.changed_data:
            used_by = []
            if self.instance.transition_permissions.exists():
                used_by.append("Transition Permissions")

            if self.instance.transition_sources.exists():
                used_by.append("Transition Sources")

            if used_by:
                raise ValidationError({"DELETE": f"This transition is used by {', '.join(used_by)}"})

        return cleaned_data


class FilteredSelectsModelFormset(forms.models.BaseModelFormSet):
    def get_form_kwargs(self, index):
        form_kwargs = super().get_form_kwargs(index)
        for field_name, field in self.form.base_fields.items():
            if isinstance(field, forms.ModelChoiceField) and field_name in {"target"}:
                if not hasattr(field, "_original_queryset"):
                    field._original_queryset = field.queryset
                if self.queryset:  # This is None when adding.
                    field.queryset = field._original_queryset.filter(
                        workflow_id__in=self.queryset.values_list("workflow_id", flat=True)
                    )
        return form_kwargs


class FilteredInlineSelectsInlineFormsetBase(forms.models.BaseInlineFormSet):
    filtered_fields = {}
    filtered_by_instance_field = None

    def get_form_kwargs(self, index):
        form_kwargs = super().get_form_kwargs(index)
        for field_name, field in self.form.base_fields.items():
            if isinstance(field, forms.ModelChoiceField) and field_name in self.filtered_fields:
                # Because we are changing the queryset on the class, in order to display select boxes that
                # are filtered correctly, we need to store the original queryset/  Otherwise, when you
                # look at the second object of a specific type, we would end up with an empty select box.
                if not hasattr(field, "_original_queryset"):
                    field._original_queryset = field.queryset
                filtered_by_value = getattr(
                    self.instance,
                    self.filtered_by_instance_field,
                )
                field.queryset = field._original_queryset.filter(workflow_id=filtered_by_value)
        return form_kwargs


class FilteredWorkflowSelectsInlineFormset(FilteredInlineSelectsInlineFormsetBase):
    filtered_fields = frozenset({"state", "target"})
    filtered_by_instance_field = "pk"


class FilteredTransitionSelectsInlineFormset(FilteredInlineSelectsInlineFormsetBase):
    filtered_fields = frozenset({"source"})
    filtered_by_instance_field = "workflow_id"


# Using a class for the model formset requires the FORM_RENDERER setting to be set.
# Using this function doesn't require the setting to be set.
WorkflowModelAddFormSet = forms.modelformset_factory(
    models.Workflow,
    extra=0,
    fields=[
        "content_type",
        "name",
        "code",
    ],
    form=WorkflowAddForm,
    help_texts={
        "code": _("lowercase with underscores"),
    },
    min_num=1,  # So an empty form causes validation errors.
)


WorkflowModelEditFormSet = forms.modelformset_factory(
    models.Workflow,
    extra=0,
    fields=[
        "name",
        "code",
    ],
    form=WorkflowEditForm,
    help_texts={
        "code": _("lowercase with underscores"),
    },
    min_num=1,  # So an empty form causes validation errors.
)


WorkflowPermissionFormSet = forms.inlineformset_factory(
    models.Workflow,
    models.WorkflowPermission,
    extra=1,
    fields=[
        "permission",
    ],
    fk_name="workflow",
    form=RemoveHistoricalPermissionsForm,
)


InitialStateFormSet = forms.inlineformset_factory(
    models.Workflow,
    models.InitialState,
    extra=0,
    fields=[
        "state",
    ],
    fk_name="workflow",
    min_num=1,
    max_num=1,
    formset=FilteredWorkflowSelectsInlineFormset,
)


StateFormSet = forms.inlineformset_factory(
    models.Workflow,
    models.State,
    extra=1,
    fields=[
        "name",
        "code",
    ],
    fk_name="workflow",
    form=ValidateStateNotUsedForm,
    help_texts={
        "code": _("lowercase with underscores"),
    },
)


TransitionFormSet = forms.inlineformset_factory(
    models.Workflow,
    models.Transition,
    extra=1,
    fields=[
        "name",
        "code",
        "target",
    ],
    fk_name="workflow",
    form=ValidateTransitionNotUsedForm,
    formset=FilteredWorkflowSelectsInlineFormset,
    help_texts={
        "code": _("lowercase with underscores"),
    },
)


StateModelFormSet = forms.modelformset_factory(
    models.State,
    extra=0,
    fields=[
        "name",
        "code",
    ],
    help_texts={
        "code": _("lowercase with underscores"),
    },
    min_num=1,  # So an empty form causes validation errors.
)


StatePermissionFormSet = forms.inlineformset_factory(
    models.State,
    models.StatePermission,
    extra=1,
    fields=[
        "permission",
        "group",
        "grant_or_deny",
    ],
    fk_name="state",
    form=RemoveHistoricalPermissionsForm,
)


TransitionModelFormSet = forms.modelformset_factory(
    models.Transition,
    extra=0,
    fields=[
        "name",
        "code",
        "target",
    ],
    formset=FilteredSelectsModelFormset,
    help_texts={
        "code": _("lowercase with underscores"),
    },
    min_num=1,  # So an empty form causes validation errors.
)


TransitionPermissionFormSet = forms.inlineformset_factory(
    models.Transition,
    models.TransitionPermission,
    extra=1,
    fields=[
        "permission",
    ],
    fk_name="transition",
    form=RemoveHistoricalPermissionsForm,
)


TransitionSourceFormSet = forms.inlineformset_factory(
    models.Transition,
    models.TransitionSource,
    extra=1,
    fields=[
        "source",
    ],
    fk_name="transition",
    formset=FilteredTransitionSelectsInlineFormset,
)
