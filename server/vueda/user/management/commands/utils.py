"""Utilities for group migration management commands."""

__all__ = (
    "create_group_change",
    "get_matching_record",
)

import ast


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


class NoRenamesError(Exception):
    pass


def update_operation_function_names(class_migration_block, operation_function_renames):
    tree = ast.parse(class_migration_block)

    # Collect (lineno, col_offset, old_name) for Name nodes inside RunPython calls only,
    # so string literals in dependencies are never touched.
    renames = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        func = node.func

        is_attribute_call = isinstance(func, ast.Attribute) and func.attr == "RunPython"
        is_direct_call = isinstance(func, ast.Name) and func.id == "RunPython"
        if not (is_attribute_call or is_direct_call):
            continue

        for arg in node.args:
            if isinstance(arg, ast.Name) and arg.id in operation_function_renames:
                renames.append((arg.lineno, arg.col_offset, arg.id))
        for kw in node.keywords:
            if (
                kw.arg in ("code", "reverse_code")
                and isinstance(kw.value, ast.Name)
                and kw.value.id in operation_function_renames
            ):
                renames.append((kw.value.lineno, kw.value.col_offset, kw.value.id))

    if not renames:
        raise NoRenamesError()

    lines = class_migration_block.splitlines(keepends=True)
    for lineno, col_offset, old_name in sorted(renames, reverse=True):
        new_name = operation_function_renames[old_name]
        line = lines[lineno - 1]
        lines[lineno - 1] = line[:col_offset] + new_name + line[col_offset + len(old_name) :]
    return "".join(lines)
