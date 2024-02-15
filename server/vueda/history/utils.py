from django.apps.registry import Apps
from django.utils import timezone
from simple_history.models import HistoricalRecords

from vueda.history.models import SimpleHistoryModelMixin
from vueda.utils import get_system_user


DEFAULT = object()


def create_historical_record(
    apps: Apps,
    instance: SimpleHistoryModelMixin,
    history_type,
    history_date=None,
    user_id=DEFAULT,
    history_change_reason="",
    manager=None,
):
    """
    Calling save on models in migrations does not trigger post_save signals,
     which is how simple_history creates rows in their history tables
    """
    if user_id is DEFAULT:
        user_id = get_system_user(apps).pk
    # noinspection PyProtectedMember
    opts = instance._meta
    attrs = {}
    for field in opts.fields:
        attrs[field.attname] = getattr(instance, field.attname)
    if history_change_reason:
        attrs["history_change_reason"] = history_change_reason
    attrs["history_relation"] = instance
    return (manager or apps.get_model(opts.app_label, "Historical{}".format(opts.model_name)).objects).create(
        history_date=history_date or timezone.now(), history_type=history_type, history_user_id=user_id, **attrs
    )


def get_request_from_simple_history_middleware():
    return getattr(HistoricalRecords.context, "request", None)
