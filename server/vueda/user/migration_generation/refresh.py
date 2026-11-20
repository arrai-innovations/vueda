"""Refresh the generated migrations that earlier versions of VUEDA wrote, so they import and run with this one."""

__all__ = (
    "MigrationKind",
    "Refresh",
    "RefreshError",
    "refresh_migration",
    "remove_imports_that_stop_the_graph",
    "remove_obsolete_names",
    "without_imports_that_vueda_no_longer_has",
)

import ast
import dataclasses
import importlib
from collections.abc import Callable

from vueda.user.management.commands.utils import NoRenamesError
from vueda.user.management.commands.utils import has_direct_runpython_import
from vueda.user.management.commands.utils import merge_migration_imports
from vueda.user.management.commands.utils import merge_migration_sources
from vueda.user.management.commands.utils import update_operation_function_names
from vueda.user.migration_generation.utils import module_exists


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
    return _drop_imports(source, lambda node, alias: _alias_binding(alias) in replaceable)


def remove_imports_that_vueda_no_longer_has(source):
    """Remove the top-level imports in ``source`` of VUEDA modules and names that no longer exist.

    Django imports every migration when it builds the migration graph, so such an import stops ``migrate`` for
    the whole project. Only imports from ``vueda`` are checked, because VUEDA is installed wherever the command
    runs. A project's other imports can depend on packages that only some environments install. Returns the new
    source and the sorted ``module.name`` of each import that was removed.

    Raises ``RefreshError`` when the migration still uses a name that such an import binds.
    """
    tree = ast.parse(source)
    gone = [
        (node, alias)
        for node in tree.body
        if isinstance(node, (ast.Import, ast.ImportFrom))
        for alias in node.names
        if _vueda_no_longer_has(node, alias)
    ]
    if not gone:
        return source, ()

    used = set()
    for node in tree.body:
        if not isinstance(node, (ast.Import, ast.ImportFrom)):
            used |= _used_names(node)
    still_used = sorted(_import_label(node, alias) for node, alias in gone if _alias_binding(alias) in used)
    if still_used:
        raise RefreshError(
            f"The migration uses {', '.join(still_used)}, which VUEDA no longer has. Copy that code into the "
            "migration or remove it by hand, then run the command again."
        )

    return _drop_imports(source, _vueda_no_longer_has)


def remove_imports_that_stop_the_graph(source, kind):
    """Remove the top-level imports in ``source`` that VUEDA no longer has, when removing them cannot break it.

    Django imports every migration when it builds the migration graph, so one such import stops the graph for the
    whole project. This runs before the graph is built. An import goes when nothing in the migration uses the name,
    or when the name is one that a refresh of ``kind`` copies in and nothing reads while the migration is imported.
    Such a name is only called inside functions, and the refresh copies it in before they run. An import stays
    when removing it would only turn the import error into a ``NameError``: a used name that is not copied, or a
    name that the ``Migration`` class body reads, as an operation that names the function directly does.

    Returns the new source and the sorted ``module.name`` of each import that was removed. The source is returned
    unchanged when it cannot be read.
    """
    try:
        tree = ast.parse(source)
        copied = {name for names in kind.get_sources(False, as_mapping=True) for name in names}
        used = set()
        read_on_import = set()
        for node in tree.body:
            if not isinstance(node, (ast.Import, ast.ImportFrom)):
                used |= _used_names(node)
                read_on_import |= _names_read_on_import(node)

        def removable(node, alias):
            if alias.name == "*":
                # The names that a star import supplies are unknown, so it can never be shown to be unused.
                return False
            binding = _alias_binding(alias)
            safe = binding not in used or (binding in copied and binding not in read_on_import)
            return safe and _vueda_no_longer_has(node, alias)

        return _drop_imports(source, removable)
    except (SyntaxError, RefreshError):
        # The refresh reports the file.
        return source, ()


def _names_read_on_import(node):
    """Return the names that a top-level ``node`` reads while its module is imported.

    A function's body runs only when the function is called, so only its decorators, defaults and annotations
    count. A class body runs on import, so its statements count, apart from the bodies of its methods.
    """
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        parts = [*node.decorator_list, *node.args.defaults, *node.args.kw_defaults]
        arguments = (
            *node.args.posonlyargs,
            *node.args.args,
            *node.args.kwonlyargs,
            *(arg for arg in (node.args.vararg, node.args.kwarg) if arg is not None),
        )
        parts += [arg.annotation for arg in arguments if arg.annotation is not None]
        if node.returns is not None:
            parts.append(node.returns)
        return set().union(*(_used_names(part) for part in parts if part is not None))
    if isinstance(node, ast.ClassDef):
        names = set().union(*(_used_names(part) for part in (*node.decorator_list, *node.bases, *node.keywords)))
        for child in node.body:
            names |= _names_read_on_import(child)
        return names
    return _used_names(node)


