from tests.store.viewsets import AnotherNoteViewSet
from tests.store.viewsets import CartItemViewSet
from tests.store.viewsets import CartViewSet
from tests.store.viewsets import CustomerOrderViewSet
from tests.store.viewsets import CustomerViewSet
from tests.store.viewsets import DistributorProxyViewSet
from tests.store.viewsets import DistributorViewSet
from tests.store.viewsets import InventoryRecordReasonViewSet
from tests.store.viewsets import InventoryRecordViewSet
from tests.store.viewsets import InvoiceBaseViewSet
from tests.store.viewsets import InvoiceViewSet
from tests.store.viewsets import NoteStaticOmitViewSet
from tests.store.viewsets import NoteViewSet
from tests.store.viewsets import OptionTypeViewSet
from tests.store.viewsets import OrderCompositePKViewSet
from tests.store.viewsets import OrderItemAltCompositePKViewSet
from tests.store.viewsets import OrderItemCompositePKViewSet
from tests.store.viewsets import ProductOptionViewSet
from tests.store.viewsets import ProductViewSet
from vueda.core.routers import VuedaRouter


store_tests_router = VuedaRouter()
store_tests_router.register("carts", CartViewSet)
store_tests_router.register("cart_items", CartItemViewSet)
store_tests_router.register("customers", CustomerViewSet)
store_tests_router.register("customer_orders", CustomerOrderViewSet)
store_tests_router.register("distributor_proxies", DistributorProxyViewSet)
store_tests_router.register("distributors", DistributorViewSet)
store_tests_router.register("inventory_records", InventoryRecordViewSet)
store_tests_router.register("inventory_record_reasons", InventoryRecordReasonViewSet)
store_tests_router.register("invoices", InvoiceViewSet)
store_tests_router.register("invoices_base", InvoiceBaseViewSet, basename="store.invoice-base")
store_tests_router.register("another_notes", AnotherNoteViewSet, basename="store.another-note")
store_tests_router.register("notes", NoteViewSet)
store_tests_router.register("notes_static_omit", NoteStaticOmitViewSet, basename="store.note-static-omit")
store_tests_router.register("option_types", OptionTypeViewSet)
store_tests_router.register("order_composite_pk", OrderCompositePKViewSet)
store_tests_router.register("order_items_alt_composite_pk", OrderItemAltCompositePKViewSet)
store_tests_router.register("order_items_composite_pk", OrderItemCompositePKViewSet)
store_tests_router.register("products", ProductViewSet)
store_tests_router.register("product_options", ProductOptionViewSet)

urlpatterns = store_tests_router.urls
