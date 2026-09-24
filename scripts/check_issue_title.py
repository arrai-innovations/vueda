#!/usr/bin/env python3
"""Check an issue title against the mechanical rules in CONTRIBUTING.md ("Issue titles").

- No Conventional Commit prefix such as `fix:` or `feat(scope):`. Issue types and
  labels classify an issue.
- No trailing period.
- A title that starts with `Investigate` carries the `investigation` label,
  because evidence gathering or a decision is its deliverable.

Whether a title names an outcome with an active verb and a concrete object is
left to review. The `issue-title` workflow runs this on `issues` events; pass a
title and labels to run it locally.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path


CONVENTIONAL_PREFIX = re.compile(r"^[a-z]+(\([^)]*\))?!?:\s")
INVESTIGATION_LABEL = "investigation"


def title_errors(title: str, labels: set[str]) -> list[str]:
    errors = []
    if CONVENTIONAL_PREFIX.match(title):
        errors.append("Drop the Conventional Commit prefix. The issue type and labels classify the issue.")
    if title.rstrip().endswith("."):
        errors.append("Drop the trailing period.")
    if re.match(r"investigate\b", title, re.IGNORECASE) and INVESTIGATION_LABEL not in labels:
        errors.append(
            f"A title that starts with `Investigate` needs the `{INVESTIGATION_LABEL}` label. Otherwise, "
            "name the outcome that closing the issue delivers."
        )
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("title", nargs="?", help="Issue title; defaults to the triggering event's.")
    parser.add_argument("--label", action="append", default=[], help="An issue label; repeat for several.")
    args = parser.parse_args()

    if args.title is None:
        issue = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text(encoding="utf-8"))["issue"]
        title, labels = issue["title"], {label["name"] for label in issue["labels"]}
    else:
        title, labels = args.title, set(args.label)

    errors = title_errors(title, labels)
    for error in errors:
        print(f"::error::{error}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
