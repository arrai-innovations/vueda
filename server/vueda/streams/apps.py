"""AppConfig for the vueda.streams application, and its ``class Vueda`` feature section."""

__all__ = (
    "STREAMS_SECTION",
    "TRIGGER_NAME",
    "StreamsConfig",
)

from django.apps import AppConfig
from django.core.exceptions import ImproperlyConfigured
from django.db import models

from vueda.core.features import FeatureOption
from vueda.core.features import FeatureSection
from vueda.core.features import register_feature_section


#: The name of the capture trigger that the ``Streams`` section adds. pgtrigger names are per model.
TRIGGER_NAME = "object_stream"


def _validate_streams_section(model, options):
    """Report a streams policy that trigger capture cannot honour for this model.

    A failed section never reaches ``contribute``. That keeps a composite primary key away from
    ``ObjectStreamTrigger``, which would otherwise raise when ``makemigrations`` compiles it.
    """
    if not options["enabled"]:
        return []
    if isinstance(model._meta.pk, models.CompositePrimaryKey):
        return [
            f"{model.__name__} has a composite primary key, which object stream capture cannot represent. "
            f"Declare enabled = False in its Streams section."
        ]
    return []


def _contribute_streams(model, options):
    """Add the capture trigger for a model whose ``class Vueda.Streams`` policy enables it.

    The trigger joins the model's own ``Meta.triggers`` while Django prepares the class, so it is
    part of model state before ``makemigrations`` runs. The migration that installs it lands in the
    model's own app.
    """
    if not options["Streams"]["enabled"]:
        return

    import pgtrigger
    from object_streams.triggers import ObjectStreamTrigger

    pgtrigger.register(ObjectStreamTrigger(name=TRIGGER_NAME))(model)


STREAMS_SECTION = register_feature_section(
    FeatureSection(
        name="Streams",
        app_label="vueda_streams",
        options={
            "enabled": FeatureOption(default=False, types=(bool,), migration_relevant=True),
        },
        validate=_validate_streams_section,
        contribute=_contribute_streams,
    )
)
"""The ``Streams`` section of ``class Vueda``, which controls change capture for websocket subscriptions.

Its one option is ``enabled`` (default ``False``). When it is ``True``, a database trigger writes an
outbox row for every insert, update, and delete on the model's table, including bulk writes. Capture is
separate from subscription: a client can subscribe only to a model that is also registered with
``vueda.streams.registry.register_viewset``.

The trigger needs a migration in the model's own app. Run ``makemigrations`` after enabling the
section, then add the ``object_streams`` app's latest migration to the new migration's
``dependencies``:

```python
dependencies = [
    ("store", "0010_previous"),
    ("object_streams", "0003_delivery_cursor"),
]
```

``makemigrations`` does not add that dependency, because the trigger is SQL and Django cannot see that
its body writes to the outbox table. Without it, Django may apply the migration before the outbox
table exists. A later data migration that writes to the model then fails with a missing table.
"""


class StreamsConfig(AppConfig):
    name = "vueda.streams"
    label = "vueda_streams"
    verbose_name = "VUEDA Streams"

    def ready(self):
        from django.apps import apps

        if not apps.is_installed("object_streams"):
            msg = (
                "vueda.streams requires the object_streams app. "
                "Install VUEDA with the 'streams' extra and pass use_streams=True to get_defaults, "
                "which adds 'object_streams' to THIRD_PARTY_APPS."
            )
            raise ImproperlyConfigured(msg)

        # Without it, transitions write no events and subscribers of workflow models miss them silently.
        if apps.is_installed("vueda.workflow") and not apps.is_installed("vueda.workflow.streams"):
            msg = (
                "vueda.streams with vueda.workflow requires vueda.workflow.streams, which captures workflow "
                "transitions. Pass use_streams=True to get_defaults rather than listing 'vueda.streams' in "
                "another app list, so that get_defaults adds it."
            )
            raise ImproperlyConfigured(msg)
