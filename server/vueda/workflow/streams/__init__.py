"""
Workflow state capture for object streams.

A transition writes a workflow ``ObjectState`` row and never the governed object's own row. This app
installs a capture trigger on the ``ObjectState`` table that maps each write to the governed object,
so subscribers of that object receive a ``workflow_state`` event.

The trigger and its migration belong to this app rather than to ``vueda.workflow`` or
``vueda.streams``, because they exist only when both are installed. ``get_defaults`` adds this app to
``VUEDA_APPS`` when ``VUEDA_APPS`` lists both, so integrators do not list it themselves.
"""

__all__ = ()
