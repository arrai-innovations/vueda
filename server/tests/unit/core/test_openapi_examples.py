from tests.unit.conftest import schema_errors


def test_examples_match_their_schema(openapi_document):
    failures = []
    for path, operations in openapi_document["paths"].items():
        if not path.startswith(("/vueda.info/", "/vueda.workflow/")):
            continue
        for method, operation in operations.items():
            if not isinstance(operation, dict):
                continue
            bodies = [("request", operation.get("requestBody", {}))]
            bodies += list(operation.get("responses", {}).items())
            for where, body in bodies:
                content = body.get("content", {}).get("application/json", {})
                for name, example in content.get("examples", {}).items():
                    for error in schema_errors(openapi_document, example["value"], content["schema"]):
                        failures.append(f"{method.upper()} {path} {where} {name} {error}")
    assert not failures, "\n".join(failures[:20])
