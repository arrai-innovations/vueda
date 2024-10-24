from vueda.core.routers import ContentTypeRouter
from vueda.workflow.viewsets import WorkflowViewSet


workflow_router = ContentTypeRouter()
workflow_router.register("workflows", WorkflowViewSet, basename="workflow.workflow")

urlpatterns = workflow_router.urls
