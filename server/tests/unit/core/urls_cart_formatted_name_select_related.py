from tests.store.viewsets import CartFormattedNameMethodViewSet
from tests.unit.filtering.urlconf import viewset_urlpatterns


urlpatterns = viewset_urlpatterns("store", "carts", CartFormattedNameMethodViewSet)

handler500 = "rest_framework.exceptions.server_error"
handler400 = "rest_framework.exceptions.bad_request"
handler404 = "vueda.core.exceptions.page_not_found"
