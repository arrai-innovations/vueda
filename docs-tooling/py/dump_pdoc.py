"""Dump pdoc's internal model to JSON for analysis."""

from __future__ import annotations

import argparse
import importlib
import inspect
import json
import pkgutil
import re
import sys
from collections.abc import Iterable
from pathlib import Path
from typing import Any

from pdoc.doc import Class
from pdoc.doc import Doc
from pdoc.doc import Function
from pdoc.doc import Module
from pdoc.doc import Variable


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Dump pdoc model to JSON.")
    parser.add_argument("--spec", action="append", default=["vueda"], help="pdoc spec to include")
    parser.add_argument("--output", default="docs-tooling/.generated/pdoc.json", help="Output JSON file")
    return parser.parse_args()


def _format_source_lines(value: tuple[int, int] | None) -> dict[str, int] | None:
    if not value:
        return None
    start, end = value
    return {"start": start, "end": end}


def _json_safe(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {str(k): _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_json_safe(v) for v in value]
    module = value.__class__.__module__
    name = value.__class__.__name__
    if module.startswith("django.db.models") and name.endswith("QuerySet"):
        return f"<{module}.{name}>"
    try:
        return repr(value)
    except Exception:
        return f"<{module}.{name}>"


def _annotation_text(annotation: Any) -> str | None:
    """Return an annotation as source-like text, or None when there is none."""
    if annotation is inspect.Parameter.empty:
        return None
    if isinstance(annotation, str):
        return annotation
    # formatannotation returns the repr of a class from typing, such as "<class 'TextIO'>".
    if isinstance(annotation, type):
        if annotation.__module__ == "builtins":
            return annotation.__qualname__
        return f"{annotation.__module__}.{annotation.__qualname__}"
    return inspect.formatannotation(annotation)


_ADDRESS_RE = re.compile(r" at 0x[0-9a-fA-F]+")


def _default_text(value: Any, namespace: dict[str, Any] | None = None) -> str | None:
    """Return a parameter default as its ``repr``, or None when the parameter has no default.

    A repr that carries a memory address, such as a sentinel ``object()``, changes on every run.
    Such a default shows as the module-level name bound to it. When no module-level name is bound to
    it, the default shows as its repr without the address.
    """
    if value is inspect.Parameter.empty:
        return None
    module = value.__class__.__module__
    name = value.__class__.__name__
    if module.startswith("django.db.models") and name.endswith("QuerySet"):
        return f"<{module}.{name}>"
    try:
        text = repr(value)
    except Exception:
        return f"<{module}.{name}>"
    if not _ADDRESS_RE.search(text):
        return text
    bound_name = next((key for key, bound in (namespace or {}).items() if bound is value), None)
    return bound_name or _ADDRESS_RE.sub("", text)


def _unevaluated_signature(obj: Any) -> inspect.Signature | None:
    """Return the signature of ``obj`` with its annotations as written.

    Return None when ``inspect.signature`` cannot read a signature from ``obj``.

    pdoc resolves annotations in the class namespace, so in a class that defines a method named
    ``bool`` or ``str``, the annotation ``bool`` resolves to that method.
    """
    try:
        return inspect.signature(obj)
    except (TypeError, ValueError):
        return None


def _signature_details(signature: inspect.Signature, obj: Any = None) -> dict[str, Any]:
    written = _unevaluated_signature(obj) if obj is not None else None
    written_parameters = written.parameters if written else {}
    namespace = getattr(obj, "__globals__", None)

    def annotation(p: inspect.Parameter) -> str | None:
        source = written_parameters.get(p.name)
        return _annotation_text(source.annotation if source else p.annotation)

    return_annotation = written.return_annotation if written else signature.return_annotation
    return {
        "parameters": [
            {
                "name": p.name,
                "kind": str(p.kind),
                "default": _default_text(p.default, namespace),
                "annotation": annotation(p),
            }
            for p in signature.parameters.values()
        ],
        "return_annotation": None
        if signature.return_annotation is inspect.Parameter.empty
        else _annotation_text(return_annotation),
    }


def _is_public(doc: Doc) -> bool:
    """Return whether pdoc's default template would show ``doc``.

    pdoc decides visibility in its HTML template, not on the ``Doc`` model, so the dump applies the
    same rules. ``@private`` in a docstring hides a member, and ``@public`` shows one. A constructor
    shows when it has a docstring or takes arguments. Otherwise a name listed in the module's
    ``__all__`` is public, and a name with a leading underscore is not.
    """
    docstring = doc.docstring
    if "@private" in docstring:
        return False
    if "@public" in docstring:
        return True
    if doc.name == "__init__" and isinstance(doc, Function):
        return bool(docstring or doc.signature_without_self.parameters)
    if doc.name == "__doc__":
        return False
    if isinstance(doc, Variable) and doc.is_typevar and not docstring:
        return False
    module_all = getattr(sys.modules.get(doc.modulename), "__all__", None) or []
    if (doc.qualname or doc.name) in module_all:
        return True
    return not doc.name.startswith("_")


def _doc_to_dict(doc: Doc, kind_by_fullname: dict[str, str]) -> dict[str, Any]:
    parent = None
    if doc.kind != "module":
        if "." in doc.qualname:
            parent_qualname = doc.qualname.rsplit(".", 1)[0]
            parent_fullname = f"{doc.modulename}.{parent_qualname}"
        else:
            parent_fullname = doc.modulename

        parent_kind = kind_by_fullname.get(parent_fullname)
        parent = {
            "fullname": parent_fullname,
            "kind": parent_kind,
        }

    data: dict[str, Any] = {
        "kind": doc.kind,
        "name": doc.name,
        "fullname": doc.fullname,
        "qualname": doc.qualname,
        "modulename": doc.modulename,
        "docstring": doc.docstring,
        "taken_from": {
            "modulename": doc.taken_from[0],
            "qualname": doc.taken_from[1],
        },
        "parent": parent,
        "source": doc.source,
        "source_file": str(doc.source_file) if doc.source_file else None,
        "source_lines": _format_source_lines(doc.source_lines),
        "is_inherited": doc.is_inherited,
        "is_public": _is_public(doc),
        "is_external": getattr(doc, "is_external", None),
    }

    if isinstance(doc, Module):
        data.update(
            {
                "is_package": doc.is_package,
                "submodules": [m.fullname for m in doc.submodules],
                "members": [m.fullname for m in doc.own_members],
            }
        )
    elif isinstance(doc, Class):
        data.update(
            {
                "members": [m.fullname for m in doc.own_members],
                "bases": [{"modulename": b[0], "qualname": b[1], "display": b[2]} for b in doc.bases],
                "decorators": doc.decorators,
            }
        )
    elif isinstance(doc, Function):
        data.update(
            {
                "signature": str(doc.signature),
                "signature_without_self": str(doc.signature_without_self),
                "signature_details": _signature_details(doc.signature, doc.obj),
                "signature_without_self_details": _signature_details(doc.signature_without_self, doc.obj),
                "is_classmethod": doc.is_classmethod,
                "is_staticmethod": doc.is_staticmethod,
                "decorators": doc.decorators,
            }
        )
    elif isinstance(doc, Variable):
        data.update(
            {
                "annotation": _json_safe(doc.annotation),
                "default_value": _json_safe(doc.default_value),
            }
        )

    return data


def _as_wrapped_function(doc: Doc) -> Doc:
    """Return a function doc for a variable whose value wraps a function, or ``doc`` unchanged.

    A decorator such as Celery's ``shared_task`` returns an object rather than a function, so pdoc
    records the decorated name as a variable with no signature or docstring. When the object's
    ``__wrapped__`` is a function or bound method, document it under the variable's name.
    """
    if not isinstance(doc, Variable):
        return doc
    try:
        wrapped = getattr(doc.default_value, "__wrapped__", None)
    except Exception:  # A lazy proxy can raise while it resolves.
        return doc
    # A task declared with bind=True wraps a method bound to the task, whose signature omits that argument.
    if not (inspect.isfunction(wrapped) or inspect.ismethod(wrapped)):
        return doc
    return Function(doc.modulename, doc.qualname, wrapped, (doc.modulename, doc.qualname))


def _collect_docs(root_docs: Iterable[Doc]) -> list[Doc]:
    collected: dict[str, Doc] = {}
    stack = list(root_docs)
    while stack:
        doc = _as_wrapped_function(stack.pop())
        if doc.fullname in collected:
            continue
        collected[doc.fullname] = doc

        if isinstance(doc, (Module, Class)):
            stack.extend(doc.own_members)

    return list(collected.values())


def _walk_package_modules(spec: str) -> list[str]:
    """Discover all module names under a package by walking the filesystem.

    Unlike pdoc's walk_specs, this ignores __all__ on package __init__.py
    files. __all__ controls re-export semantics for `import *`, not which
    submodules exist as documented API.
    """
    try:
        module = importlib.import_module(spec)
    except ImportError:
        return [spec]

    names = [spec]
    package_path = getattr(module, "__path__", None)
    if package_path is None:
        return names

    for _, modname, _ in pkgutil.walk_packages(
        path=package_path,
        prefix=spec + ".",
        onerror=lambda name: None,
    ):
        names.append(modname)

    return names


def dump_modules(specs: Iterable[str]) -> dict[str, Any]:
    """
    Load modules based on pdoc specs and return a raw, JSON-friendly dump.
    """
    seen: set[str] = set()
    module_names: list[str] = []
    for spec in specs:
        for name in _walk_package_modules(spec):
            if name not in seen:
                seen.add(name)
                module_names.append(name)

    modules = [Module.from_name(name) for name in module_names]
    docs = _collect_docs(modules)
    kind_by_fullname = {doc.fullname: doc.kind for doc in docs}

    return {
        "module_names": module_names,
        "docs": [_doc_to_dict(doc, kind_by_fullname) for doc in docs],
    }


def main() -> int:
    args = parse_args()
    output_path = Path(args.output)
    if not output_path.is_absolute():
        repo_root = Path(__file__).resolve().parents[2]
        output_path = repo_root / output_path
    output_path.parent.mkdir(parents=True, exist_ok=True)

    payload = dump_modules(args.spec)

    output_path.write_text(json.dumps(payload, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    import os
    import sys

    import django

    if os.environ.get("DJANGO_SETTINGS_MODULE") == "doc_settings":
        server_dir = Path(__file__).resolve().parents[2] / "server"
        if str(server_dir) not in sys.path:
            sys.path.insert(0, str(server_dir))

    django.setup()
    raise SystemExit(main())
