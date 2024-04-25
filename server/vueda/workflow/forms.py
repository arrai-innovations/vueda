from django import forms
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from simple_history.models import HistoricalChanges

from vueda.workflow import models


class RemoveHistoricalContentTypesForm(forms.ModelForm):
    # Remove the historical content types.
    content_type = forms.ModelChoiceField(
        queryset=ContentType.objects.exclude(
            pk__in=[
                content_type.pk
                for content_type in ContentType.objects.all()
                if issubclass(content_type.model_class(), HistoricalChanges)
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
            if self.instance.workflow.initial_state and self.instance == self.instance.workflow.initial_state.state:
                used_by.append("Initial State")

            if self.instance.object_states.exists():
                used_by.append("Site Objects")

            if self.instance.state_permissions.exists():
                used_by.append("State Permissions")

            if self.instance.transition_sources.exists():
                used_by.append("Transition Sources")

            if self.instance.transitions.exists():
                used_by.append("Transitions")

            if used_by:
                raise ValidationError({"DELETE": f"This state is used by {', '.join(used_by)}"})

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


# Using a class for the model formset requires the FORM_RENDERER setting to be set.
# Using this function doesn't require the setting to be set.
WorkflowModelFormSet = forms.modelformset_factory(
    models.Workflow,
    extra=0,
    fields=[
        "content_type",
        "name",
        "code",
    ],
    form=RemoveHistoricalContentTypesForm,
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
)
