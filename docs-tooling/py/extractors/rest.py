"""OpenAPI extraction via DRF Spectacular."""

from __future__ import annotations

import os
import subprocess
from pathlib import Path
from typing import Any

from core import Extractor


class RestExtractor(Extractor):
    def extract(
        self,
        output_path: str | Path,
        *,
        settings_module: str = "doc_settings",
        server_dir: str | Path | None = None,
        format: str = "openapi-json",
        extra_args: list[str] | None = None,
    ) -> dict[str, Any]:
        output_path = Path(output_path)
        if not output_path.is_absolute():
            output_path = Path(__file__).resolve().parents[2] / output_path
        output_path.parent.mkdir(parents=True, exist_ok=True)

        if server_dir is None:
            server_dir = Path(__file__).resolve().parents[2] / "server"
        server_dir = Path(server_dir)

        env = os.environ.copy()
        env.setdefault("DJANGO_SETTINGS_MODULE", settings_module)

        cmd = [
            "python",
            "manage.py",
            "spectacular",
            "--format",
            format,
            "--file",
            str(output_path),
        ]
        if extra_args:
            cmd.extend(extra_args)

        subprocess.run(cmd, cwd=server_dir, env=env, check=True)

        return {
            "output_path": str(output_path),
            "format": format,
            "settings_module": settings_module,
        }
