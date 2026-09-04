"""Models covering each ``class Vueda`` declaration and inheritance shape."""

from django.db import models

from vueda.core.models import Lookup
from vueda.core.models import VuedaModel


class PlainProbe(VuedaModel):
    """A model with no declaration at all, so every section resolves to its registered defaults."""

    name = models.CharField(max_length=255)


class AbstractProbeBase(VuedaModel):
    """An abstract base whose declaration must reach every concrete subclass."""

    name = models.CharField(max_length=255)
    secret = models.CharField(max_length=255, blank=True)
    token = models.CharField(max_length=255, blank=True)

    class Vueda:
        class Probe:
            enabled = True
            tags = ("base",)

        class History:
            exclude_fields = ("secret",)

    class Meta:
        abstract = True


class ProbeTracked(AbstractProbeBase):
    """Overrides inherited options, including one accumulating and one replacing value."""

    class Vueda:
        class Probe:
            label = "tracked"
            tags = ("child",)

        class History:
            exclude_fields = ("token",)


class ProbeOptedOut(AbstractProbeBase):
    """Overrides a single inherited option without redeclaring the rest of the section."""

    class Vueda:
        class Probe:
            enabled = False


class ProbeProxy(ProbeTracked):
    """A proxy, which takes the policy of its concrete model."""

    class Meta:
        proxy = True


class ProbeUntracked(VuedaModel):
    """Opts out of history, so nothing should generate an event model or a trigger for it."""

    name = models.CharField(max_length=255)

    class Vueda:
        class History:
            enabled = False
            reason = "Covers the opt-out path."


class ProbeLookup(Lookup):
    """A lookup table, which carries feature policy the same way a VuedaModel does."""

    class Vueda:
        class Probe:
            enabled = True
            label = "lookup"


class MultiBaseA(VuedaModel):
    name = models.CharField(max_length=255)

    class Vueda:
        class Probe:
            label = "from-a"
            tags = ("a",)

    class Meta:
        abstract = True


class MultiBaseB(VuedaModel):
    class Vueda:
        class Probe:
            enabled = True
            label = "from-b"
            tags = ("b",)

    class Meta:
        abstract = True


class ProbeMulti(MultiBaseA, MultiBaseB):
    """Resolves two competing abstract declarations by method resolution order."""
