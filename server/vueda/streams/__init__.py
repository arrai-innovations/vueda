"""
Websocket object stream subscriptions for VUEDA.

This app is the integration layer between ``django-object-streams`` and VUEDA. The stream library
owns the subscription protocol, the replayable outbox, capture triggers, and the websocket transport;
it knows nothing about VUEDA. This app supplies what the library needs from an application:

- capture, declared per model with ``class Vueda.Streams`` (``vueda.streams.apps``)
- a visibility policy, so a subscription sees only the rows that the REST API lets the user read
  (``vueda.streams.visibility``)
- registration, so a viewset's FilterSet becomes its subscription filter (``vueda.streams.registry``)
- a consumer that refuses connections without a signed-in user, and routing behind an origin check
  (``vueda.streams.consumers``, ``vueda.streams.routing``)

The app is optional and so is its dependency. Install VUEDA with the ``streams`` extra and pass
``use_streams=True`` to ``vueda.core.default_settings.get_defaults``, which installs this app,
``object_streams``, and, when workflows are installed, ``vueda.workflow.streams``.
"""

__all__ = ()
