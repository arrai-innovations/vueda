"""Extract configuration declarations and Django settings reads without importing application code."""

from __future__ import annotations

import argparse
import ast
import json
from pathlib import Path


ATTRIBUTE_NAME_ARGS = 2
ATTRIBUTE_FALLBACK_ARGS = 3
FACTORIES = {"get_defaults", "get_production_defaults"}


def string_key(node: ast.AST, file: str) -> str:
    """Require literal names so a dynamic read cannot silently escape the inventory."""
    if not isinstance(node, ast.Constant) or not isinstance(node.value, str):
        raise ValueError(f"{file}:{node.lineno}: configuration names must be literal strings")
    return node.value


class DefaultsVisitor(ast.NodeVisitor):
    """Read env calls and return_dict declarations, preserving expressions and branch conditions."""

    def __init__(self, file: str):
        self.file = file
        self.function = ""
        self.conditions: list[str] = []
        self.config: list[dict] = []
        self.definitions: list[dict] = []

    def context(self, node: ast.AST) -> dict:
        return {
            "source": {"file": self.file, "line": node.lineno},
            "function": self.function,
            "conditions": list(self.conditions),
        }

    def visit_FunctionDef(self, node: ast.FunctionDef):
        if node.name in FACTORIES:
            self.function = node.name
            self.generic_visit(node)
            self.function = ""

    def branch(self, nodes: list[ast.stmt], condition: str):
        self.conditions.append(condition)
        for node in nodes:
            self.visit(node)
        self.conditions.pop()

    def visit_If(self, node: ast.If):
        self.visit(node.test)
        self.branch(node.body, ast.unparse(node.test))
        self.branch(node.orelse, f"not ({ast.unparse(node.test)})")

    def visit_Try(self, node: ast.Try):
        for statement in node.body:
            self.visit(statement)
        imports = [ast.unparse(n) for n in node.body if isinstance(n, (ast.Import, ast.ImportFrom))]
        self.branch(node.orelse, f"imports succeed: {', '.join(imports)}" if imports else "try block succeeds")
        for handler in node.handlers:
            self.branch(handler.body, f"except {ast.unparse(handler.type) if handler.type else 'BaseException'}")
        for statement in node.finalbody:
            self.visit(statement)

    def declaration(self, path: list[str], value: ast.AST, node: ast.AST, operation: str = "="):
        self.definitions.append(
            {
                "name": path[0],
                "path": path,
                "expression": ast.unparse(value),
                "operation": operation,
                **self.context(node),
            }
        )

    def dictionary(self, node: ast.AST):
        if not isinstance(node, ast.Dict):
            raise ValueError(f"{self.file}:{node.lineno}: expected a literal settings dictionary")
        for key, value in zip(node.keys, node.values, strict=True):
            if key is None:
                self.dictionary(value)
            else:
                self.declaration([string_key(key, self.file)], value, key)

    def setting_path(self, node: ast.AST) -> list[str] | None:
        if isinstance(node, ast.Name) and node.id == "return_dict":
            return []
        if isinstance(node, ast.Subscript):
            parent = self.setting_path(node.value)
            if parent is not None:
                return [*parent, string_key(node.slice, self.file)]
        return None

    def visit_Assign(self, node: ast.Assign):
        for target in node.targets:
            path = self.setting_path(target)
            if path == []:
                self.dictionary(node.value)
            elif path:
                self.declaration(path, node.value, node)
        self.generic_visit(node)

    def visit_AugAssign(self, node: ast.AugAssign):
        path = self.setting_path(node.target)
        if path:
            if not isinstance(node.op, ast.Add):
                raise ValueError(f"{self.file}:{node.lineno}: only += settings updates are supported")
            self.declaration(path, node.value, node, "Add")
        self.generic_visit(node)

    def visit_Return(self, node: ast.Return):
        if isinstance(node.value, ast.Dict):
            self.dictionary(node.value)
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call):
        func = node.func
        accessor = None
        if isinstance(func, ast.Name) and func.id == "env":
            accessor = "__call__"
        elif isinstance(func, ast.Attribute) and isinstance(func.value, ast.Name) and func.value.id == "env":
            accessor = func.attr
        if accessor:
            # EnvLike.enum's second argument is the enum class, not a default.
            positional_default = 2 if accessor == "enum" else 1
            default = next((kw.value for kw in node.keywords if kw.arg == "default"), None)
            if default is None and len(node.args) > positional_default:
                default = node.args[positional_default]
            key = node.args[0] if node.args else next((kw.value for kw in node.keywords if kw.arg == "key"), None)
            if key is None or any(kw.arg is None for kw in node.keywords):
                raise ValueError(f"{self.file}:{node.lineno}: unsupported env call")
            self.config.append(
                {
                    "name": string_key(key, self.file),
                    "accessor": accessor,
                    "default": ast.unparse(default) if default is not None else None,
                    **self.context(node),
                }
            )
        if isinstance(func, ast.Attribute) and self.setting_path(func.value) == [] and func.attr == "update":
            if len(node.args) != 1 or node.keywords:
                raise ValueError(f"{self.file}:{node.lineno}: expected update with one literal dictionary")
            self.dictionary(node.args[0])
        self.generic_visit(node)


def settings_reads(tree: ast.AST, file: str) -> list[dict]:
    """Recognize Django settings imports, including aliases; ignore similarly named application objects."""
    aliases = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and node.module == "django.conf":
            aliases.update(alias.asname or alias.name for alias in node.names if alias.name == "settings")
    reads = []
    for node in ast.walk(tree):
        name = None
        fallback = None
        access = "attribute"
        if (
            isinstance(node, ast.Attribute)
            and isinstance(node.value, ast.Name)
            and node.value.id in aliases
            and isinstance(node.ctx, ast.Load)
            and node.attr.isupper()
        ):
            name = node.attr
        elif (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Name)
            and node.func.id in {"getattr", "hasattr"}
            and len(node.args) >= ATTRIBUTE_NAME_ARGS
            and isinstance(node.args[0], ast.Name)
            and node.args[0].id in aliases
        ):
            name = string_key(node.args[1], file)
            access = node.func.id
            if len(node.args) == ATTRIBUTE_FALLBACK_ARGS:
                fallback = ast.unparse(node.args[2])
        if name:
            reads.append(
                {"name": name, "access": access, "fallback": fallback, "source": {"file": file, "line": node.lineno}}
            )
    return sorted(reads, key=lambda row: row["source"]["line"])


def extract_configuration(repo_root: Path) -> dict:
    defaults = "server/vueda/core/default_settings.py"
    visitor = DefaultsVisitor(defaults)
    visitor.visit(ast.parse((repo_root / defaults).read_text()))
    reads = []
    for file in sorted((repo_root / "server/vueda").rglob("*.py")):
        reads.extend(settings_reads(ast.parse(file.read_text()), file.relative_to(repo_root).as_posix()))
    return {
        "config": visitor.config,
        "definitions": visitor.definitions,
        "reads": reads,
        "metadata": json.loads((repo_root / "docs-tooling/configuration.json").read_text()),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    payload = extract_configuration(args.repo_root)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2) + "\n")


if __name__ == "__main__":
    main()
