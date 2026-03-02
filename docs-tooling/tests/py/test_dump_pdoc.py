import sys
from pathlib import Path

import pytest
from dump_pdoc import _walk_package_modules


FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture()
def testpkg(monkeypatch):
    monkeypatch.syspath_prepend(str(FIXTURES_DIR))
    yield
    for key in list(sys.modules):
        if key == "testpkg" or key.startswith("testpkg."):
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
