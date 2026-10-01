from tests.store.viewsets import CartM2MSearchAggregateViewSet
from tests.unit.filtering.urlconf import viewset_urlpatterns


urlpatterns = viewset_urlpatterns("store", "carts", CartM2MSearchAggregateViewSet)

handler500 = "rest_framework.exceptions.server_error"
handler400 = "rest_framework.exceptions.bad_request"
handler404 = "vueda.core.exceptions.page_not_found"
