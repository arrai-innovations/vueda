import json
import os
import subprocess
import sys
from pathlib import Path

import jsonschema
import pytest


def strict_openapi_schema(schema):
    """
    Return a JSON Schema copy of an OpenAPI 3.0 schema that rejects undocumented keys.

    ``nullable`` becomes a ``null`` type, and an object that lists properties without saying what else
    it allows gets ``additionalProperties: false``, so a response key the schema omits fails validation.
    """
    if isinstance(schema, list):
        return [strict_openapi_schema(item) for item in schema]
    if not isinstance(schema, dict):
        return schema
    schema = {key: strict_openapi_schema(value) for key, value in schema.items()}
    if schema.pop("nullable", False) and "type" in schema:
        schema["type"] = [schema["type"], "null"]
    if "properties" in schema and "additionalProperties" not in schema:
        schema["additionalProperties"] = False
    return schema


@pytest.fixture(scope="session")
def openapi_document(tmp_path_factory):
    """The published OpenAPI document, built like the docs build builds it."""
    schema_path = tmp_path_factory.mktemp("openapi") / "openapi.json"
    result = subprocess.run(
        [sys.executable, "manage.py", "spectacular", "--format", "openapi-json", "--file", str(schema_path)],
        cwd=Path(__file__).resolve().parents[2],
        env={**os.environ, "DJANGO_SETTINGS_MODULE": "doc_settings"},
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    return json.loads(schema_path.read_text())


def schema_errors(document, data, schema):
    """Return messages for each way ``data`` breaks ``schema``, resolving refs against ``document``."""
    root = {"components": {"schemas": strict_openapi_schema(document["components"]["schemas"])}}
    validator = jsonschema.Draft7Validator({**root, "allOf": [strict_openapi_schema(schema)]})
    errors = sorted(validator.iter_errors(data), key=lambda error: list(error.absolute_path))
    return [f"{list(error.absolute_path)}: {error.message}" for error in errors]


@pytest.fixture(scope="session")
def assert_matches_component(openapi_document):
    """Validate JSON data against a named component, failing on any key the component does not document."""

    def check(data, component):
        errors = schema_errors(openapi_document, data, {"$ref": f"#/components/schemas/{component}"})
        assert not errors, "\n".join(errors[:10])

    return check


@pytest.fixture(scope="session")
def assert_matches_documented_response(openapi_document):
    """
    Validate a response body against the schema the published document gives its operation.

    ``path`` is the operation's path template as the docs build mounts it, such as
    ``/vueda.workflow/workflows/{app_label}/{model}/object-state/{object_id}/``.
    """

    def check(response, path, method):
        operation = openapi_document["paths"][path][method.lower()]
        documented = operation["responses"][str(response.status_code)]
        schema = documented["content"]["application/json"]["schema"]
        errors = schema_errors(openapi_document, json.loads(response.content), schema)
        assert not errors, "\n".join(errors[:10])

    return check
