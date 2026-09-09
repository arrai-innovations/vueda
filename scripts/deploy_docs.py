#!/usr/bin/env python3
"""Trigger a documentation site deploy through the CircleCI API.

The site publishes to /v<major>/, a directory that every minor, patch, and
prerelease build overwrites. A docs-v* tag is therefore not the only reason to
republish it: a content correction, or a retry after a failed deploy step, needs
the same pipeline without a new tag.

This posts to the CircleCI v2 pipeline endpoint with `deploy-docs` set. The
setup config routes that parameter to the `docs-deploy` workflow in
.circleci/docs.yml, which validates the documentation and then publishes it.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path


PROJECT_SLUG = "gh/arrai-innovations/vueda"
PIPELINE_ENDPOINT = f"https://circleci.com/api/v2/project/{PROJECT_SLUG}/pipeline"
PIPELINE_VIEW = "https://app.circleci.com/pipelines/github/arrai-innovations/vueda"

DEFAULT_BRANCH = "main"

CLI_CONFIG = Path.home() / ".circleci" / "cli.yml"
TOKEN_LINE = re.compile(r"^token:\s*(?:\"([^\"]*)\"|'([^']*)'|(\S+))\s*$", re.MULTILINE)


def read_token() -> str | None:
    """Return a CircleCI API token from the environment or the CircleCI CLI config."""
    for variable in ("CIRCLECI_TOKEN", "CIRCLECI_CLI_TOKEN"):
        token = os.environ.get(variable)
        if token:
            return token

    if not CLI_CONFIG.is_file():
        return None

    match = TOKEN_LINE.search(CLI_CONFIG.read_text(encoding="utf-8"))
    if match is None:
        return None
    return match.group(1) or match.group(2) or match.group(3)


def trigger_pipeline(branch: str, token: str) -> dict:
    """Ask CircleCI to run a docs-deploy pipeline for the given branch."""
    request = urllib.request.Request(
        PIPELINE_ENDPOINT,
        method="POST",
        data=json.dumps({"branch": branch, "parameters": {"deploy-docs": True}}).encode("utf-8"),
        headers={
            "Accept": "application/json",
            "Circle-Token": token,
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(request) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(description="Trigger a documentation site deploy through the CircleCI API.")
    parser.add_argument(
        "--branch",
        default=DEFAULT_BRANCH,
        help=f"Branch to build and publish. Defaults to {DEFAULT_BRANCH}.",
    )
    parser.add_argument(
        "--allow-branch",
        action="store_true",
        help=f"Confirm publishing a branch other than {DEFAULT_BRANCH}.",
    )
    args = parser.parse_args()

    if args.branch != DEFAULT_BRANCH and not args.allow_branch:
        sys.stderr.write(
            f"Refusing to publish '{args.branch}'.\n"
            f"The deploy overwrites /v<major>/ for every reader, and this branch is not {DEFAULT_BRANCH}.\n"
            f"Confirm with:\n"
            f"  just docs-deploy --branch {args.branch} --allow-branch\n"
        )
        return 1

    token = read_token()
    if token is None:
        sys.stderr.write("No CircleCI API token found. Run `circleci setup`, or set CIRCLECI_TOKEN.\n")
        return 1

    try:
        result = trigger_pipeline(args.branch, token)
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace").strip()
        sys.stderr.write(f"CircleCI returned {error.code}: {detail}\n")
        return 1
    except urllib.error.URLError as error:
        sys.stderr.write(f"Could not reach CircleCI: {error.reason}\n")
        return 1

    number = result.get("number")
    print(f"Triggered a documentation deploy of '{args.branch}' as pipeline {number}.")
    print(f"{PIPELINE_VIEW}/{number}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
