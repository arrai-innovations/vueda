from tests.bulk_actions.viewsets import CompositeKeyGadgetViewSet
from tests.bulk_actions.viewsets import InheritedKeyGadgetViewSet
from tests.bulk_actions.viewsets import IntegerKeyGadgetViewSet
from tests.bulk_actions.viewsets import LookupKeyGadgetViewSet
from tests.bulk_actions.viewsets import RenamedKwargLookupKeyGadgetViewSet
from tests.bulk_actions.viewsets import StringKeyGadgetViewSet
from tests.bulk_actions.viewsets import UUIDKeyGadgetViewSet
from vueda.core.routers import VuedaRouter


bulk_actions_router = VuedaRouter()
bulk_actions_router.register("integer-key-gadgets", IntegerKeyGadgetViewSet)
bulk_actions_router.register("uuid-key-gadgets", UUIDKeyGadgetViewSet)
bulk_actions_router.register("string-key-gadgets", StringKeyGadgetViewSet)
bulk_actions_router.register("composite-key-gadgets", CompositeKeyGadgetViewSet)
bulk_actions_router.register("inherited-key-gadgets", InheritedKeyGadgetViewSet)
bulk_actions_router.register("lookup-key-gadgets", LookupKeyGadgetViewSet)
bulk_actions_router.register(
    "renamed-kwarg-lookup-key-gadgets",
    RenamedKwargLookupKeyGadgetViewSet,
    basename="bulk_actions.renamedkwarglookupkeygadget",
)

urlpatterns = bulk_actions_router.urls
