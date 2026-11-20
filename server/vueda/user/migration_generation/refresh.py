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
import importlib.util
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

    removed = set()
    deleted = []
    for node, bound in candidates.items():
        if node not in kept:
            removed |= bound
            deleted.append(node)

    return _delete_statements(source, deleted), tuple(sorted(removed))


def _delete_statements(source, nodes):
    """Return ``source`` without the top-level statements ``nodes``, keeping the blank-line gaps around them."""
    lines = source.splitlines(keepends=True)
    spans = []
    for node in nodes:
        start = min([node.lineno, *(decorator.lineno for decorator in getattr(node, "decorator_list", ()))])
        end = node.end_lineno
        # When blank lines come both before and after it, take the ones before, so the gap after it stays the
        # only gap. That gap may be the two blank lines that end the imports. An import that opens or sits inside
        # a group of imports has no blank line on one side, so the group's gaps stay as they are.
        if end == len(lines) or not lines[end].strip():
            while start > 1 and not lines[start - 2].strip():
                start -= 1
        spans.append((start, end))

    # Two spans can share the blank lines between them, so overlapping spans are merged before any is deleted.
    merged = []
    for start, end in sorted(spans):
        if merged and start <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], end))
        else:
            merged.append((start, end))
    # A span at the top of the file takes the blank lines after it too, so the file does not start with one.
    if merged and merged[0][0] == 1:
        start, end = merged[0]
        while end < len(lines) and not lines[end].strip():
            end += 1
        merged[0] = (start, end)
    for start, end in reversed(merged):
        del lines[start - 1 : end]

    return "".join(lines)


def replace_imports_with_copies(source, copied_names):
    """Remove the top-level imports in ``source`` of names that the migration now holds as copies.

    A copied function replaces any import of the same name, wherever that import points. ``copied_names`` are the
    names of the functions and classes that the kind copies into a migration. A copy is defined in the file after
    its imports, so it already shadows an import of the same name, and the import only adds a dependency on a
    module that can change or disappear. An import statement that also imports other names keeps those names.

    Returns the new source and the sorted ``module.name`` of each import that was removed.
    """
    tree = ast.parse(source)
    defined = {
        node.name for node in tree.body if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef))
    }
    replaceable = defined & set(copied_names)
    lines = source.splitlines(keepends=True)
    replaced = []
    whole = []
    partial = []
    for node in tree.body:
        if not isinstance(node, (ast.Import, ast.ImportFrom)):
            continue
        copied = [alias for alias in node.names if _alias_binding(alias) in replaceable]
        if not copied:
            continue
        module = node.module if isinstance(node, ast.ImportFrom) else None
        replaced.extend(f"{module}.{alias.name}" if module else alias.name for alias in copied)
        kept = [alias for alias in node.names if alias not in copied]
        (partial if kept else whole).append((node, kept))

    # Rewrite the statements that keep some names first, from the bottom up, so the line numbers stay correct.
    for node, kept in sorted(partial, key=lambda item: item[0].lineno, reverse=True):
        lines[node.lineno - 1 : node.end_lineno] = [_import_text(node, alias) for alias in kept]
    text = "".join(lines)
    if whole:
        whole_lines = {node.lineno for node, _kept in whole}
        text = _delete_statements(text, [node for node in ast.parse(text).body if _is_import_at(node, whole_lines)])

    return text, tuple(sorted(replaced))


def remove_imports_from_missing_modules(source):
    """Remove the top-level imports in ``source`` from modules that no longer exist, when nothing uses them.

    Django imports every migration when it builds the migration graph, so such an import stops ``migrate`` for
    the whole project. Returns the new source and the sorted ``module.name`` of each import that was removed.

    Raises ``RefreshError`` when the migration still uses a name that such an import binds.
    """
    tree = ast.parse(source)
    missing = [node for node in tree.body if _imports_a_missing_module(node)]
    if not missing:
        return source, ()

    used = set()
    for node in tree.body:
        if node not in missing:
            used |= _used_names(node)
    still_used = sorted(
        f"{node.module}.{alias.name}" if isinstance(node, ast.ImportFrom) else alias.name
        for node in missing
        for alias in node.names
        if _alias_binding(alias) in used
    )
    if still_used:
        raise RefreshError(
            f"The migration uses {', '.join(still_used)}, from a module that no longer exists. Copy that code into "
            "the migration or remove it by hand, then run the command again."
        )

    removed = sorted(
        f"{node.module}.{alias.name}" if isinstance(node, ast.ImportFrom) else alias.name
        for node in missing
        for alias in node.names
    )
    return _delete_statements(source, missing), tuple(removed)


