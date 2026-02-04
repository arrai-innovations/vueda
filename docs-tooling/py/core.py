"""Base classes for docs-tooling pipelines."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Iterable


@dataclass(frozen=True)
class Domain:
    """Represents a documentation domain (python, rest, javascript, components)."""

    name: str
    version: str | None = None


class Extractor(ABC):
    """Extract raw data from tooling or source trees."""

    @abstractmethod
    def extract(self, *args: Any, **kwargs: Any) -> Any:
        raise NotImplementedError


class Normalizer(ABC):
    """Normalize tool-specific JSON into the canonical schema."""

    @abstractmethod
    def normalize(self, payload: Any) -> dict:
        raise NotImplementedError


class Renderer(ABC):
    """Render canonical schema into output artifacts (Markdown, JSON, etc)."""

    @abstractmethod
    def render(self, canonical: dict) -> Iterable[tuple[str, str]]:
        """Return (relative_path, content) pairs."""
        raise NotImplementedError


class Pipeline(ABC):
    """High-level orchestration for extract -> normalize -> render."""

    @abstractmethod
    def run(self, *args: Any, **kwargs: Any) -> Iterable[tuple[str, str]]:
        raise NotImplementedError
