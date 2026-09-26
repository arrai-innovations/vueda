from tests.unit.info.conftest import schema_errors


def test_info_endpoint_examples_match_their_response_schema(openapi_document):
    failures = []
    for path, operations in openapi_document["paths"].items():
        if not path.startswith("/vueda.info/"):
            continue
        for method, operation in operations.items():
            for status, response in operation.get("responses", {}).items():
                content = response.get("content", {}).get("application/json", {})
                for name, example in content.get("examples", {}).items():
                    for error in schema_errors(openapi_document, example["value"], content["schema"]):
                        failures.append(f"{method.upper()} {path} {status} {name} {error}")
    assert not failures, "\n".join(failures[:20])