def _alias_binding(alias):
    return alias.asname or alias.name.split(".")[0]


def _import_text(node, alias):
    name = f"{alias.name} as {alias.asname}" if alias.asname else alias.name
    if isinstance(node, ast.ImportFrom):
        return f"from {'.' * node.level}{node.module or ''} import {name}\n"
    return f"import {name}\n"


def _is_import_at(node, line_numbers):
    return isinstance(node, (ast.Import, ast.ImportFrom)) and node.lineno in line_numbers


def _imports_a_missing_module(node):
    """Return whether ``node`` is a top-level absolute import of a module that cannot be found."""
    if isinstance(node, ast.ImportFrom):
        if node.level or not node.module:
            return False
        modules = (node.module,)
    elif isinstance(node, ast.Import):
        modules = tuple(alias.name for alias in node.names)
    else:
        return False
    for module in modules:
        try:
            if importlib.util.find_spec(module) is None:
                return True
        except (ImportError, ValueError):
            # A parent package is missing too, or the name is not a module.
            return True
    return False


def _used_names(node):
    """Return the names that ``node`` uses, including the first name of each attribute chain."""
    return {child.id for child in ast.walk(node) if isinstance(child, ast.Name)}


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
    functions that its operations call to the current ones. ``get_sources`` and ``get_imports`` are the kind's
    builders of the copied functions and imports, called with ``as_mapping=True``. ``obsolete_names`` are the
    names that earlier versions wrote and the current ones do not.
    """

    name: str
    markers: tuple[str, ...]
    required_assignments: tuple[str, ...]
    renames: dict
    get_sources: Callable
    get_imports: Callable
    obsolete_names: frozenset


class RefreshError(Exception):
    """A generated migration that a refresh cannot rewrite. The message says why."""


@dataclasses.dataclass(frozen=True)
class Refresh:
    """The result of ``refresh_migration``.

    ``source`` is the refreshed text. ``changed`` says whether it differs from the original. ``removed_names``
    says what ``remove_obsolete_names`` removed. ``replaced_imports`` names each import that a copied function
    replaced, and ``removed_missing_imports`` names each import from a module that no longer exists. Each name is
    written as ``module.name``.
    """

    source: str
    changed: bool
    removed_names: tuple[str, ...]
    replaced_imports: tuple[str, ...] = ()
    removed_missing_imports: tuple[str, ...] = ()


def refresh_migration(source, kind, *, update_changed_data=None):
    """Return the generated migration ``source`` with the current functions and imports of its ``kind``.

    The steps run in this order: the operations call the current function names; each copied function that the
    kind writes is replaced or added, and replaces any import of the same name; each import that the kind writes
    is replaced or added; obsolete names that nothing uses are removed; and imports from modules that no longer
    exist are removed when nothing uses them. Code that a developer added stays. ``update_changed_data``, when
    given, takes the text and returns it with its ``changed_data`` updated.

    Raises ``RefreshError`` when the migration is not valid Python, lacks an assignment that the kind needs, or
    still uses a name from a module that no longer exists.
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

    direct_runpython_import = has_direct_runpython_import(text.splitlines(keepends=True))

    if update_changed_data is not None:
        text = update_changed_data(text)

    try:
        text = update_operation_function_names(text, kind.renames)
    except NoRenamesError:
        # The operations already call the current names.
        pass
    sources = kind.get_sources(False, as_mapping=True)
    text = merge_migration_sources(text, sources)
    text, replaced = replace_imports_with_copies(text, {name for names in sources for name in names})
    text = merge_migration_imports(text, kind.get_imports(False, direct_runpython_import, as_mapping=True))
    text, removed = remove_obsolete_names(text, kind.obsolete_names)
    text, missing = remove_imports_from_missing_modules(text)

    return Refresh(
        source=text,
        changed=text != source,
        removed_names=removed,
        replaced_imports=replaced,
        removed_missing_imports=missing,
    )


def _parse_or_refuse(text):
    try:
        return ast.parse(text)
    except SyntaxError as error:
        raise RefreshError(f"The migration is not valid Python: {error}") from error
