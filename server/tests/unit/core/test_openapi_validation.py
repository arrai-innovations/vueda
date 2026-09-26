"""Validate the published schema using the same isolated settings as docs extraction."""

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest


@pytest.fixture(scope="module", params=["", "routes/"])
def mounted_schema(request, tmp_path_factory):
    # A fresh process avoids the test registry and does not need a database. Exercise both
    # the docs mount and the conventional application mount against the real URL patterns.
    prefix = request.param
    tmp_path = tmp_path_factory.mktemp("schema")
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
    return prefix, json.loads(schema_path.read_text())


def test_docs_schema_validates_and_describes_both_transition_urls(mounted_schema):
    prefix, schema = mounted_schema
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


def test_docs_schema_describes_model_info_sections_under_any_mount(mounted_schema):
    prefix, schema = mounted_schema
    operation = schema["paths"][f"/{prefix}vueda.info/model_info/{{app_label}}/{{model}}/"]["get"]
    response = operation["responses"]["200"]["content"]["application/json"]
    assert {
        "model_actions",
        "model_column_totals",
        "model_expands",
        "model_fields",
        "model_filtering",
        "model_ordering",
        "model_permissions",
    } <= set(response["schema"]["properties"])
    assert response["examples"]
