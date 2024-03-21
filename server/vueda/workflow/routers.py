from vueda.core.routers import ContentTypeRouter
from vueda.workflow.viewsets import WorkflowViewSet


workflow_router = ContentTypeRouter()
workflow_router.register("workflow", WorkflowViewSet, basename="workflow.workflow")
