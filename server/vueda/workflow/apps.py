"""AppConfig for the vueda.workflow application, and its ``class Vueda`` feature section."""

__all__ = (
    "WORKFLOW_SECTION",
    "WorkflowConfig",
)

from django.apps import AppConfig

from vueda.core.features import FeatureOption
from vueda.core.features import FeatureSection
from vueda.core.features import register_feature_section


def _validate_workflow_section(model, options):
    """Report an explicit workflow choice that this release cannot honour yet.

    Workflow participation still follows ``HasWorkflowModelMixin`` inheritance together with the
    matching serializer, view, and filterset mixins. Until the workflow integration derives from
    this policy, an explicit ``enabled`` that disagrees with the model's base classes would be
    accepted and then ignored, so it is a configuration error instead.
    """
    if not options.is_declared("enabled"):
        return []

    from vueda.workflow.models import HasWorkflowModelMixin

    participates = issubclass(model, HasWorkflowModelMixin)
    if options["enabled"] and not participates:
        return [
            f"{model.__name__} declares enabled = True but does not subclass HasWorkflowModelMixin, which is what "
            "currently opts a model into workflow. Subclass HasWorkflowModelMixin as well."
        ]
    if not options["enabled"] and participates:
        return [
            f"{model.__name__} declares enabled = False but subclasses HasWorkflowModelMixin, which currently opts "
            "a model into workflow regardless of this policy. Stop subclassing HasWorkflowModelMixin as well."
        ]
    return []


WORKFLOW_SECTION = register_feature_section(
    FeatureSection(
        name="Workflow",
        app_label="vueda_workflow",
        options={"enabled": FeatureOption(default=False, types=(bool,))},
        validate=_validate_workflow_section,
    )
)


class WorkflowConfig(AppConfig):
    name = "vueda.workflow"
    label = "vueda_workflow"
    verbose_name = "VUEDA Workflow"
