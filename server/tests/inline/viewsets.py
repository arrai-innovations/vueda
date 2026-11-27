from tests.inline import models
from tests.inline import serializers
from vueda.core.viewsets import VuedaViewSet


class InlineContactViewSet(VuedaViewSet):
    queryset = models.InlineContact.objects.all()
    serializer_class = serializers.InlineContactSerializer


class InlineAddressViewSet(VuedaViewSet):
    queryset = models.InlineAddress.objects.all()
    serializer_class = serializers.InlineAddressSerializer


class InlineTagViewSet(VuedaViewSet):
    queryset = models.InlineTag.objects.all()
    serializer_class = serializers.InlineTagSerializer


class InlineParentLinesViewSet(VuedaViewSet):
    queryset = models.InlineParent.objects.all()
    serializer_class = serializers.InlineParentLinesSerializer


class InlineParentTagsViewSet(VuedaViewSet):
    queryset = models.InlineParent.objects.all()
    serializer_class = serializers.InlineParentTagsSerializer


class InlineParentNoteViewSet(VuedaViewSet):
    queryset = models.InlineParent.objects.all()
    serializer_class = serializers.InlineParentNoteSerializer


class InlineParentMemoViewSet(VuedaViewSet):
    queryset = models.InlineParent.objects.all()
    serializer_class = serializers.InlineParentMemoSerializer


class InlineParentBadgeViewSet(VuedaViewSet):
    queryset = models.InlineParent.objects.all()
    serializer_class = serializers.InlineParentBadgeSerializer


class InlineParentContactViewSet(VuedaViewSet):
    queryset = models.InlineParent.objects.all()
    serializer_class = serializers.InlineParentContactSerializer


class InlineParentAddressViewSet(VuedaViewSet):
    queryset = models.InlineParent.objects.all()
    serializer_class = serializers.InlineParentAddressSerializer


class InlineParentDeclaredContactViewSet(VuedaViewSet):
    queryset = models.InlineParent.objects.all()
    serializer_class = serializers.InlineParentDeclaredContactSerializer


class InlineParentNotNullContactViewSet(VuedaViewSet):
    queryset = models.InlineParent.objects.all()
    serializer_class = serializers.InlineParentNotNullContactSerializer
