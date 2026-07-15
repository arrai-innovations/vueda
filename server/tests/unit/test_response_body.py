from pprint import pformat
from unittest.mock import MagicMock
from unittest.mock import PropertyMock

from tests.conftest import response_body


class TestResponseBody:
    def test_pformats_data_when_present(self):
        response = MagicMock()
        response.data = {"detail": "not found"}
        assert response_body(response) == pformat({"detail": "not found"})

    def test_prefers_data_over_json(self):
        response = MagicMock()
        response.data = {"from": "data"}
        response.json.return_value = {"from": "json"}
        assert response_body(response) == pformat({"from": "data"})

    def test_returns_traceback_string_as_is(self):
        response = MagicMock()
        response.data = "Traceback (most recent call last):\n  File 'x.py', line 1\nRuntimeError: boom"
        assert response_body(response) == response.data

    def test_pformats_non_traceback_string(self):
        response = MagicMock()
        response.data = "just a plain string"
        assert response_body(response) == pformat("just a plain string")

    def test_falls_back_to_json_when_no_data(self):
        response = MagicMock(spec=["json", "content", "status_code"])
        response.json.return_value = {"error": "bad request"}
        assert response_body(response) == {"error": "bad request"}

    def test_falls_back_to_content_when_json_raises(self):
        response = MagicMock(spec=["json", "content", "status_code"])
        response.json.side_effect = ValueError("No JSON")
        response.content = b"<html>Not Found</html>"
        assert response_body(response) == b"<html>Not Found</html>"

    def test_falls_back_to_content_when_json_attr_missing(self):
        response = MagicMock(spec=["content", "status_code"])
        response.content = b"plain text"
        assert response_body(response) == b"plain text"

    def test_data_can_be_none(self):
        response = MagicMock()
        type(response).data = PropertyMock(return_value=None)
        assert response_body(response) == pformat(None)
