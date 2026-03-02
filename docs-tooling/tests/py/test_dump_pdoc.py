import inspect
import sys
from pathlib import Path

import pytest
from dump_pdoc import _collect_docs
from dump_pdoc import _doc_to_dict
from dump_pdoc import _format_source_lines
from dump_pdoc import _json_safe
from dump_pdoc import _signature_details
from dump_pdoc import _walk_package_modules
from dump_pdoc import dump_modules
from pdoc.doc import Module


FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture()
def testpkg(monkeypatch):
    monkeypatch.syspath_prepend(str(FIXTURES_DIR))
    yield
    for key in list(sys.modules):
        if key == "testpkg" or key.startswith("testpkg."):
            del sys.modules[key]


@pytest.fixture()
def annotated_pkg(monkeypatch):
    monkeypatch.syspath_prepend(str(FIXTURES_DIR))
    yield
    for key in list(sys.modules):
        if key == "annotated_pkg" or key.startswith("annotated_pkg."):
            del sys.modules[key]


def test_discovers_submodules_ignoring_empty_all(testpkg):
    """__all__ = () on a package __init__ must not suppress submodule discovery."""
    names = _walk_package_modules("testpkg")
    assert "testpkg" in names
    assert "testpkg.submodule" in names


def test_non_package_returns_only_itself():
    """A plain module (no __path__) returns just its own name."""
    names = _walk_package_modules("functools")
    assert names == ["functools"]


def test_unimportable_spec_does_not_raise():
    """An unimportable spec returns the spec name without raising."""
    names = _walk_package_modules("no_such_module_xyzzy")
    assert names == ["no_such_module_xyzzy"]


# ---------------------------------------------------------------------------
# _format_source_lines
# ---------------------------------------------------------------------------


def test_format_source_lines_with_tuple():
    assert _format_source_lines((1, 10)) == {"start": 1, "end": 10}


def test_format_source_lines_with_none():
    assert _format_source_lines(None) is None


def test_format_source_lines_with_empty_tuple():
    # An empty tuple is falsy, so the function returns None.
    assert _format_source_lines(()) is None


# ---------------------------------------------------------------------------
# _json_safe
# ---------------------------------------------------------------------------


def test_json_safe_passthrough_scalars():
    int_val = 42
    float_val = 3.14
    assert _json_safe(None) is None
    assert _json_safe(int_val) == int_val
    assert _json_safe(float_val) == float_val
    assert _json_safe("s") == "s"
    assert _json_safe(True) is True


def test_json_safe_dict_passthrough():
    assert _json_safe({"a": 1}) == {"a": 1}


def test_json_safe_dict_converts_non_string_keys():
    result = _json_safe({1: "x"})
    assert result == {"1": "x"}


def test_json_safe_list_passthrough():
    assert _json_safe([1, 2]) == [1, 2]


def test_json_safe_tuple_to_list():
    assert _json_safe((1, 2)) == [1, 2]


def test_json_safe_set_to_list():
    result = _json_safe({1, 2})
    assert isinstance(result, list)
    assert sorted(result) == [1, 2]


def test_json_safe_unknown_object_falls_back_to_repr():
    class MyObj:
        def __repr__(self):
            return "MyObj()"

    result = _json_safe(MyObj())
    assert isinstance(result, str)
    assert "MyObj" in result


def test_json_safe_nested_dict():
    assert _json_safe({"a": [1, None]}) == {"a": [1, None]}


# ---------------------------------------------------------------------------
# _signature_details
# ---------------------------------------------------------------------------


def test_signature_details_structure():
    params = [
        inspect.Parameter("x", inspect.Parameter.POSITIONAL_OR_KEYWORD, annotation=int),
        inspect.Parameter("y", inspect.Parameter.POSITIONAL_OR_KEYWORD, default=0, annotation=int),
    ]
    sig = inspect.Signature(params, return_annotation=str)
    result = _signature_details(sig)

    assert "parameters" in result
    assert "return_annotation" in result

    x_param = result["parameters"][0]
    assert x_param["name"] == "x"
    assert x_param["kind"] == "POSITIONAL_OR_KEYWORD"
    assert x_param["default"] is None
    assert x_param["annotation"] is not None

    y_param = result["parameters"][1]
    assert y_param["name"] == "y"
    assert y_param["default"] == 0

    assert result["return_annotation"] is not None


