"""AppConfig for the vueda.workflow application, and its ``class Vueda`` feature section."""

__all__ = (
    "OBJECT_STATES_PROXY_FIELD",
    "WORKFLOW_SECTION",
    "WorkflowConfig",
)

from django.apps import AppConfig

from vueda.core.features import FeatureOption
from vueda.core.features import FeatureSection
from vueda.core.features import register_feature_section


# The generic relation to ``ObjectStateProxy`` that ``_contribute_workflow`` adds under this name.
OBJECT_STATES_PROXY_FIELD = "object_states_proxy"


def _workflow_attribute_names():
    """Return every attribute name that an enabled model receives from the workflow app."""
    from vueda.workflow.models import WorkflowModelMethods

    names = {name for name in dir(WorkflowModelMethods) if not name.startswith("__")}
    return names - set(dir(object)) | {OBJECT_STATES_PROXY_FIELD}


def _validate_workflow_section(model, options):
    """Report a model field whose name would hide a workflow attribute on an enabled model.

    A method the model defines is an intentional override and stays allowed. A field is not: a
    ``workflow`` foreign key, for example, would replace the property that workflow permission
    checks read. A model that already inherits the workflow methods from an enabled concrete parent
    received its generic relation from that parent, so it is not checked again.
    """
    if not options["enabled"]:
        return []

    from vueda.workflow.models import WorkflowModelMethods

    if issubclass(model, WorkflowModelMethods):
        return []

    meta = model._meta
    field_names = {field.name for field in (*meta.fields, *meta.many_to_many, *meta.private_fields)}
    return [
        f"{model.__name__} declares a field named {name!r}, which workflow needs for itself. Rename the field."
        for name in sorted(field_names & _workflow_attribute_names())
    ]


def _contribute_workflow(model, options):
    """Give a model whose ``class Vueda.Workflow`` policy enables workflow its workflow behaviour.

    ``WorkflowModelMethods`` goes last in the bases, so the model's own definitions and those of
    its other bases take precedence, and an override reaches the default through ``super()``. A
    child of an enabled concrete parent already inherits both the methods and the relation.
    """
    if not options["Workflow"]["enabled"]:
        return

    from django.contrib.contenttypes.fields import GenericRelation

    from vueda.workflow.models import ObjectStateProxy
    from vueda.workflow.models import WorkflowModelMethods

    if not issubclass(model, WorkflowModelMethods):
        model.__bases__ = (*model.__bases__, WorkflowModelMethods)

    if not any(field.name == OBJECT_STATES_PROXY_FIELD for field in model._meta.private_fields):
        # There is no generic one to one, so this is plural although each object has one state.
        model.add_to_class(OBJECT_STATES_PROXY_FIELD, GenericRelation(ObjectStateProxy))


WORKFLOW_SECTION = register_feature_section(
    FeatureSection(
        name="Workflow",
        app_label="vueda_workflow",
        options={"enabled": FeatureOption(default=False, types=(bool,))},
        validate=_validate_workflow_section,
        contribute=_contribute_workflow,
    )
)


class WorkflowConfig(AppConfig):
    name = "vueda.workflow"
    label = "vueda_workflow"
    verbose_name = "VUEDA Workflow"

    def ready(self):
        from django.core.checks import Tags
        from django.core.checks import register
        from django.db.models.signals import post_save

        from vueda.workflow.checks import check_workflow_definitions
        from vueda.workflow.models import ensure_object_state

        register(check_workflow_definitions, Tags.database)

        # Connected once for every sender rather than per model, because saving a proxy sends the
        # proxy class, which never passes through the feature-policy contributor.
        post_save.connect(ensure_object_state, dispatch_uid="vueda.workflow.ensure_object_state")
