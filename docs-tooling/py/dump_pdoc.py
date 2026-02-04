"""Dump pdoc's internal model to JSON for analysis."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from extractors.python import dump_modules


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Dump pdoc model to JSON.")
    parser.add_argument("--spec", action="append", default=["vueda"], help="pdoc spec to include")
    parser.add_argument("--output", default="docs-tooling/samples/pdoc.json", help="Output JSON file")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    output_path = Path(args.output)
    if not output_path.is_absolute():
        repo_root = Path(__file__).resolve().parents[2]
        output_path = repo_root / output_path
    output_path.parent.mkdir(parents=True, exist_ok=True)

    payload = dump_modules(args.spec)

    output_path.write_text(json.dumps(payload, indent=2, sort_keys=True))
    print(f"Wrote {output_path}")
    return 0


if __name__ == "__main__":
    import os
    import sys
    import django

    if os.environ.get("DJANGO_SETTINGS_MODULE") == "doc_settings":
        server_dir = Path(__file__).resolve().parents[2] / "server"
        if str(server_dir) not in sys.path:
            sys.path.insert(0, str(server_dir))

    django.setup()
    raise SystemExit(main())
