"""Regression coverage for configuration discovery without Django startup."""

import ast
import json

import pytest
from dump_configuration import DefaultsVisitor
from dump_configuration import extract_configuration
from dump_configuration import settings_reads


def defaults(source):
    visitor = DefaultsVisitor("defaults.py")
    visitor.visit(ast.parse(source))
    return visitor


def test_env_defaults_keep_required_none_positional_and_expressions_distinct():
    visitor = defaults("""
def get_defaults(env):
    return_dict = {
        "REQUIRED": env("REQUIRED"),
        "NULL": env("NULL", default=None),
        "RESET": env("RESET", "/reset"),
        "COUNT": env.int("COUNT", default=60 * 5),
        "FLAG": env.bool(key="FLAG", default=False),
        "MODE": env.enum("MODE", Mode),
        "MODE_DEFAULT": env.enum("MODE_DEFAULT", Mode, Mode.NORMAL),
    }
    return return_dict
""")
    assert {r["name"]: r["default"] for r in visitor.config} == {
        "REQUIRED": None,
        "NULL": "None",
        "RESET": "'/reset'",
        "COUNT": "60 * 5",
        "FLAG": "False",
        "MODE": None,
        "MODE_DEFAULT": "Mode.NORMAL",
    }
    assert visitor.config[3]["accessor"] == "int"
    assert visitor.config[0]["source"] == {"file": "defaults.py", "line": 4}


def test_conditional_reads_and_factory_overrides_keep_their_context():
    visitor = defaults("""
def get_defaults(env, use_mailers=False):
    return_dict = {"MAX_AGE": 100, **{"PAGE": "p"}}
    if use_mailers:
        return_dict["MAILERS"] = {"default": {"BACKEND": env("EMAIL")}}
    else:
        return_dict["EMAIL_BACKEND"] = env("EMAIL")
    if env.bool("DEBUG", False):
        return_dict["MAX_AGE"] = 10
    try:
        import optional_schema
    except ImportError:
        pass
    else:
        return_dict.update({"SCHEMA": env("SCHEMA")})
        return_dict["APPS"] += ["optional_schema"]
    return return_dict

def get_production_defaults(env):
    return {"DSN": env("DSN"), "LEVEL": env.int("LEVEL", default=logging.INFO)}
""")
    assert visitor.config[0]["conditions"] == ["use_mailers"]
    assert visitor.config[1]["conditions"] == ["not (use_mailers)"]
    assert visitor.config[2]["conditions"] == []  # The condition itself executes unconditionally.
    assert visitor.config[3]["conditions"] == ["imports succeed: import optional_schema"]
    assert visitor.config[-1]["function"] == "get_production_defaults"
    assert visitor.config[-1]["default"] == "logging.INFO"
    ages = [r for r in visitor.definitions if r["name"] == "MAX_AGE"]
    assert [r["expression"] for r in ages] == ["100", "10"]
    assert ages[1]["conditions"] == ["env.bool('DEBUG', False)"]
    assert next(r for r in visitor.definitions if r["name"] == "APPS")["operation"] == "Add"


def test_settings_reads_respect_import_aliases_and_ignore_strings_and_assignments():
    reads = settings_reads(
        ast.parse("""
from django.conf import settings as conf
conf.WRITTEN = True
value = conf.REQUIRED
fallback = getattr(conf, "OPTIONAL", None)
exists = hasattr(conf, "FEATURE")
configured = conf.configured
text = "settings.NOT_A_READ"
other = api_settings.PAGE_SIZE
"""),
        "module.py",
    )
    assert [(r["name"], r["fallback"], r["access"]) for r in reads] == [
        ("REQUIRED", None, "attribute"),
        ("OPTIONAL", "None", "getattr"),
        ("FEATURE", None, "hasattr"),
    ]


@pytest.mark.parametrize(
    "source",
    [
        'def get_defaults(env):\n return {"NAME": env(variable)}',
        'def get_defaults(env):\n return {"NAME": env("NAME", **options)}',
        "def get_defaults(env):\n return_dict = {**other_defaults}",
        'def get_defaults(env):\n return_dict["COUNT"] *= 2',
    ],
)
def test_unextractable_config_fails_instead_of_silently_omitting_it(source):
    with pytest.raises(ValueError, match=r"defaults\.py:"):
        defaults(source)


def test_dynamic_settings_name_fails_with_source_location():
    with pytest.raises(ValueError, match=r"module\.py:2: configuration names must be literal strings"):
        settings_reads(ast.parse("from django.conf import settings\ngetattr(settings, name)"), "module.py")


def test_extract_scans_migrations_without_executing_source(tmp_path):
    server = tmp_path / "server/vueda"
    (server / "core").mkdir(parents=True)
    (server / "migrations").mkdir()
    (tmp_path / "docs-tooling").mkdir()
    (server / "core/default_settings.py").write_text("""
raise RuntimeError("Must never import this file")
def get_defaults(env):
    return {"SECRET": env("SECRET")}
""")
    (server / "migrations/0001.py").write_text("from django.conf import settings\nmodel = settings.SWAPPED_MODEL")
    (tmp_path / "docs-tooling/configuration.json").write_text(json.dumps({"config": {}}))
    payload = extract_configuration(tmp_path)
    assert payload["config"][0]["name"] == "SECRET"
    assert payload["reads"][0]["name"] == "SWAPPED_MODEL"
    assert payload["reads"][0]["source"]["file"] == "server/vueda/migrations/0001.py"
