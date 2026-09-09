"""Rebuild a deleted row from the last thing history recorded about it."""

__all__ = ("last_recorded",)


def last_recorded(model, pk):
    """Return an unsaved ``model`` instance holding the row's last recorded values, or ``None``.

    A deleted row still has to be nameable. A record that references one prints something about it,
    and reading the live row would raise. The instance this returns is never saved; it exists so
    ``__str__`` and the like have the values they need.

    ``None`` comes back when the model records no history, or when history holds nothing for that
    row. A field history excludes is simply absent from the instance, keeping its model default.
    """
    event_model = getattr(model._meta.concrete_model, "pgh_event_model", None)
    if event_model is None:
        return None

    event = event_model.objects.filter(pgh_obj_id=pk).order_by("-pgh_id").first()
    if event is None:
        return None

    return model(
        **{
            field.attname: getattr(event, field.attname)
            for field in model._meta.concrete_fields
            if hasattr(event, field.attname)
        }
    )
