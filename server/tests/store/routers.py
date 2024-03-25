from tests.store.viewsets import CartItemViewSet
from tests.store.viewsets import CartViewSet
from tests.store.viewsets import CustomerOrderViewSet
from tests.store.viewsets import CustomerViewSet
from tests.store.viewsets import DistributorViewSet
from tests.store.viewsets import InventoryRecordReasonViewSet
from tests.store.viewsets import InventoryRecordViewSet
from tests.store.viewsets import OptionTypeViewSet
from tests.store.viewsets import OrderItemViewSet
from tests.store.viewsets import ProductOptionViewSet
from tests.store.viewsets import ProductViewSet
from vueda.core.routers import IncludeAppInRouteNameRouter


store_tests_router = IncludeAppInRouteNameRouter()
store_tests_router.register("cart", CartViewSet)
store_tests_router.register("cart_item", CartItemViewSet)
store_tests_router.register("customer", CustomerViewSet)
store_tests_router.register("customer_order", CustomerOrderViewSet)
store_tests_router.register("distributor", DistributorViewSet)
store_tests_router.register("inventory_record", InventoryRecordViewSet)
store_tests_router.register("inventory_record_reason", InventoryRecordReasonViewSet)
store_tests_router.register("option_type", OptionTypeViewSet)
store_tests_router.register("order_item", OrderItemViewSet)
store_tests_router.register("product", ProductViewSet)
store_tests_router.register("product_option", ProductOptionViewSet)
