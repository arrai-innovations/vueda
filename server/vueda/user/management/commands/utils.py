"""Utilities for group migration management commands."""

__all__ = (
    "create_group_change",
    "get_matching_record",
)


def get_matching_record(change, group_change_model):
    """Return GroupChange.pk if a record matching this change exists, None otherwise."""
    # Need group_change_model since we could be running from a migration.
    obj = group_change_model.objects.filter(
        group_name=change["group_name"],
        group_name_old=change["group_name_old"],
        change_type=change["change_type"],
        when=change["when"],
        historical_permission_codename=change["historical_permission_codename"],
        historical_permission_content_type_app_label=change["historical_permission_content_type_app_label"],
        historical_permission_content_type_model_name=change["historical_permission_content_type_model_name"],
    ).order_by("when")
    if obj.exists():
        return obj.first().pk


def create_group_change(change, group_change_model):
    # Need group_change_model since we could be running from a migration.
    obj = group_change_model.objects.create(
        group_name=change["group_name"],
        group_name_old=change["group_name_old"],
        change_type=change["change_type"],
        historical_permission_codename=change["historical_permission_codename"],
        historical_permission_content_type_app_label=change["historical_permission_content_type_app_label"],
        historical_permission_content_type_model_name=change["historical_permission_content_type_model_name"],
    )
    # auto_now=True prevents setting `when` via create(), so update it directly
    # to preserve the original timestamp from the migration's changed_data.
    obj.when = change["when"]
    obj.save()
    return obj.pk
