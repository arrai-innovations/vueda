from rest_framework import serializers

from tests.inline import models
from vueda.core.serializers import VuedaSerializer


class InlineContactSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.InlineContact
        fields = ["id", "name"] + VuedaSerializer.Meta.fields


class InlineAddressSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.InlineAddress
        fields = ["id", "name"] + VuedaSerializer.Meta.fields


class InlineTagSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.InlineTag
        fields = ["id", "name"] + VuedaSerializer.Meta.fields


class InlineLineSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.InlineLine
        # No `parent` field: the parent sets it when it saves each line.
        fields = ["id", "name"] + VuedaSerializer.Meta.fields


class InlineNoteSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.InlineNote
        fields = ["id", "name"] + VuedaSerializer.Meta.fields


class InlineMemoSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.InlineMemo
        fields = ["id", "name"] + VuedaSerializer.Meta.fields


class InlineBadgeSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.InlineBadge
        fields = ["id", "name"] + VuedaSerializer.Meta.fields


# One parent serializer for each relation. Each exposes `name` and that one relation, the way the client scenario's form
# has one inline. A full update (PUT) of a serializer that listed every relation would require the ones that the body
# leaves out. Each relation is declared the way the nested writable inlines guide does, in `expandable_fields` only,
# because a client inline sends its rows through the expand. A reverse one-to-one relation is also listed in
# `Meta.read_only_fields`, so a body that sends it without `e` is ignored. Its plain primary key field would
# otherwise be required and reject `null`. The expand still writes the relation, because `read_only_fields` does not
# lock an expand.


class InlineParentLinesSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.InlineParent
        fields = ["id", "name", "lines"] + VuedaSerializer.Meta.fields
        expandable_fields = {"lines": (InlineLineSerializer, {"many": True})}
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)


class InlineParentTagsSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.InlineParent
        fields = ["id", "name", "tags"] + VuedaSerializer.Meta.fields
        expandable_fields = {"tags": (InlineTagSerializer, {"many": True})}
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)


class InlineParentNoteSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.InlineParent
        fields = ["id", "name", "note"] + VuedaSerializer.Meta.fields
        read_only_fields = ["note"]
        expandable_fields = {"note": (InlineNoteSerializer, {})}
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)


class InlineParentMemoSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.InlineParent
        fields = ["id", "name", "memo"] + VuedaSerializer.Meta.fields
        read_only_fields = ["memo"]
        expandable_fields = {"memo": (InlineMemoSerializer, {})}
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)


class InlineParentBadgeSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.InlineParent
        fields = ["id", "name", "badge"] + VuedaSerializer.Meta.fields
        read_only_fields = ["badge"]
        expandable_fields = {"badge": (InlineBadgeSerializer, {})}
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)


class InlineParentContactSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.InlineParent
        fields = ["id", "name", "contact"] + VuedaSerializer.Meta.fields
        expandable_fields = {"contact": (InlineContactSerializer, {})}
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)


class InlineParentAddressSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.InlineParent
        fields = ["id", "name", "address"] + VuedaSerializer.Meta.fields
        expandable_fields = {"address": (InlineAddressSerializer, {})}
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)


class InlineParentDeclaredContactSerializer(VuedaSerializer):
    """Declares ``contact_ref`` for ``contact`` with ``allow_null=False``, so a client may not clear the link.

    The model field allows null, so only the declared field stops a client from clearing the link. The declared
    field's name differs from its ``source``, so the expands find it through ``source``. The ``contact`` expand
    writes ``contact`` by its own name, and the ``contact_detail`` expand writes it through ``source="contact"``.
    """

    contact_ref = serializers.PrimaryKeyRelatedField(
        queryset=models.InlineContact.objects.all(), source="contact", allow_null=False, required=False
    )

    class Meta(VuedaSerializer.Meta):
        model = models.InlineParent
        fields = ["id", "name", "contact_ref"] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "contact": (InlineContactSerializer, {}),
            "contact_detail": (InlineContactSerializer, {"source": "contact"}),
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)


class InlineParentNotNullContactSerializer(VuedaSerializer):
    """Stops a client from clearing ``contact`` through ``Meta.extra_kwargs``, although the model field allows null.

    The ``contact_detail`` expand writes the same field through ``source="contact"``.
    """

    class Meta(VuedaSerializer.Meta):
        model = models.InlineParent
        fields = ["id", "name", "contact"] + VuedaSerializer.Meta.fields
        extra_kwargs = {"contact": {"allow_null": False}}
        expandable_fields = {
            "contact": (InlineContactSerializer, {}),
            "contact_detail": (InlineContactSerializer, {"source": "contact"}),
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)
