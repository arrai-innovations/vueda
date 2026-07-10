"""Utilities for group migration management commands."""

__all__ = (
    "create_group_change",
    "get_matching_record",
    "has_direct_runpython_import",
)

import ast
import os


NEWLINE = os.linesep


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


def has_direct_runpython_import(lines):
    """Return True if ``lines`` imports RunPython directly, e.g. ``from django.db.migrations import RunPython``,
    rather than only accessing it via ``migrations.RunPython``.

    ``lines`` is a list of strings, as returned by ``readlines()``. Only module-level ``from ... import``
    statements are considered, so a RunPython import nested inside a copied function source is never matched.
    """
    tree = ast.parse("".join(lines))
    return any(
        isinstance(node, ast.ImportFrom)
        and node.module == "django.db.migrations"
        and any(alias.name == "RunPython" for alias in node.names)
        for node in tree.body
    )


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

        # Find RunPython that uses positional arguments.
        # Migrations are generated with keyword arguments, but one migration has been modified for this.
        for arg in node.args:
            if isinstance(arg, ast.Name) and arg.id in operation_function_renames:
                renames.append((arg.lineno, arg.col_offset, arg.id))

        # Find RunPython that uses keyword arguments.
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


def get_top_level_defs(source):
    """Return (name, start_lineno, end_lineno) for every top-level function/class def in ``source``."""
    tree = ast.parse(source)
    defs = []
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            defs.append((node.name, node.lineno, node.end_lineno))
    return defs


def get_top_level_imports(source):
    """Return (name, start_lineno, end_lineno) for every top-level import statement in ``source``.

    Each import is expected to bind exactly one name, per this project's force-single-line isort
    convention (``import a``, never ``import a, b``). ``name`` is the alias if one is given, otherwise
    the imported name (or the top-level package, for a dotted ``import a.b.c``).
    """
    tree = ast.parse(source)
    imports = []
    for node in tree.body:
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            alias = node.names[0]
            name = alias.asname or alias.name.split(".")[0]
            imports.append((name, node.lineno, node.end_lineno))
    return imports


def _resolve_replacements(existing_segment, entry_map, get_entries):
    """Match ``entry_map`` entries against what ``get_entries`` finds in ``existing_segment``.

    Returns a list of ``{"source": ..., "range": (start, end) or None, "anchor": ..., "anchor_side": ...}``
    dicts, one per ``entry_map`` entry, in ``entry_map`` order. ``range`` is set when a matching name is
    found in ``existing_segment``. Unmatched entries get an ``anchor`` line number and ``anchor_side``
    ("after" or "before") pointing at the nearest matched neighbour, so callers can insert them in the
    right place; both are ``None`` when there is no matched entry to anchor against at all.
    """
    available_by_name = {}
    for name, start, end in get_entries(existing_segment):
        available_by_name.setdefault(name, []).append((start, end))

    claimed_names = set()
    resolved = []
    for names, source in entry_map.items():
        match = None
        for name in names:
            occurrences = available_by_name.get(name)
            if occurrences and name not in claimed_names:
                match = occurrences.pop(0)
                claimed_names.add(name)
                break
        resolved.append({"source": source, "range": match})

    for index, item in enumerate(resolved):
        if item["range"] is not None:
            continue

        anchor = anchor_side = None
        for previous in reversed(resolved[:index]):
            if previous["range"] is not None:
                anchor = previous["range"][1]
                anchor_side = "after"
                break

        if anchor is None:
            for following in resolved[index + 1 :]:
                if following["range"] is not None:
                    anchor = following["range"][0]
                    anchor_side = "before"
                    break

        item["anchor"] = anchor
        item["anchor_side"] = anchor_side

    return resolved


