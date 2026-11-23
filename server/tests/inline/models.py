"""Models for inline save tests: one parent with one relation of each kind that an inline can edit.

Each relation is optional, so a test can start from a parent without the related row and can remove the
row again. History is off: these models test the request shapes of nested writes, not history.
"""

from django.db import models

from vueda.core.models import VuedaModel


NO_HISTORY_REASON = "An inline save fixture; history would add event tables and triggers that it never exercises."

# The parent that an `InlineBadge` moves to when its own parent removes it. A test that removes a badge creates it.
SPARE_PARENT_PK = 9001


class InlineContact(VuedaModel):
    """The target of the parent's forward foreign key."""

    name = models.CharField(max_length=255)

    class Vueda:
        class History:
            enabled = False
            reason = NO_HISTORY_REASON

    def __str__(self):
        return self.name


class InlineAddress(VuedaModel):
    """The target of the parent's forward one-to-one relation."""

    name = models.CharField(max_length=255)

    class Vueda:
        class History:
            enabled = False
            reason = NO_HISTORY_REASON

    def __str__(self):
        return self.name


class InlineTag(VuedaModel):
    """The target of the parent's many-to-many relation."""

    name = models.CharField(max_length=255)

    class Vueda:
        class History:
            enabled = False
            reason = NO_HISTORY_REASON

    def __str__(self):
        return self.name


class InlineParent(VuedaModel):
    """The parent that every inline save test writes through.

    ``contact`` is a forward foreign key, ``address`` is a forward one-to-one relation, and ``tags`` is a
    many-to-many relation. ``lines`` (``InlineLine``) and ``note`` (``InlineNote``) are its reverse relations.
    """

    name = models.CharField(max_length=255)
    contact = models.ForeignKey(InlineContact, null=True, blank=True, on_delete=models.SET_NULL)
    address = models.OneToOneField(InlineAddress, null=True, blank=True, on_delete=models.SET_NULL)
    tags = models.ManyToManyField(InlineTag, blank=True, related_name="parents")

    class Vueda:
        class History:
            enabled = False
            reason = NO_HISTORY_REASON

    def __str__(self):
        return self.name


class InlineLine(VuedaModel):
    """A row of the parent's reverse foreign key, ``lines``."""

    parent = models.ForeignKey(InlineParent, on_delete=models.CASCADE, related_name="lines")
    name = models.CharField(max_length=255)

    class Vueda:
        class History:
            enabled = False
            reason = NO_HISTORY_REASON

    def __str__(self):
        return self.name


class InlineNote(VuedaModel):
    """The row of the parent's reverse one-to-one relation, ``note``."""

    parent = models.OneToOneField(InlineParent, on_delete=models.CASCADE, related_name="note")
    name = models.CharField(max_length=255)

    class Vueda:
        class History:
            enabled = False
            reason = NO_HISTORY_REASON

    def __str__(self):
        return self.name


class InlineMemo(VuedaModel):
    """The row of the parent's reverse one-to-one relation ``memo``. Its one-to-one field uses ``SET_NULL``."""

    parent = models.OneToOneField(InlineParent, null=True, blank=True, on_delete=models.SET_NULL, related_name="memo")
    name = models.CharField(max_length=255)

    class Vueda:
        class History:
            enabled = False
            reason = NO_HISTORY_REASON

    def __str__(self):
        return self.name


class InlineBadge(VuedaModel):
    """The row of the parent's reverse one-to-one relation ``badge``. Its one-to-one field uses ``SET_DEFAULT``.

    The default is the parent with the primary key ``SPARE_PARENT_PK``.
    """

    parent = models.OneToOneField(
        InlineParent, default=SPARE_PARENT_PK, on_delete=models.SET_DEFAULT, related_name="badge"
    )
    name = models.CharField(max_length=255)

    class Vueda:
        class History:
            enabled = False
            reason = NO_HISTORY_REASON

    def __str__(self):
        return self.name


class InlineNoteHold(VuedaModel):
    """A row that holds an ``InlineNote`` with ``on_delete=RESTRICT``, so deleting the held note fails."""

    note = models.ForeignKey(InlineNote, on_delete=models.RESTRICT, related_name="holds")
    name = models.CharField(max_length=255)

    class Vueda:
        class History:
            enabled = False
            reason = NO_HISTORY_REASON

    def __str__(self):
        return self.name
