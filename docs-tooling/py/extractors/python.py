"""Helpers for extracting pdoc's internal model into JSON-friendly structures."""

from __future__ import annotations

from collections.abc import Iterable
import inspect
from typing import Any

from pdoc import extract
from pdoc.doc import Class
from pdoc.doc import Doc
from pdoc.doc import Function
from pdoc.doc import Module
from pdoc.doc import Variable

from ..core import Extractor


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


def _signature_details(signature: inspect.Signature) -> dict[str, Any]:
    return {
        "parameters": [
            {
                "name": p.name,
                "kind": str(p.kind),
                "default": None if p.default is inspect._empty else _json_safe(p.default),
                "annotation": None if p.annotation is inspect._empty else _json_safe(p.annotation),
            }
            for p in signature.parameters.values()
        ],
        "return_annotation": None
        if signature.return_annotation is inspect._empty
        else _json_safe(signature.return_annotation),
    }


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
        "is_public": getattr(doc, "is_public", None),
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
                "bases": [
                    {"modulename": b[0], "qualname": b[1], "display": b[2]} for b in doc.bases
                ],
                "decorators": doc.decorators,
            }
        )
    elif isinstance(doc, Function):
        data.update(
            {
                "signature": str(doc.signature),
                "signature_without_self": str(doc.signature_without_self),
                "signature_details": _signature_details(doc.signature),
                "signature_without_self_details": _signature_details(doc.signature_without_self),
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


def _collect_docs(root_docs: Iterable[Doc]) -> list[Doc]:
    collected: dict[str, Doc] = {}
    stack = list(root_docs)
    while stack:
        doc = stack.pop()
        if doc.fullname in collected:
            continue
        collected[doc.fullname] = doc

        if isinstance(doc, (Module, Class)):
            stack.extend(doc.own_members)

    return list(collected.values())


class PythonExtractor(Extractor):
    def extract(self, specs: Iterable[str]) -> dict[str, Any]:
        module_names = extract.walk_specs(list(specs))
        modules = [Module.from_name(name) for name in module_names]
        docs = _collect_docs(modules)
        kind_by_fullname = {doc.fullname: doc.kind for doc in docs}

        return {
            "module_names": module_names,
            "docs": [_doc_to_dict(doc, kind_by_fullname) for doc in docs],
        }


def dump_modules(specs: Iterable[str]) -> dict[str, Any]:
    """
    Load modules based on pdoc specs and return a raw, JSON-friendly dump.
    """
    return PythonExtractor().extract(specs)