def without_imports_that_vueda_no_longer_has(source):
    """Return ``source`` without its top-level imports of VUEDA modules and names that no longer exist.

    The result is for running the migration's text to read its data, never for writing. Running it no longer
    fails on those imports. The source is returned unchanged when it cannot be read.
    """
    try:
        return _drop_imports(source, _vueda_no_longer_has)[0]
    except (SyntaxError, RefreshError):
        return source


def _drop_imports(source, should_drop):
    """Remove each name of a top-level import in ``source`` for which ``should_drop(node, alias)`` is true.

    A statement that loses every name is deleted. A statement that keeps some names is rewritten with one import
    per line. Returns the new source and the sorted ``module.name`` of each name that was removed.
    """
    tree = ast.parse(source)
    dropped = []
    whole = []
    for node in tree.body:
        if not isinstance(node, (ast.Import, ast.ImportFrom)):
            continue
        drop = [alias for alias in node.names if should_drop(node, alias)]
        dropped.extend(_import_label(node, alias) for alias in drop)
        if drop and len(drop) == len(node.names):
            whole.append(node)
    text = _delete_statements(source, whole) if whole else source

    # The deletions moved the lines, so the statements that keep some names are found again in the new text.
    lines = text.splitlines(keepends=True)
    partial = []
    for node in ast.parse(text).body:
        if isinstance(node, (ast.Import, ast.ImportFrom)) and any(should_drop(node, alias) for alias in node.names):
            partial.append((node, [alias for alias in node.names if not should_drop(node, alias)]))
    # From the bottom up, so the line numbers of the statements above stay correct.
    for node, kept in sorted(partial, key=lambda item: item[0].lineno, reverse=True):
        lines[node.lineno - 1 : node.end_lineno] = [_import_text(node, alias) for alias in kept]

    return "".join(lines), tuple(sorted(dropped))


def _alias_binding(alias):
    """Return the name that an import's ``alias`` binds in the module."""
    return alias.asname or alias.name.split(".")[0]


def _import_label(node, alias):
    """Return an imported name as ``module.name``, or the module name for a plain ``import``."""
    return f"{node.module}.{alias.name}" if isinstance(node, ast.ImportFrom) else alias.name


def _import_text(node, alias):
    name = f"{alias.name} as {alias.asname}" if alias.asname else alias.name
    if isinstance(node, ast.ImportFrom):
        return f"from {'.' * node.level}{node.module or ''} import {name}\n"
    return f"import {name}\n"


def _vueda_no_longer_has(node, alias):
    """Return whether the import ``alias`` of ``node`` names a VUEDA module or name that no longer exists.

    Raises ``RefreshError`` when finding or importing the module fails in the module's own code. Django would fail
    on the same import, so the migration is reported rather than the run ended.
    """
    try:
        return _vueda_lacks(node, alias)
    except RefreshError:
        raise
    except Exception as error:
        module = node.module if isinstance(node, ast.ImportFrom) else alias.name
        raise RefreshError(f"The migration imports {module}, which fails to import: {error}") from error


def _vueda_lacks(node, alias):
    if isinstance(node, ast.ImportFrom):
        if node.level or not _is_vueda_module(node.module):
            return False
        if not module_exists(node.module):
            return True
        if alias.name == "*":
            return False
        module = importlib.import_module(node.module)
        return not hasattr(module, alias.name) and not module_exists(f"{node.module}.{alias.name}")
    return _is_vueda_module(alias.name) and not module_exists(alias.name)


def _is_vueda_module(name):
    return name == "vueda" or name.startswith("vueda.")


def _used_names(node):
    """Return the names that ``node`` uses, including the first name of each attribute chain."""
    return {child.id for child in ast.walk(node) if isinstance(child, ast.Name)}


def _bound_names(node):
    """Return the names that a top-level ``node`` binds, for the kinds that a refresh may remove."""
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
        return {node.name}
    if isinstance(node, (ast.Import, ast.ImportFrom)):
        return {_alias_binding(alias) for alias in node.names}
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
    replaced. ``removed_missing_imports`` names each import of a VUEDA module or name that no longer exists. Each
    name is written as ``module.name``.
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
    is replaced or added; obsolete names that nothing uses are removed; and imports of VUEDA modules and names
    that no longer exist are removed when nothing uses them. Code that a developer added stays.
    ``update_changed_data``, when given, takes the text and returns it with its ``changed_data`` updated.

    Raises ``RefreshError`` when the migration is not valid Python, lacks an assignment that the kind needs, or
    still uses a VUEDA name that no longer exists.
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
    text, missing = remove_imports_that_vueda_no_longer_has(text)

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
