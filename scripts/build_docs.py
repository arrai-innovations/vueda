#!/usr/bin/env python
"""Build MkDocs guide/changelog and pdoc reference with Django initialized."""
from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
SERVER_DIR = ROOT_DIR / "server"
DOCS_DIR = ROOT_DIR / "docs"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build documentation outputs.")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--reference-only", action="store_true", help="Only build pdoc reference output.")
    group.add_argument("--mkdocs-only", action="store_true", help="Only build MkDocs guide/changelog output.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    os.chdir(ROOT_DIR)

    sys_path = str(SERVER_DIR)
    if sys_path not in sys.path:
        sys.path.insert(0, sys_path)

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "doc_settings")

    exit_code = 0

    if not args.mkdocs_only:
        import django

        django.setup()

        reference_root = DOCS_DIR / "api" / "server"
        if reference_root.exists():
            shutil.rmtree(reference_root)
        reference_root.mkdir(parents=True, exist_ok=True)

        import pdoc.__main__ as pdoc_cli

        pdoc_cli.cli(
            [
                "-o",
                str(reference_root),
                "-t",
                str(DOCS_DIR / "pdoc" / "templates"),
                "vueda",
                "!vueda.workflow.forms",
            ]
        )

    if not args.reference_only:
        result = subprocess.run(["mkdocs", "build"], check=False)
        exit_code = result.returncode

    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
