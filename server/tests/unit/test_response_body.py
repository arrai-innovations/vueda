import io
from http import HTTPStatus
from pprint import pformat
from unittest.mock import MagicMock
from unittest.mock import PropertyMock

from django.http import FileResponse
from django.http import StreamingHttpResponse

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

    def test_describes_a_file_response_without_reading_it(self):
        stream = io.BytesIO(b"file payload")
        response = FileResponse(stream, content_type="text/plain")
        try:
            assert response_body(response) == (
                "<FileResponse status_code=200 content_type='text/plain', streaming content not read>"
            )
            # The stream is still where it started, and still open, for whoever handles it next.
            assert stream.tell() == 0
            assert not stream.closed
        finally:
            response.close()

    def test_describes_a_streaming_response_without_advancing_it(self):
        chunks_read = []

        def chunks():
            chunks_read.append("first")
            yield b"first"

        response = StreamingHttpResponse(chunks(), status=HTTPStatus.ACCEPTED, content_type="text/csv")
        try:
            assert response_body(response) == (
                "<StreamingHttpResponse status_code=202 content_type='text/csv', streaming content not read>"
            )
            assert chunks_read == []
        finally:
            response.close()
