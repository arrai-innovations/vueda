from tests.product.viewsets import ProductModelOrderingLookupFormattedNameViewSet
from tests.unit.filtering.urlconf import viewset_urlpatterns


urlpatterns = viewset_urlpatterns(
    "product", "product_model_ordering_lookup_formatted_names", ProductModelOrderingLookupFormattedNameViewSet
)

handler500 = "rest_framework.exceptions.server_error"
handler400 = "rest_framework.exceptions.bad_request"
handler404 = "vueda.core.exceptions.page_not_found"