def merge_migration_sources(existing_segment, source_map):
    """Replace known functions/classes in ``existing_segment`` with their current implementation.

    ``source_map`` is an ordered mapping (as returned by ``get_group_migration_sources(as_mapping=True)``
    / ``get_migration_sources(as_mapping=True)``) of alternate-name tuples to fresh source text. Every name
    in a tuple identifies the same logical function/class across versions of the generating command, so a
    function that was renamed (e.g. as part of introducing a ``_through_imports`` wrapper) is still matched
    against its old name and replaced in place.

    Anything in ``existing_segment`` that isn't a recognized top-level def (hand-added imports, comments,
    blank lines) is left untouched, in its original position. Entries in ``source_map`` with no matching
    name in ``existing_segment`` (newly introduced functions/classes) are inserted immediately after the
    nearest preceding entry that *was* matched, or immediately before the nearest following matched entry,
    following the order of ``source_map``.
    """
    lines = existing_segment.splitlines(keepends=True)
    resolved = _resolve_replacements(existing_segment, source_map, get_top_level_defs)

    replace_at = {}
    insert_after = {}
    insert_before = {}
    trailing = []
    for item in resolved:
        if item["range"] is not None:
            start, end = item["range"]
            replace_at[start] = (end, item["source"])
        elif item["anchor_side"] == "after":
            insert_after.setdefault(item["anchor"], []).append(item["source"])
        elif item["anchor_side"] == "before":
            insert_before.setdefault(item["anchor"], []).append(item["source"])
        else:
            trailing.append(item["source"])

    output = []
    line_no = 1
    total_lines = len(lines)
    while line_no <= total_lines:
        for source in insert_before.get(line_no, ()):
            output.append(f"{NEWLINE}{NEWLINE}{source}")

        if line_no in replace_at:
            end, source = replace_at[line_no]
            output.append(source)
            for after_source in insert_after.get(end, ()):
                output.append(f"{NEWLINE}{NEWLINE}{after_source}")
            line_no = end + 1
            continue

        output.append(lines[line_no - 1])
        for after_source in insert_after.get(line_no, ()):
            output.append(f"{NEWLINE}{NEWLINE}{after_source}")
        line_no += 1

    for source in trailing:
        output.append(f"{NEWLINE}{NEWLINE}{source}")

    return "".join(output)


def merge_migration_imports(existing_segment, import_map):
    """Update or insert known import statements in ``existing_segment``, preserving everything else.

    ``import_map`` is an ordered mapping (as returned by ``get_group_migration_imports(as_mapping=True)``
    / ``get_migration_imports(as_mapping=True)``) of single-name tuples to the current import line. Each
    value already ends in its own newline and, where it opens a new isort group, is prefixed with a blank
    line.

    An import already present in ``existing_segment`` is rewritten in place (so a changed import path is
    picked up) without disturbing whatever blank line already precedes it. An import that isn't present
    yet is inserted next to the nearest recognized neighbour, following the order of ``import_map``, using
    its own prefixed blank line where relevant. Anything else in ``existing_segment`` (hand-added imports,
    comments, blank lines) is left untouched, in its original position.
    """
    lines = existing_segment.splitlines(keepends=True)
    resolved = _resolve_replacements(existing_segment, import_map, get_top_level_imports)

    replace_at = {}
    insert_after = {}
    insert_before = {}
    trailing = []
    for item in resolved:
        if item["range"] is not None:
            start, end = item["range"]
            # Already here, so drop any leading group-separator blank line baked into the fresh text --
            # whatever blank line belongs before it, if any, is already there, untouched.
            replace_at[start] = (end, item["source"].lstrip(NEWLINE))
        elif item["anchor_side"] == "after":
            insert_after.setdefault(item["anchor"], []).append(item["source"])
        elif item["anchor_side"] == "before":
            insert_before.setdefault(item["anchor"], []).append(item["source"])
        else:
            trailing.append(item["source"])

    output = []
    line_no = 1
    total_lines = len(lines)
    while line_no <= total_lines:
        output.extend(insert_before.get(line_no, ()))

        if line_no in replace_at:
            end, source = replace_at[line_no]
            output.append(source)
            output.extend(insert_after.get(end, ()))
            line_no = end + 1
            continue

        output.append(lines[line_no - 1])
        output.extend(insert_after.get(line_no, ()))
        line_no += 1

    output.extend(trailing)

    return "".join(output)
