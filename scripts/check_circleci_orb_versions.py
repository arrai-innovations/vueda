#!/usr/bin/env python3
"""Check that orbs shared across .circleci/*.yml files are pinned to the same version.

path-filtering's continuation step can merge more than one of these files into a
single config in the same pipeline run (e.g. a uv.lock change triggers both
server.yml and docs.yml). When a shared orb alias resolves to different
versions, the merge silently keeps one of them, which can compile job
invocations written against a different version's parameters.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CIRCLECI_DIR = ROOT / ".circleci"

ORBS_HEADER = re.compile(r"^orbs:\s*$")
ORB_LINE = re.compile(r"^\s+(?P<alias>[\w-]+):\s+(?P<ref>[\w-]+/[\w-]+@\S+)\s*$")


def find_orb_declarations() -> dict[str, dict[str, set[str]]]:
    """Map orb alias -> full orb reference -> files declaring it that way."""
    declarations: dict[str, dict[str, set[str]]] = {}
    for path in sorted(CIRCLECI_DIR.glob("*.yml")):
        rel_path = str(path.relative_to(ROOT))
        in_orbs_block = False
        for line in path.read_text(encoding="utf-8").splitlines():
            if ORBS_HEADER.match(line):
                in_orbs_block = True
                continue
            if not in_orbs_block:
                continue
            if line.strip() == "":
                continue
            match = ORB_LINE.match(line)
            if match is None:
                in_orbs_block = False
                continue
            declarations.setdefault(match.group("alias"), {}).setdefault(match.group("ref"), set()).add(rel_path)
    return declarations


def main() -> int:
    errors: list[str] = []
    for alias, refs in sorted(find_orb_declarations().items()):
        if len(refs) <= 1:
            continue
        details = "; ".join(f"{ref} ({', '.join(sorted(files))})" for ref, files in sorted(refs.items()))
        errors.append(f"orb '{alias}' diverges across .circleci/*.yml: {details}")

    if errors:
        sys.stderr.write("CircleCI orb version check failed:\n")
        for error in errors:
            sys.stderr.write(f"- {error}\n")
        return 1

    sys.stdout.write("CircleCI orb version check passed.\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