def test_signature_details_no_annotations_or_defaults():
    params = [inspect.Parameter("a", inspect.Parameter.POSITIONAL_OR_KEYWORD)]
    sig = inspect.Signature(params)
    result = _signature_details(sig)

    assert result["parameters"][0]["annotation"] is None
    assert result["parameters"][0]["default"] is None
    assert result["return_annotation"] is None


# ---------------------------------------------------------------------------
# _doc_to_dict on a Module
# ---------------------------------------------------------------------------


def test_doc_to_dict_module_has_expected_keys(testpkg):
    mod = Module.from_name("testpkg")
    kind_by_fullname = {"testpkg": "module"}
    result = _doc_to_dict(mod, kind_by_fullname)

    assert result["kind"] == "module"
    assert result["name"] == "testpkg"
    assert result["fullname"] == "testpkg"
    assert "docstring" in result
    assert "members" in result
    assert "source_file" in result
    assert "source_lines" in result
    assert result["parent"] is None


# ---------------------------------------------------------------------------
# _doc_to_dict on a Function
# ---------------------------------------------------------------------------


def test_doc_to_dict_function_has_signature_details(annotated_pkg):
    mod = Module.from_name("annotated_pkg")
    func_doc = next(m for m in mod.own_members if m.name == "add")
    kind_by_fullname = {"annotated_pkg": "module", "annotated_pkg.add": "function"}
    result = _doc_to_dict(func_doc, kind_by_fullname)

    assert result["kind"] == "function"
    assert result["name"] == "add"
    assert "signature_details" in result

    sig = result["signature_details"]
    param_names = [p["name"] for p in sig["parameters"]]
    assert "x" in param_names
    assert "y" in param_names
    assert sig["return_annotation"] is not None


def test_doc_to_dict_function_parent_points_to_module(annotated_pkg):
    mod = Module.from_name("annotated_pkg")
    func_doc = next(m for m in mod.own_members if m.name == "add")
    kind_by_fullname = {"annotated_pkg": "module", "annotated_pkg.add": "function"}
    result = _doc_to_dict(func_doc, kind_by_fullname)

    assert result["parent"] is not None
    assert result["parent"]["fullname"] == "annotated_pkg"
    assert result["parent"]["kind"] == "module"


# ---------------------------------------------------------------------------
# _collect_docs
# ---------------------------------------------------------------------------


def test_collect_docs_returns_module_and_members(testpkg):
    modules = [Module.from_name("testpkg"), Module.from_name("testpkg.submodule")]
    docs = _collect_docs(modules)
    fullnames = {d.fullname for d in docs}
    assert "testpkg" in fullnames
    assert "testpkg.submodule" in fullnames


def test_collect_docs_deduplicates(testpkg):
    mod = Module.from_name("testpkg")
    # Passing the same module twice should not duplicate it.
    docs = _collect_docs([mod, mod])
    assert sum(1 for d in docs if d.fullname == "testpkg") == 1


# ---------------------------------------------------------------------------
# dump_modules
# ---------------------------------------------------------------------------


def test_dump_modules_returns_module_names_and_docs(testpkg):
    result = dump_modules(["testpkg"])
    assert "module_names" in result
    assert "docs" in result
    assert "testpkg" in result["module_names"]
    assert "testpkg.submodule" in result["module_names"]


def test_dump_modules_docs_contain_module_entries(testpkg):
    result = dump_modules(["testpkg"])
    module_docs = [d for d in result["docs"] if d["kind"] == "module"]
    fullnames = {d["fullname"] for d in module_docs}
    assert "testpkg" in fullnames
    assert "testpkg.submodule" in fullnames
