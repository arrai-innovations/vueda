"""Refresh the generated migrations that earlier versions of VUEDA wrote, so they import and run with this one."""

__all__ = (
    "OBSOLETE_GROUP_NAMES",
    "OBSOLETE_WORKFLOW_NAMES",
    "REMOVED_MODULES",
    "ImportRewrite",
    "MigrationKind",
    "Refresh",
    "RefreshError",
    "refresh_migration",
    "remove_obsolete_names",
    "rewrite_removed_imports",
)

import ast
import dataclasses
import importlib
from collections.abc import Callable

from vueda.user.management.commands.utils import NEWLINE
from vueda.user.management.commands.utils import NoRenamesError
from vueda.user.management.commands.utils import has_direct_runpython_import
from vueda.user.management.commands.utils import merge_migration_imports
from vueda.user.management.commands.utils import merge_migration_sources
from vueda.user.management.commands.utils import update_operation_function_names


# Modules that migrations made with the removed --import-instead option import from, and the module that holds
# their functions now. The functions kept their names when they moved.
REMOVED_MODULES = {
    "vueda.user.management.commands.makegroupmigrations": "vueda.user.migration_generation.group_operations",
    "vueda.workflow.management.commands.makeworkflowmigrations": "vueda.workflow.migration_generation.operations",
}


# Top-level names that earlier versions copied or imported into generated migrations, and that the current
# versions no longer write. A refresh removes each one that nothing else in the migration still uses.
OBSOLETE_GROUP_NAMES = frozenset(("settings",))
OBSOLETE_WORKFLOW_NAMES = frozenset(("add_history_to_data", "Count", "timezone"))


@dataclasses.dataclass(frozen=True)
class ImportRewrite:
    """The result of ``rewrite_removed_imports``.

    ``source`` is the migration's text with each import of a removed module pointed at its current module.
    ``changed`` says whether any import was rewritten. ``dropped`` names each imported name that the current
    module no longer has, as ``module.name``. It is empty when every name still exists.
    """

    source: str
    changed: bool
    dropped: tuple[str, ...]


def rewrite_removed_imports(source):
    """Point the top-level imports of removed modules in a migration's ``source`` at their current modules.

    Only import statements change, so strings and comments that mention a removed module are left alone. A
    ``from`` import keeps each name that the current module still has, and drops the others, which the refresh
    replaces anyway. ``import <removed module> as <alias>`` imports the current module under the same alias.

    This works on the text, so it runs before anything imports the migration. Django imports every migration
    when it builds the migration graph, and an import of a removed module would stop that.
    """
    tree = ast.parse(source)
    lines = source.splitlines(keepends=True)
    dropped = []
    replacements = []

    for node in tree.body:
        if isinstance(node, ast.ImportFrom) and node.level == 0 and node.module in REMOVED_MODULES:
            current = REMOVED_MODULES[node.module]
            module = importlib.import_module(current)
            kept = []
            for alias in node.names:
                if hasattr(module, alias.name):
                    kept.append(alias)
                else:
                    dropped.append(f"{node.module}.{alias.name}")
            text = "".join(f"from {current} import {_alias_text(alias)}{NEWLINE}" for alias in kept)
            replacements.append((node.lineno, node.end_lineno, text))

        elif isinstance(node, ast.Import) and any(alias.name in REMOVED_MODULES for alias in node.names):
            text = "".join(
                f"import {REMOVED_MODULES.get(alias.name, alias.name)}"
                f"{f' as {alias.asname}' if alias.asname else ''}{NEWLINE}"
                for alias in node.names
            )
            replacements.append((node.lineno, node.end_lineno, text))

    # Replace from the bottom of the file to the top, so the line numbers stay correct throughout.
    for start, end, text in reversed(replacements):
        lines[start - 1 : end] = [text] if text else []

    return ImportRewrite(source="".join(lines), changed=bool(replacements), dropped=tuple(dropped))


def _alias_text(alias):
    return f"{alias.name} as {alias.asname}" if alias.asname else alias.name


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

    removed_nodes = set(candidates)
    used = set()
    for node in tree.body:
        if node in removed_nodes:
            continue
        for child in ast.walk(node):
            if isinstance(child, ast.Name):
                used.add(child.id)
            elif isinstance(child, ast.Attribute) and isinstance(child.value, ast.Name):
                used.add(child.value.id)

    lines = source.splitlines(keepends=True)
    removed = set()
    spans = []
    for node, bound in candidates.items():
        if bound & used:
            continue
        removed |= bound
        start = min([node.lineno, *(decorator.lineno for decorator in getattr(node, "decorator_list", ()))])
        end = node.end_lineno
        # When a blank line comes before it, take the blank lines after it too, so the gap before it stays the
        # only gap. An import inside a block of imports keeps the blank lines that end the block.
        if start > 1 and not lines[start - 2].strip():
            while end < len(lines) and not lines[end].strip():
                end += 1
        spans.append((start, end))

    for start, end in sorted(spans, reverse=True):
        del lines[start - 1 : end]

    return "".join(lines), tuple(sorted(removed))


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
    from ``current_module`` imports its functions instead of copying them. ``get_sources`` and ``get_imports``
    are the kind's builders of the copied functions and imports, called with ``as_mapping=True``.
    ``obsolete_names`` are the names that earlier versions wrote and the current ones do not.
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

    ``source`` is the refreshed text. ``changed`` says whether it differs from the original. ``dropped_imports``
    and ``removed_names`` say what ``rewrite_removed_imports`` dropped and ``remove_obsolete_names`` removed.
    """

    source: str
    changed: bool
    dropped_imports: tuple[str, ...]
    removed_names: tuple[str, ...]


def refresh_migration(source, kind, *, update_changed_data=None):
    """Return the generated migration ``source`` with the current functions and imports of its ``kind``.

    The steps run in this order: imports of removed modules point at the current ones; the operations call the
    current function names; each copied function and import that the kind writes is replaced or added; and
    obsolete names that nothing uses are removed. Code that a developer added stays. ``update_changed_data``,
    when given, takes the text after the import rewrite and returns it with its ``changed_data`` updated.

    Raises ``RefreshError`` when the migration is not valid Python or lacks an assignment that the kind needs.
    """
    _parse_or_refuse(source)
    imports = rewrite_removed_imports(source)
    text = imports.source
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

    direct_runpython_import = has_direct_runpython_import(text.splitlines(keepends=True))
    import_instead = any(
        isinstance(node, ast.ImportFrom)
        and node.module == kind.current_module
        and any(alias.name in kind.entry_functions for alias in node.names)
        for node in tree.body
    )

    if update_changed_data is not None:
        text = update_changed_data(text)

    try:
        text = update_operation_function_names(text, kind.renames)
    except NoRenamesError:
        # The operations already call the current names.
        pass
    text = merge_migration_sources(text, kind.get_sources(import_instead, as_mapping=True))
    text = merge_migration_imports(text, kind.get_imports(import_instead, direct_runpython_import, as_mapping=True))
    text, removed = remove_obsolete_names(text, kind.obsolete_names)

    return Refresh(source=text, changed=text != source, dropped_imports=imports.dropped, removed_names=removed)


def _parse_or_refuse(text):
    try:
        return ast.parse(text)
    except SyntaxError as error:
        raise RefreshError(f"The migration is not valid Python: {error}") from error
