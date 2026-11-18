"""Refresh the generated migrations that earlier versions of VUEDA wrote, so they import and run with this one."""

__all__ = (
    "MigrationKind",
    "Refresh",
    "RefreshError",
    "refresh_migration",
    "remove_obsolete_names",
)

import ast
import dataclasses
from collections.abc import Callable

from vueda.user.management.commands.utils import NoRenamesError
from vueda.user.management.commands.utils import has_direct_runpython_import
from vueda.user.management.commands.utils import merge_migration_imports
from vueda.user.management.commands.utils import merge_migration_sources
from vueda.user.management.commands.utils import update_operation_function_names


def remove_obsolete_names(source, names):
    """Remove the top-level functions, classes, and imports in ``source`` that bind one of ``names``.

    Each one is removed only when nothing else in ``source`` refers to its name, so code that a developer added
    and still uses stays. Run it after the copied functions are replaced, so references from old copies are
    gone. Returns the new source and the sorted names that were removed.
    """
    tree = ast.parse(source)
    candidates = {}
    for node in tree.body:
        bound = _bound_names(node)
        if bound and bound <= names:
            candidates[node] = bound

    used = set()
    for node in tree.body:
        if node not in candidates:
            used |= _used_names(node)
    # A candidate that stays because something uses it keeps what it uses too, such as an import that a kept
    # function calls. Repeat until no more candidates stay.
    kept = set()
    while True:
        newly_kept = {node for node, bound in candidates.items() if node not in kept and bound & used}
        if not newly_kept:
            break
        kept |= newly_kept
        for node in newly_kept:
            used |= _used_names(node)

    lines = source.splitlines(keepends=True)
    removed = set()
    spans = []
    for node, bound in candidates.items():
        if node in kept:
            continue
        removed |= bound
        start = min([node.lineno, *(decorator.lineno for decorator in getattr(node, "decorator_list", ()))])
        end = node.end_lineno
        # When blank lines come both before and after it, take the ones before, so the gap after it stays the
        # only gap. That gap may be the two blank lines that end the imports. An import that opens or sits inside
        # a group of imports has no blank line on one side, so the group's gaps stay as they are. At the top of
        # the file, take the blank lines after it, so the file does not start with one.
        followed_by_blank = end == len(lines) or not lines[end].strip()
        if start == 1:
            while end < len(lines) and not lines[end].strip():
                end += 1
        elif followed_by_blank:
            while start > 1 and not lines[start - 2].strip():
                start -= 1
        spans.append((start, end))

    for start, end in sorted(spans, reverse=True):
        del lines[start - 1 : end]

    return "".join(lines), tuple(sorted(removed))


def _used_names(node):
    """Return the names that ``node`` reads, including the first name of each attribute chain."""
    used = set()
    for child in ast.walk(node):
        if isinstance(child, ast.Name):
            used.add(child.id)
        elif isinstance(child, ast.Attribute) and isinstance(child.value, ast.Name):
            used.add(child.value.id)
    return used


def _bound_names(node):
    """Return the names that a top-level ``node`` binds, for the kinds that a refresh may remove."""
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
        return {node.name}
    if isinstance(node, (ast.Import, ast.ImportFrom)):
        return {alias.asname or alias.name.split(".")[0] for alias in node.names}
    return set()


@dataclasses.dataclass(frozen=True)
class MigrationKind:
    """What a refresh needs to know about one kind of generated migration, such as group or workflow migrations.

    ``name`` names the kind in output. ``markers`` are the comments that mark such a migration. A migration
    must assign every name in ``required_assignments`` at the top level. ``renames`` maps the old names of the
    functions that its operations call to the current ones. A migration that imports any of ``entry_functions``
    from ``current_module`` imports its functions instead of copying them, which a refresh refuses.
    ``get_sources`` and ``get_imports`` are the kind's builders of the copied functions and imports, called with
    ``as_mapping=True``. ``obsolete_names`` are the names that earlier versions wrote and the current ones do
    not.
    """

    name: str
    markers: tuple[str, ...]
    required_assignments: tuple[str, ...]
    renames: dict
    current_module: str
    entry_functions: frozenset
    get_sources: Callable
    get_imports: Callable
    obsolete_names: frozenset


class RefreshError(Exception):
    """A generated migration that a refresh cannot rewrite. The message says why."""


@dataclasses.dataclass(frozen=True)
class Refresh:
    """The result of ``refresh_migration``.

    ``source`` is the refreshed text. ``changed`` says whether it differs from the original. ``removed_names``
    says what ``remove_obsolete_names`` removed.
    """

    source: str
    changed: bool
    removed_names: tuple[str, ...]


def refresh_migration(source, kind, *, update_changed_data=None):
    """Return the generated migration ``source`` with the current functions and imports of its ``kind``.

    The steps run in this order: the operations call the current function names; each copied function and
    import that the kind writes is replaced or added; and obsolete names that nothing uses are removed. Code that
    a developer added stays. ``update_changed_data``, when given, takes the text and returns it with its
    ``changed_data`` updated.

    Raises ``RefreshError`` when the migration is not valid Python, lacks an assignment that the kind needs, or
    imports its functions from VUEDA instead of copying them.
    """
    text = source
    tree = _parse_or_refuse(text)

    assigned = {
        target.id
        for node in tree.body
        if isinstance(node, ast.Assign)
        for target in node.targets
        if isinstance(target, ast.Name)
    }
    missing = [name for name in kind.required_assignments if name not in assigned]
    if missing:
        raise RefreshError(f"Could not find {', '.join(missing)} in the migration.")

    # Only VUEDA's own tests write migrations that import their functions, so a refresh never sees one in a
    # project. Copying the functions in would leave two definitions of each name.
    if any(
        isinstance(node, ast.ImportFrom)
        and node.module == kind.current_module
        and any(alias.name in kind.entry_functions for alias in node.names)
        for node in tree.body
    ):
        raise RefreshError(f"The migration imports its functions from {kind.current_module} instead of copying them.")

    direct_runpython_import = has_direct_runpython_import(text.splitlines(keepends=True))

    if update_changed_data is not None:
        text = update_changed_data(text)

    try:
        text = update_operation_function_names(text, kind.renames)
    except NoRenamesError:
        # The operations already call the current names.
        pass
    text = merge_migration_sources(text, kind.get_sources(False, as_mapping=True))
    text = merge_migration_imports(text, kind.get_imports(False, direct_runpython_import, as_mapping=True))
    text, removed = remove_obsolete_names(text, kind.obsolete_names)

    return Refresh(source=text, changed=text != source, removed_names=removed)


def _parse_or_refuse(text):
    try:
        return ast.parse(text)
    except SyntaxError as error:
        raise RefreshError(f"The migration is not valid Python: {error}") from error
