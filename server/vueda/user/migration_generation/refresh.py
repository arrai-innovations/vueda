"""Refresh the generated migrations that earlier versions of VUEDA wrote, so they import and run with this one."""

__all__ = (
    "REMOVED_MODULES",
    "ImportRewrite",
    "rewrite_removed_imports",
)

import ast
import dataclasses
import importlib

from vueda.user.management.commands.utils import NEWLINE


# Modules that migrations made with the removed --import-instead option import from, and the module that holds
# their functions now. The functions kept their names when they moved.
REMOVED_MODULES = {
    "vueda.user.management.commands.makegroupmigrations": "vueda.user.migration_generation.group_operations",
    "vueda.workflow.management.commands.makeworkflowmigrations": "vueda.workflow.migration_generation.operations",
}


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
