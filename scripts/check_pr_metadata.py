#!/usr/bin/env python3
"""Check a pull request's labels and changelog fragments, adding labels it can infer.

The `pull-request-metadata` workflow runs this on `pull_request_target`, which
holds a write token. The script therefore never reads files from the pull
request's branch. It learns the changed paths from the GitHub API and checks
them against the configuration on the base branch.

- Area labels: adds each `area:*` label whose package the pull request changes.
  It never removes one, and never adds `area:docs`.
- Topic labels: each changelog fragment's directory names a topic. With no
  `topic:*` label, the script adds the fragments' topics. A fragment whose topic
  is not among existing `topic:*` labels fails the check.
- Changelog: the pull request must change a fragment under `changelog.d/` or
  carry `changelog:none`, not both. A fragment filename that towncrier would
  reject fails the check.

CONTRIBUTING.md ("Pull request labels" and "Changelog entries") states the
rules. Run it locally with `--dry-run` and a pull request number to see what it
would do without changing labels.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import tomllib
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CHANGELOG_DIR = "changelog.d"
PACKAGES = ("client", "server")
SKIP_LABEL = "changelog:none"
TOPIC_PREFIX = "topic:"
# changelog.d/<package>/<topic>/<name>
FRAGMENT_PATH_PARTS = 4
PAGE_SIZE = 100

# First matching prefix wins. `docs/` earns no label: `area:docs` marks work
# whose main deliverable is documentation, which a reviewer applies by hand.
AREA_PREFIXES = (
    ("client/", "area:client"),
    ("server/", "area:server"),
    ("docs-tooling/", "area:docs-tooling"),
    ("templates/", "area:templates"),
    (".circleci/", "area:ci"),
    (".github/workflows/", "area:ci"),
)


def fragment_rules() -> tuple[dict[str, set[str]], set[str]]:
    """Return each package's topic directories and the fragment types, from the base branch's configs."""
    topics: dict[str, set[str]] = {}
    types: set[str] = set()
    for package in PACKAGES:
        config = tomllib.loads((ROOT / CHANGELOG_DIR / f"{package}.toml").read_text(encoding="utf-8"))
        towncrier = config["tool"]["towncrier"]
        topics[package] = {section["path"] for section in towncrier["section"]}
        types |= {kind["directory"] for kind in towncrier["type"]}
    return topics, types


def area_label(path: str) -> str | None:
    for prefix, label in AREA_PREFIXES:
        if path.startswith(prefix):
            return label
    return None


def check_fragment(path: str, topics: dict[str, set[str]], types: set[str]) -> str:
    """Return the fragment's topic directory, or raise ValueError describing why towncrier would reject it."""
    parts = path.split("/")
    if len(parts) != FRAGMENT_PATH_PARTS or parts[1] not in PACKAGES:
        raise ValueError(f"{path}: fragments live at {CHANGELOG_DIR}/<package>/<topic>/<name>")
    _, package, topic, name = parts
    if topic not in topics[package]:
        known = ", ".join(sorted(topics[package]))
        raise ValueError(f"{path}: `{topic}` is not a {package} topic. Use one of: {known}")
    kinds = "|".join(sorted(types))
    if not re.fullmatch(rf"(?:\d+|\+[\w-]*)\.(?:{kinds})(?:\.\d+)?\.md", name):
        raise ValueError(f"{path}: name a fragment <issue or pull request>.<{kinds.replace('|', ', ')}>.md")
    return topic


class GitHub:
    def __init__(self, repository: str, token: str) -> None:
        self.repository = repository
        self.token = token

    def request(self, method: str, path: str, body: object | None = None) -> object:
        request = urllib.request.Request(
            f"https://api.github.com/repos/{self.repository}{path}",
            method=method,
            data=None if body is None else json.dumps(body).encode(),
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {self.token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)

    def changed_files(self, number: int) -> list[dict]:
        files, page = [], 1
        while True:
            batch = self.request("GET", f"/pulls/{number}/files?per_page={PAGE_SIZE}&page={page}")
            files.extend(batch)
            if len(batch) < PAGE_SIZE:
                return files
            page += 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("number", nargs="?", type=int, help="Pull request number; defaults to the triggering event's.")
    parser.add_argument("--dry-run", action="store_true", help="Report the labels to add without adding them.")
    args = parser.parse_args()

    github = GitHub(os.environ.get("GITHUB_REPOSITORY", "arrai-innovations/vueda"), os.environ["GITHUB_TOKEN"])
    if args.number is None:
        event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text(encoding="utf-8"))
        number = event["pull_request"]["number"]
    else:
        number = args.number
    pull = github.request("GET", f"/pulls/{number}")
    labels = {label["name"] for label in pull["labels"]}
    files = github.changed_files(number)
    topics, types = fragment_rules()

    errors: list[str] = []
    areas: set[str] = set()
    fragment_changed = False
    fragment_topics: set[str] = set()
    for changed in files:
        for path in {changed["filename"], changed.get("previous_filename") or changed["filename"]}:
            if label := area_label(path):
                areas.add(label)
        path = changed["filename"]
        if not any(path.startswith(f"{CHANGELOG_DIR}/{package}/") for package in PACKAGES):
            continue
        fragment_changed = True
        if changed["status"] == "removed":
            continue
        try:
            fragment_topics.add(TOPIC_PREFIX + check_fragment(path, topics, types))
        except ValueError as error:
            errors.append(str(error))

    to_add = areas - labels
    labeled_topics = {label for label in labels if label.startswith(TOPIC_PREFIX)}
    if fragment_topics and not labeled_topics:
        to_add |= fragment_topics
    elif missing := fragment_topics - labeled_topics:
        errors.append(
            f"Changelog fragments name {', '.join(sorted(missing))}, which the pull request's topic labels "
            f"({', '.join(sorted(labeled_topics))}) do not include. Move the fragment or fix the label."
        )

    if fragment_changed and SKIP_LABEL in labels:
        errors.append(f"The pull request changes changelog fragments and also carries `{SKIP_LABEL}`. Remove one.")
    elif not fragment_changed and SKIP_LABEL not in labels:
        errors.append(
            f"The pull request changes no changelog fragment. Add one under {CHANGELOG_DIR}/ (see CONTRIBUTING.md), "
            f"or add the `{SKIP_LABEL}` label."
        )

    if to_add:
        verb = "Would add" if args.dry_run else "Adding"
        print(f"{verb} labels: {', '.join(sorted(to_add))}")
        if not args.dry_run:
            github.request("POST", f"/issues/{number}/labels", {"labels": sorted(to_add)})
    if extra := {label for label in labels if label.startswith("area:")} - areas - {"area:docs"}:
        print(f"::notice::Area labels with no matching changed path: {', '.join(sorted(extra))}")

    for error in errors:
        print(f"::error::{error}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
