from tests.inline.viewsets import InlineAddressViewSet
from tests.inline.viewsets import InlineContactViewSet
from tests.inline.viewsets import InlineParentAddressViewSet
from tests.inline.viewsets import InlineParentBadgeViewSet
from tests.inline.viewsets import InlineParentContactViewSet
from tests.inline.viewsets import InlineParentDeclaredContactViewSet
from tests.inline.viewsets import InlineParentLinesViewSet
from tests.inline.viewsets import InlineParentMemoViewSet
from tests.inline.viewsets import InlineParentNoteViewSet
from tests.inline.viewsets import InlineParentNotNullContactViewSet
from tests.inline.viewsets import InlineParentTagsViewSet
from tests.inline.viewsets import InlineTagViewSet
from vueda.core.routers import VuedaRouter


# The parent has one route for each relation, named `inline.parent-<relation>-list` and `-detail`.
inline_router = VuedaRouter()
inline_router.register("parents_lines", InlineParentLinesViewSet, basename="inline.parent-lines")
inline_router.register("parents_tags", InlineParentTagsViewSet, basename="inline.parent-tags")
inline_router.register("parents_note", InlineParentNoteViewSet, basename="inline.parent-note")
inline_router.register("parents_memo", InlineParentMemoViewSet, basename="inline.parent-memo")
inline_router.register("parents_badge", InlineParentBadgeViewSet, basename="inline.parent-badge")
inline_router.register("parents_contact", InlineParentContactViewSet, basename="inline.parent-contact")
inline_router.register("parents_address", InlineParentAddressViewSet, basename="inline.parent-address")
inline_router.register(
    "parents_declared_contact", InlineParentDeclaredContactViewSet, basename="inline.parent-declared-contact"
)
inline_router.register(
    "parents_not_null_contact", InlineParentNotNullContactViewSet, basename="inline.parent-not-null-contact"
)
inline_router.register("contacts", InlineContactViewSet)
inline_router.register("addresses", InlineAddressViewSet)
inline_router.register("tags", InlineTagViewSet)

urlpatterns = inline_router.urls
