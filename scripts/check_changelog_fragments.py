#!/usr/bin/env python3
"""Require a changelog fragment, or the `changelog:none` label, on a branch.

A branch passes when it adds, edits, or removes a fragment under
`changelog.d/client/` or `changelog.d/server/`, compared with `origin/main`.
Otherwise its open pull request must carry `changelog:none`. Fragments must also
render: an unrecognized filename fails the check. Tag builds and `main` skip it.

CONTRIBUTING.md ("Changelog entries") describes the workflow. Reading labels
needs a GitHub token in `GITHUB_TOKEN`; without one, only the fragment checks
run.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PACKAGES = ("client", "server")
BASE_BRANCH = "main"
SKIP_LABEL = "changelog:none"


def git(*args: str) -> str:
    return subprocess.run(["git", *args], cwd=ROOT, check=True, capture_output=True, text=True).stdout


def fragments_render() -> bool:
    """Draft each package's release section, which rejects an invalid fragment name."""
    ok = True
    for package in PACKAGES:
        result = subprocess.run(
            [
                "towncrier",
                "build",
                "--config",
                f"changelog.d/{package}.toml",
                "--version",
                "check",
                "--draft",
            ],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            print(f"{package} fragments do not render:\n{result.stderr.strip()}")
            ok = False
    return ok


def changed_fragments() -> list[str]:
    git("fetch", "--quiet", "origin", f"+refs/heads/{BASE_BRANCH}:refs/remotes/origin/{BASE_BRANCH}")
    paths = [f"changelog.d/{package}/" for package in PACKAGES]
    return git("diff", "--name-only", f"origin/{BASE_BRANCH}...HEAD", "--", *paths).split()


def github_get(path: str, token: str) -> object:
    request = urllib.request.Request(
        f"https://api.github.com{path}",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def pull_request_labels(branch: str, token: str) -> list[str] | None:
    """Return the labels of the branch's open pull request, or None when it has none."""
    owner = os.environ.get("CIRCLE_PROJECT_USERNAME", "arrai-innovations")
    repo = os.environ.get("CIRCLE_PROJECT_REPONAME", "vueda")
    # CircleCI sets this only when the pull request existed as the pipeline started.
    url = os.environ.get("CIRCLE_PULL_REQUEST", "")
    if url.rstrip("/").split("/")[-1].isdigit():
        pull = github_get(f"/repos/{owner}/{repo}/pulls/{url.rstrip('/').split('/')[-1]}", token)
    else:
        query = urllib.parse.urlencode({"head": f"{owner}:{branch}", "state": "open"})
        pulls = github_get(f"/repos/{owner}/{repo}/pulls?{query}", token)
        if not pulls:
            return None
        pull = pulls[0]
    return [label["name"] for label in pull["labels"]]


def main() -> int:
    branch = os.environ.get("CIRCLE_BRANCH") or git("rev-parse", "--abbrev-ref", "HEAD").strip()
    if os.environ.get("CIRCLE_TAG") or branch == BASE_BRANCH:
        print("Skipping the changelog fragment check on a tag or main build.")
        return 0

    if not fragments_render():
        return 1

    changed = changed_fragments()
    if changed:
        print("Changelog fragments changed on this branch:")
        print("\n".join(f"  {path}" for path in changed))
        return 0

    token = os.environ.get("GITHUB_TOKEN", "")
    if not token:
        print(
            "This branch changes no changelog fragment. Add one, or add the "
            f"`{SKIP_LABEL}` label to its pull request. Reading that label needs GITHUB_TOKEN."
        )
        return 1

    labels = pull_request_labels(branch, token)
    if labels is None:
        print(
            f"This branch changes no changelog fragment and has no open pull request. Add a "
            f"fragment, or open the pull request with the `{SKIP_LABEL}` label and rerun this job."
        )
        return 1
    if SKIP_LABEL in labels:
        print(f"The pull request carries `{SKIP_LABEL}`; no changelog fragment is required.")
        return 0

    print(
        f"This branch changes no changelog fragment. Add one under changelog.d/ (see "
        f"CONTRIBUTING.md), or add the `{SKIP_LABEL}` label to the pull request and rerun this job."
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
