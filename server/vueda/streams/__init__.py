"""
Websocket object stream subscriptions for VUEDA.

This app is the integration layer between ``django-object-streams`` and VUEDA. The stream library
owns the subscription protocol, the replayable outbox, capture triggers, and the websocket transport;
it knows nothing about VUEDA. This app supplies what it needs from an application:

- capture, declared per model with ``class Vueda.Streams`` (``vueda.streams.apps``)
- a visibility policy, so a subscription and a list endpoint agree on which rows a user may see
  (``vueda.streams.visibility``)
- registration, so a viewset's FilterSet becomes its subscription filter (``vueda.streams.registry``)
- a consumer that refuses connections without a signed-in user, and routing behind an origin check
  (``vueda.streams.consumers``, ``vueda.streams.routing``)

The app is optional and so is its dependency. Install VUEDA with the ``streams`` extra and add
``object_streams`` and ``vueda.streams`` to ``INSTALLED_APPS``.
"""

__all__ = ()
