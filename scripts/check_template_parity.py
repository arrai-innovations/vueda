#!/usr/bin/env python3
"""Check dependency parity between source packages and Copier templates."""

from __future__ import annotations

import argparse
import json
import sys
import tomllib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

CLIENT_SOURCE = ROOT / "client/package.json"
CLIENT_TEMPLATES = [
    ROOT / "templates/implementor-monorepo/client/package.json.jinja",
    ROOT / "templates/implementor-monorepo-dx/client/package.json.jinja",
]

SERVER_MIN_TEMPLATE = ROOT / "templates/implementor-monorepo/server/pyproject.toml.jinja"
SERVER_DX_TEMPLATE = ROOT / "templates/implementor-monorepo-dx/server/pyproject.toml.jinja"

CLIENT_KEY_MAP = [
    ("peerDependencies", "dependencies", ["vue", "pinia", "vue-router"]),
    ("devDependencies", "devDependencies", ["@vitejs/plugin-vue", "vite"]),
]


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def load_toml(path: Path) -> dict:
    return tomllib.loads(path.read_text(encoding="utf-8"))


def check_client_parity() -> list[str]:
    errors: list[str] = []
    source = load_json(CLIENT_SOURCE)

    for template in CLIENT_TEMPLATES:
        template_data = load_json(template)
        rel_template = template.relative_to(ROOT)

        for source_section_name, template_section_name, names in CLIENT_KEY_MAP:
            source_section = source.get(source_section_name, {})
            template_section = template_data.get(template_section_name, {})

            for name in names:
                source_version = source_section.get(name)
                template_version = template_section.get(name)

                if source_version is None:
                    errors.append(
                        f"{CLIENT_SOURCE.relative_to(ROOT)} is missing "
                        f"{source_section_name}.{name}"
                    )
                    continue
                if template_version is None:
                    errors.append(
                        f"{rel_template} is missing {template_section_name}.{name}"
                    )
                    continue
                if source_version != template_version:
                    errors.append(
                        f"{rel_template} has {template_section_name}.{name}={template_version} "
                        f"but {CLIENT_SOURCE.relative_to(ROOT)} has "
                        f"{source_section_name}.{name}={source_version}"
                    )

    return errors


def check_server_template_parity() -> list[str]:
    errors: list[str] = []
    min_data = load_toml(SERVER_MIN_TEMPLATE)
    dx_data = load_toml(SERVER_DX_TEMPLATE)

    min_dependencies = min_data["project"]["dependencies"]
    dx_dependencies = dx_data["project"]["dependencies"]
    if min_dependencies != dx_dependencies:
        errors.append(
            "Server template project.dependencies differ between "
            f"{SERVER_MIN_TEMPLATE.relative_to(ROOT)} and "
            f"{SERVER_DX_TEMPLATE.relative_to(ROOT)}"
        )

    min_dev = set(min_data["dependency-groups"]["dev"])
    dx_dev = set(dx_data["dependency-groups"]["dev"])
    missing_in_dx = sorted(min_dev - dx_dev)
    if missing_in_dx:
        errors.append(
            f"{SERVER_DX_TEMPLATE.relative_to(ROOT)} is missing dependency-groups.dev "
            f"entries from {SERVER_MIN_TEMPLATE.relative_to(ROOT)}: {', '.join(missing_in_dx)}"
        )

    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--scope",
        choices=["client", "server", "all"],
        default="all",
        help="Which parity checks to run.",
    )
    args = parser.parse_args()

    errors: list[str] = []
    if args.scope in {"client", "all"}:
        errors.extend(check_client_parity())
    if args.scope in {"server", "all"}:
        errors.extend(check_server_template_parity())

    if errors:
        print("Template dependency parity check failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"Template dependency parity check passed (scope={args.scope}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
