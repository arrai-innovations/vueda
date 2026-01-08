from __future__ import annotations

import json
import logging
import os
import re
import tomllib
import uuid
from collections.abc import Callable
from collections.abc import Mapping
from datetime import date
from datetime import datetime
from datetime import time
from datetime import timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any
from typing import TypeVar
from urllib.parse import ParseResult
from urllib.parse import urlparse

import dj_database_url
import dj_email_url
import django_cache_url


_MISSING = object()
_T = TypeVar("_T")
_EXPANDED_VAR_PATTERN = re.compile(r"(?<!\\)\$\{([A-Za-z0-9_]+)(:-[^\\}:]*)?\}")


class TomlEnv:
    """
    Minimal Env-style adapter backed by a TOML-loaded mapping with optional env var overrides.
    """

    def __init__(
        self,
        config: Mapping[str, Any] | None = None,
        environ: Mapping[str, str] | None = None,
        *,
        prefer_env: bool = True,
        prefix: str | None = None,
        expand_vars: bool = False,
    ) -> None:
        self._config = {} if config is None else config
        self._environ = os.environ if environ is None else environ
        self._prefer_env = prefer_env
        self._prefix = prefix
        self._expand_vars = expand_vars

    def __call__(self, key: str, default: Any = _MISSING) -> Any:
        value = self._get(key)
        if value is _MISSING:
            if default is _MISSING:
                raise KeyError(f"Missing config key: {key}")
            return default
        if self._expand_vars and isinstance(value, str):
            return self._expand(value)
        return value

    def bool(self, key: str, default: Any = _MISSING) -> bool:
        value = self(key, default=default)
        if value is default:
            return value
        if isinstance(value, bool):
            return value
        if isinstance(value, (int, float)):
            return bool(value)
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "t", "yes", "y", "on"}:
                return True
            if normalized in {"0", "false", "f", "no", "n", "off"}:
                return False
        raise ValueError(f"Invalid boolean value for {key}: {value!r}")

    def int(self, key: str, default: Any = _MISSING) -> int:
        value = self(key, default=default)
        if value is default:
            return value
        if isinstance(value, int):
            return value
        if isinstance(value, float) and value.is_integer():
            return int(value)
        if isinstance(value, str) and value.strip() == "":
            raise ValueError(f"Invalid integer value for {key}: {value!r}")
        return int(value)

    def float(self, key: str, default: Any = _MISSING) -> float:
        value = self(key, default=default)
        if value is default:
            return value
        if isinstance(value, float):
            return value
        if isinstance(value, int):
            return float(value)
        if isinstance(value, str) and value.strip() == "":
            raise ValueError(f"Invalid float value for {key}: {value!r}")
        return float(value)

    def list(
        self,
        key: str,
        default: Any = _MISSING,
        *,
        delimiter: str = ",",
        subcast: Callable[[Any], Any] | None = None,
    ) -> list[Any]:
        value = self(key, default=default)
        if value is default:
            return value
        if value is None:
            items: list[Any] = []
        elif isinstance(value, (list, tuple, set)):
            items = list(value)
        elif isinstance(value, str):
            if value == "":
                items = []
            else:
                items = [item.strip() for item in value.split(delimiter)]
        else:
            items = [value]
        if subcast is not None:
            items = [subcast(item) for item in items]
        return items

    def tuple(
        self,
        key: str,
        default: Any = _MISSING,
        *,
        delimiter: str = ",",
        subcast: Callable[[Any], Any] | None = None,
    ) -> tuple[Any, ...]:
        value = self(key, default=default)
        if value is default:
            return value
        if value is None:
            items: list[Any] = []
        elif isinstance(value, (list, tuple, set)):
            items = list(value)
        elif isinstance(value, str):
            items = [item.strip() for item in value.split(delimiter)] if value != "" else []
        else:
            items = [value]
        if subcast is not None:
            items = [subcast(item) for item in items]
        return tuple(items)

    def dict(
        self,
        key: str,
        default: Any = _MISSING,
        *,
        delimiter: str = ",",
        key_value_delimiter: str = "=",
        subcast_keys: Callable[[Any], Any] | None = None,
        subcast_key: Callable[[Any], Any] | None = None,
        subcast_values: Callable[[Any], Any] | None = None,
    ) -> dict[Any, Any]:
        value = self(key, default=default)
        if value is default:
            return value
        if isinstance(value, Mapping):
            result = dict(value)
        elif value is None:
            result = {}
        elif isinstance(value, str):
            if value == "":
                result = {}
            else:
                result = {}
                for item in value.split(delimiter):
                    if not item.strip():
                        continue
                    if key_value_delimiter not in item:
                        raise ValueError(f"Invalid dict item for {key}: {item!r}")
                    raw_key, raw_val = item.split(key_value_delimiter, 1)
                    parsed_key = raw_key.strip()
                    parsed_val = raw_val.strip()
                    result[parsed_key] = parsed_val
        else:
            raise ValueError(f"Invalid dict value for {key}: {value!r}")
        key_cast = subcast_keys or subcast_key
        if key_cast is not None:
            result = {key_cast(k): v for k, v in result.items()}
        if subcast_values is not None:
            result = {k: subcast_values(v) for k, v in result.items()}
        return result

    def json(self, key: str, default: Any = _MISSING) -> list[Any] | dict[Any, Any] | None:
        value = self(key, default=default)
        if value is default:
            return value
        if isinstance(value, (dict, list)) or value is None:
            return value
        if isinstance(value, str):
            try:
                return json.loads(value)
            except json.JSONDecodeError as error:
                raise ValueError(f"Invalid JSON value for {key}: {value!r}") from error
        raise ValueError(f"Invalid JSON value for {key}: {value!r}")

    def str(self, key: str, default: Any = _MISSING) -> str:
        value = self(key, default=default)
        if value is default:
            return value
        if value is None:
            return value
        return str(value)

    def decimal(self, key: str, default: Any = _MISSING) -> Decimal:
        value = self(key, default=default)
        if value is default:
            return value
        if isinstance(value, Decimal):
            return value
        if value is None or value == "":
            raise ValueError(f"Invalid decimal value for {key}: {value!r}")
        return Decimal(str(value))

    def datetime(self, key: str, default: Any = _MISSING) -> datetime:
        value = self(key, default=default)
        if value is default:
            return value
        if isinstance(value, datetime):
            return value
        if isinstance(value, str):
            return datetime.fromisoformat(value)
        raise ValueError(f"Invalid datetime value for {key}: {value!r}")

    def date(self, key: str, default: Any = _MISSING) -> date:
        value = self(key, default=default)
        if value is default:
            return value
        if isinstance(value, date) and not isinstance(value, datetime):
            return value
        if isinstance(value, str):
            return date.fromisoformat(value)
        raise ValueError(f"Invalid date value for {key}: {value!r}")

    def time(self, key: str, default: Any = _MISSING) -> time:
        value = self(key, default=default)
        if value is default:
            return value
        if isinstance(value, time):
            return value
        if isinstance(value, str):
            return time.fromisoformat(value)
        raise ValueError(f"Invalid time value for {key}: {value!r}")

    def timedelta(self, key: str, default: Any = _MISSING) -> timedelta:
        value = self(key, default=default)
        if value is default:
            return value
        if isinstance(value, timedelta):
            return value
        if isinstance(value, (int, float)):
            return timedelta(seconds=float(value))
        if isinstance(value, str):
            return self._parse_duration(value)
        raise ValueError(f"Invalid timedelta value for {key}: {value!r}")

    def path(self, key: str, default: Any = _MISSING) -> Path:
        value = self(key, default=default)
        if value is default:
            return value
        if isinstance(value, Path):
            return value
        if value is None:
            return value
        return Path(str(value))

    def url(self, key: str, default: Any = _MISSING) -> ParseResult:
        value = self(key, default=default)
        if value is default:
            return value
        if isinstance(value, ParseResult):
            return value
        if value is None:
            return value
        return urlparse(str(value))

    def uuid(self, key: str, default: Any = _MISSING) -> uuid.UUID:
        value = self(key, default=default)
        if value is default:
            return value
        if isinstance(value, uuid.UUID):
            return value
        if isinstance(value, str):
            return uuid.UUID(value)
        raise ValueError(f"Invalid UUID value for {key}: {value!r}")

    def log_level(self, key: str, default: Any = _MISSING) -> int:
        value = self(key, default=default)
        if value is default:
            return value
        if isinstance(value, int):
            return value
        if isinstance(value, str):
            level = logging.getLevelName(value.upper())
            if isinstance(level, int):
                return level
        raise ValueError(f"Invalid log level value for {key}: {value!r}")

    def enum(
        self,
        key: str,
        enum_cls: type[_T],
        default: Any = _MISSING,
        *,
        by_value: bool = False,
        case_sensitive: bool = False,
    ) -> _T:
        value = self(key, default=default)
        if value is default:
            return value
        if isinstance(value, enum_cls):
            return value
        if isinstance(value, str):
            lookup = value if case_sensitive else value.upper()
            if not by_value:
                for member in enum_cls:  # type: ignore[attr-defined]
                    name = member.name if case_sensitive else member.name.upper()
                    if name == lookup:
                        return member
            try:
                return enum_cls(value)  # type: ignore[call-arg]
            except Exception as error:
                raise ValueError(f"Invalid enum value for {key}: {value!r}") from error
        try:
            return enum_cls(value)  # type: ignore[call-arg]
        except Exception as error:
            raise ValueError(f"Invalid enum value for {key}: {value!r}") from error

    def dj_db_url(self, key: str, default: Any = _MISSING, **kwargs: Any) -> dict[str, Any]:
        value = self(key, default=default)
        if value is default:
            return value
        if isinstance(value, dict):
            return value
        return dj_database_url.parse(value, **kwargs)

    def dj_email_url(self, key: str, default: Any = _MISSING, **kwargs: Any) -> dict[str, Any]:
        value = self(key, default=default)
        if value is default:
            return value
        if isinstance(value, dict):
            return value
        return dj_email_url.parse(value, **kwargs)

    def dj_cache_url(self, key: str, default: Any = _MISSING, **kwargs: Any) -> dict[str, Any]:
        value = self(key, default=default)
        if value is default:
            return value
        if isinstance(value, dict):
            return value
        return django_cache_url.parse(value, **kwargs)

    def _get(self, key: str) -> Any:
        lookup_key = f"{self._prefix}{key}" if self._prefix else key
        if self._prefer_env and self._environ is not None and lookup_key in self._environ:
            return self._environ[lookup_key]
        if lookup_key in self._config:
            return self._config[lookup_key]
        return _MISSING

    def _expand(self, value: str) -> str:
        def replacer(match: re.Match[str]) -> str:
            var_name = match.group(1)
            default = match.group(2)
            if default:
                default = default[2:]
            lookup = self._get(var_name)
            if lookup is _MISSING:
                return default or ""
            return str(lookup)

        return _EXPANDED_VAR_PATTERN.sub(replacer, value).replace(r"\${", "${")

    def _parse_duration(self, value: str) -> timedelta:
        text = value.strip()
        if not text:
            raise ValueError("Empty duration string.")
        if text.upper().startswith("P"):
            return self._parse_iso_duration(text)
        matches = re.findall(r"([+-]?\d+(?:\.\d+)?)(w|d|h|m|s|ms|us|µs)", text, flags=re.IGNORECASE)
        if not matches:
            raise ValueError(f"Invalid duration string: {value!r}")
        total = timedelta()
        for amount, unit in matches:
            number = float(amount)
            unit = unit.lower()
            if unit == "w":
                total += timedelta(weeks=number)
            elif unit == "d":
                total += timedelta(days=number)
            elif unit == "h":
                total += timedelta(hours=number)
            elif unit == "m":
                total += timedelta(minutes=number)
            elif unit == "s":
                total += timedelta(seconds=number)
            elif unit == "ms":
                total += timedelta(milliseconds=number)
            elif unit in {"us", "µs"}:
                total += timedelta(microseconds=number)
        return total

    def _parse_iso_duration(self, value: str) -> timedelta:
        match = re.match(
            r"^P(?:(?P<weeks>-?\d+(?:\.\d+)?)W|(?:(?P<days>-?\d+(?:\.\d+)?)D)?"
            r"(?:T(?:(?P<hours>-?\d+(?:\.\d+)?)H)?(?:(?P<minutes>-?\d+(?:\.\d+)?)M)?"
            r"(?:(?P<seconds>-?\d+(?:\.\d+)?)S)?)?)$",
            value,
            flags=re.IGNORECASE,
        )
        if not match:
            raise ValueError(f"Invalid ISO 8601 duration: {value!r}")
        parts = {name: float(val) for name, val in match.groupdict().items() if val is not None}
        if "weeks" in parts:
            return timedelta(weeks=parts["weeks"])
        return timedelta(
            days=parts.get("days", 0),
            hours=parts.get("hours", 0),
            minutes=parts.get("minutes", 0),
            seconds=parts.get("seconds", 0),
        )


def load_toml(path: os.PathLike[str] | str) -> dict[str, Any]:
    toml_path = os.fspath(path)
    if not os.path.exists(toml_path):
        return {}
    with open(toml_path, "rb") as handle:
        return tomllib.load(handle)
