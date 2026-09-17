"""Validate the published schema using the same isolated settings as docs extraction."""

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest


@pytest.mark.parametrize("prefix", ["", "routes/"])
def test_docs_schema_validates_and_describes_both_transition_urls(tmp_path, prefix):
    # A fresh process avoids the test registry and does not need a database. Exercise both
    # the docs mount and the conventional application mount against the real URL patterns.
    urlconf = tmp_path / "schema_urls.py"
    urlconf.write_text(
        f"from django.urls import include, path\nurlpatterns = [path({prefix!r}, include('doc_urls'))]\n"
    )
    schema_path = tmp_path / "openapi.json"
    result = subprocess.run(
        [
            sys.executable,
            "manage.py",
            "spectacular",
            "--format",
            "openapi-json",
            "--validate",
            "--urlconf",
            "schema_urls",
            "--file",
            str(schema_path),
        ],
        cwd=Path(__file__).resolve().parents[3],
        env={
            **os.environ,
            "DJANGO_SETTINGS_MODULE": "doc_settings",
            "PYTHONPATH": os.pathsep.join([str(tmp_path), os.environ.get("PYTHONPATH", "")]),
        },
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    schema = json.loads(schema_path.read_text())
    base = f"/{prefix}vueda.workflow/workflows/{{app_label}}/{{model}}/execute-transition/"
    bulk = schema["paths"][base]["patch"]
    single = schema["paths"][base + "{object_id}/"]["patch"]
    assert bulk["operationId"] != single["operationId"]
    for operation, expected in [(bulk, {"app_label", "model"}), (single, {"app_label", "model", "object_id"})]:
        parameters = [parameter for parameter in operation["parameters"] if parameter["in"] == "path"]
        assert {parameter["name"] for parameter in parameters} == expected
        assert len(parameters) == len(expected)
        assert all(parameter["required"] for parameter in parameters)
        assert "200" in operation["responses"]
        assert "400" in operation["responses"]
