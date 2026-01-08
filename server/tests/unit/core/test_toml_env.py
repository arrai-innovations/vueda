import os

import pytest

from vueda.core.config import TomlEnv
from vueda.core.config import load_toml


def test_required_key_raises():
    env = TomlEnv(config={})
    with pytest.raises(KeyError):
        env("MISSING_KEY")


def test_default_value_is_returned():
    env = TomlEnv(config={})
    assert env("MISSING_KEY", default="fallback") == "fallback"


def test_env_overrides_config_by_default():
    env = TomlEnv(config={"DEBUG": False}, environ={"DEBUG": "true"})
    assert env.bool("DEBUG") is True


def test_config_used_when_env_preference_disabled():
    env = TomlEnv(config={"DEBUG": False}, environ={"DEBUG": "true"}, prefer_env=False)
    assert env.bool("DEBUG") is False


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (True, True),
        (False, False),
        (1, True),
        (0, False),
        ("true", True),
        ("false", False),
        ("yes", True),
        ("no", False),
        ("on", True),
        ("off", False),
    ],
)
def test_bool_parsing(value, expected):
    env = TomlEnv(config={"FLAG": value})
    assert env.bool("FLAG") is expected


def test_bool_parsing_rejects_invalid_values():
    env = TomlEnv(config={"FLAG": "maybe"})
    with pytest.raises(ValueError):
        env.bool("FLAG")


def test_list_parsing_from_string():
    env = TomlEnv(config={"ALLOWED_HOSTS": "a.com, b.com ,c.com"}, environ={})
    assert env.list("ALLOWED_HOSTS") == ["a.com", "b.com", "c.com"]


def test_list_parsing_from_sequence():
    env = TomlEnv(config={"ALLOWED_HOSTS": ["a.com", "b.com"]}, environ={})
    assert env.list("ALLOWED_HOSTS") == ["a.com", "b.com"]


def test_list_parsing_from_none():
    env = TomlEnv(config={"ALLOWED_HOSTS": None}, environ={})
    assert env.list("ALLOWED_HOSTS") == []


def test_dj_db_url_parsing():
    env = TomlEnv(config={"DATABASE_URL": "postgres://user:pass@localhost:5432/dbname"}, environ={})
    config = env.dj_db_url("DATABASE_URL")
    assert config["ENGINE"] == "django.db.backends.postgresql"
    assert config["NAME"] == "dbname"


def test_load_toml(tmp_path):
    config_path = tmp_path / "settings.toml"
    config_path.write_text("DEBUG = true\n", encoding="utf-8")
    loaded = load_toml(config_path)
    assert loaded == {"DEBUG": True}


def test_load_toml_missing_file():
    missing_path = os.fspath("does-not-exist.toml")
    assert load_toml(missing_path) == {}


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("P1W", 7 * 24 * 60 * 60),
        ("P1.5W", 10.5 * 24 * 60 * 60),
        ("P2D", 2 * 24 * 60 * 60),
        ("PT2H", 2 * 60 * 60),
        ("PT2.5H", 2.5 * 60 * 60),
        ("PT30M", 30 * 60),
        ("PT45.5S", 45.5),
        ("P1DT2H3M4S", 1 * 24 * 60 * 60 + 2 * 60 * 60 + 3 * 60 + 4),
    ],
)
def test_iso_duration_parsing(value, expected):
    env = TomlEnv(config={"DURATION": value})
    assert env.timedelta("DURATION").total_seconds() == pytest.approx(expected)


@pytest.mark.parametrize("value", ["P1Y", "P1M", "PX"])
def test_iso_duration_parsing_rejects_invalid_values(value):
    env = TomlEnv(config={"DURATION": value})
    with pytest.raises(ValueError):
        env.timedelta("DURATION")


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("P", 0),
        ("PT", 0),
        ("P1DT", 24 * 60 * 60),
    ],
)
def test_iso_duration_parsing_accepts_empty_parts(value, expected):
    env = TomlEnv(config={"DURATION": value})
    assert env.timedelta("DURATION").total_seconds() == expected
