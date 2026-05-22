from vueda.core.open_api import OpenApiDocsGenerationObjectIdModel
from vueda.user import models as user_models
from vueda.workflow import models as workflow_models


CLASSES_TO_HIDE_FROM_WORKFLOW_MANAGEMENT = [
    workflow_models.Workflow,
    workflow_models.WorkflowPermission,
    workflow_models.State,
    workflow_models.StatePermission,
    workflow_models.InitialState,
    workflow_models.Transition,
    workflow_models.TransitionPermission,
    workflow_models.TransitionSource,
    workflow_models.ObjectStateProxy,
    workflow_models.ObjectState,
    user_models.GroupChange,
]

if OpenApiDocsGenerationObjectIdModel is not None:
    CLASSES_TO_HIDE_FROM_WORKFLOW_MANAGEMENT.append(OpenApiDocsGenerationObjectIdModel)

# issubclass requires a tuple, not a list.
CLASSES_TO_HIDE_FROM_WORKFLOW_MANAGEMENT = tuple(CLASSES_TO_HIDE_FROM_WORKFLOW_MANAGEMENT)
