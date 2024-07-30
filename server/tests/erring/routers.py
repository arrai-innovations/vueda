from tests.erring.viewsets import NoExpandableFieldsDataViewSet
from vueda.core.routers import IncludeAppInRouteNameRouter


erring_router = IncludeAppInRouteNameRouter()
erring_router.register("no_expandable_fields_data", NoExpandableFieldsDataViewSet)
