"""The client multipart contract through request parsing and serializer validation."""

import json
from pathlib import Path
from typing import ClassVar

import pytest
from django.core.files.storage import FileSystemStorage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test.client import BOUNDARY
from django.test.client import MULTIPART_CONTENT
from django.test.client import encode_multipart
from django.urls import reverse
from rest_framework import serializers
from rest_framework.exceptions import ParseError
from rest_framework.parsers import JSONParser
from rest_framework.parsers import MultiPartParser
from rest_framework.test import APIRequestFactory

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.store.models import Invoice
from tests.store.models import InvoiceLine
from tests.store.serializers import InvoiceLineSerializer
from tests.store.serializers import InvoiceSerializer
from tests.store.viewsets import InvoiceViewSet
from vueda.core.viewsets import VuedaReadOnlyViewSet
from vueda.core.viewsets import VuedaViewSet


MANIFEST = "__vueda_multipart"
FIXTURES = json.loads((Path(__file__).parents[2] / "fixtures" / "multipart-save.json").read_text())


def upload(name="file.txt", content=b"file bytes"):
    return SimpleUploadedFile(name, content, "text/plain")


def request_for(fields, *, method="POST", view_class=VuedaViewSet):
    raw = APIRequestFactory().generic(method, "/", encode_multipart(BOUNDARY, fields), content_type=MULTIPART_CONTENT)
    view = view_class()
    view.action_map = {"post": "create", "put": "update", "patch": "partial_update"}
    request = view.initialize_request(raw)
    return request


def manifest(paths=None):
    return json.dumps({"version": 1, "files": paths or {}})


class ParentSerializer(serializers.Serializer):
    id = serializers.IntegerField()


class RowSerializer(serializers.Serializer):
    name = serializers.CharField(required=False)
    attachment = serializers.FileField(required=False)
    tags = serializers.ListField(child=serializers.CharField(), required=False)
    parent = ParentSerializer(required=False)
    note = serializers.CharField(required=False, allow_null=True)


class SaveSerializer(serializers.Serializer):
    items = RowSerializer(many=True, required=False)
    file = serializers.FileField(required=False)
    blob = serializers.FileField(required=False)
    active = serializers.BooleanField(required=False)
    count = serializers.IntegerField(required=False)
    empty_list = serializers.ListField(required=False)
    empty_object = serializers.DictField(required=False)
    empty_string = serializers.CharField(required=False, allow_blank=True)


@pytest.mark.parametrize("method", ["POST", "PUT", "PATCH"])
@pytest.mark.parametrize("fixture", FIXTURES, ids=lambda fixture: fixture["scenario"])
def test_shared_client_body_round_trips(fixture, method):
    fields = fixture["fields"] | {
        file["part"]: upload(file["name"], file["content"].encode()) for file in fixture["files"]
    }
    request = request_for(fields, method=method)
    try:
        serializer = SaveSerializer(data=request.data, partial=method == "PATCH")
        assert serializer.is_valid(), serializer.errors
        data = serializer.validated_data
        if fixture["scenario"] == "nested-file":
            assert data["items"][0]["name"] == "a"
            assert data["items"][0]["attachment"].read() == b"inline bytes"
            assert set(request.data) == {"items"}
        elif fixture["scenario"] == "blob":
            assert data["blob"].read() == b"blob bytes"
            assert data["blob"].content_type == "text/plain"
        else:
            assert data["file"].read() == b"parent bytes"
            assert data["items"] == [{"tags": ["x", "y"], "parent": {"id": 1}, "note": None}]
            assert data["active"] is False
            assert data["count"] == 0
            assert data["empty_list"] == []
            assert data["empty_object"] == {}
            assert data["empty_string"] == ""
        assert MANIFEST not in request.data
    finally:
        request.close()


@pytest.mark.parametrize("view_class", [VuedaViewSet, VuedaReadOnlyViewSet])
def test_nested_paths_preserve_literal_keys_and_file_ownership(view_class, settings, tmp_path):
    settings.FILE_UPLOAD_MAX_MEMORY_SIZE = 0
    settings.FILE_UPLOAD_TEMP_DIR = str(tmp_path)
    request = request_for(
        {
            "literal.key": '[{"[brackets]": [[null]]}]',
            "part": upload(),
            MANIFEST: manifest({"part": ["literal.key", 0, "[brackets]", 0, 0]}),
        },
        view_class=view_class,
    )
    data = request.data
    file = data["literal.key"][0]["[brackets]"][0][0]
    assert request.data is data
    assert request.FILES["part"] is file
    assert set(request.data) == {"literal.key"}
    assert file.read() == b"file bytes"
    temporary_path = Path(file.temporary_file_path())
    assert temporary_path.exists()
    request.close()
    assert file.closed
    assert not temporary_path.exists()


def test_legacy_multipart_keeps_drf_field_parsing():
    request = request_for({"file": upload(), "items[0]name": "a", "items[0]attachment": upload()})
    try:
        assert hasattr(request.data, "getlist")
        serializer = SaveSerializer(data=request.data)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["items"][0]["attachment"].read() == b"file bytes"
    finally:
        request.close()


@pytest.mark.parametrize(
    "fields, paths, message",
    [
        ({"part": "null"}, {"part": ["part"]}, "match the manifest"),
        ({"part": upload}, {}, "match the manifest"),
        ({"part": upload}, {"part": []}, "Invalid multipart file path"),
        ({"part": upload}, {"part": "part"}, "Invalid multipart file path"),
        ({"part": upload}, {"part": ["other"]}, "Conflicting multipart file path"),
        ({"part": upload, "items": "[null]"}, {"part": ["items", -1]}, "Missing multipart file placeholder"),
        ({"part": upload, "items": "[null]"}, {"part": ["items", 1]}, "Missing multipart file placeholder"),
        ({"part": upload, "items": "[null]"}, {"part": ["items", True]}, "Invalid multipart file path"),
        ({"part": upload, "items": "[null]"}, {"part": ["items", "0"]}, "Missing multipart file placeholder"),
        ({"part": upload, "items": '["value"]'}, {"part": ["items", 0]}, "Conflicting multipart file path"),
        ({"part": upload, "items": "null"}, {"part": ["items", "name"]}, "Missing multipart file placeholder"),
        ({"part": upload, "items": "{}"}, {"part": ["items", "missing"]}, "Missing multipart file placeholder"),
        (
            {"part": upload, "items": "[null]", "other": upload},
            {"part": ["items", 0], "other": ["items", 0]},
            "Conflicting multipart file path",
        ),
        ({"items": "not json"}, {}, "Invalid multipart JSON"),
        ({"items": "NaN"}, {}, "Invalid multipart JSON"),
        ({"items": '{"key":1,"key":2}'}, {}, "Invalid multipart JSON"),
        ({"items": ["[]", "[]"]}, {}, "Duplicate multipart field"),
    ],
)
def test_invalid_parts_fail_with_parse_error(fields, paths, message):
    request = request_for(
        {key: value() if callable(value) else value for key, value in fields.items()} | {MANIFEST: manifest(paths)}
    )
    with pytest.raises(ParseError, match=message):
        _ = request.data
    request.close()


@pytest.mark.parametrize(
    "value",
    [
        "bad",
        "[]",
        "null",
        '{"version":2,"files":{}}',
        '{"version":true,"files":{}}',
        '{"version":1,"files":[]}',
        '{"version":1,"files":{},"extra":1}',
        '{"version":1,"version":1,"files":{}}',
    ],
)
def test_invalid_manifest_closes_uploaded_files(value, settings, tmp_path):
    settings.FILE_UPLOAD_MAX_MEMORY_SIZE = 0
    settings.FILE_UPLOAD_TEMP_DIR = str(tmp_path)
    request = request_for({MANIFEST: value, "file": upload()})
    with pytest.raises(ParseError):
        _ = request.data
    assert list(tmp_path.iterdir()) == []
    request.close()


def test_duplicate_or_uploaded_manifest_is_rejected():
    for value in ([manifest(), manifest()], upload()):
        request = request_for({MANIFEST: value})
        with pytest.raises(ParseError, match="one multipart manifest"):
            _ = request.data
        request.close()


def test_duplicate_files_or_json_and_file_with_same_name_are_rejected():
    for fields in (
        {"file": [upload(), upload()], MANIFEST: manifest({"file": ["file"]})},
        {"file": ["null", upload()], MANIFEST: manifest({"file": ["file"]})},
    ):
        request = request_for(fields)
        with pytest.raises(ParseError):
            _ = request.data
        request.close()


def test_custom_parser_configuration_is_respected():
    class CustomMultipartParser(MultiPartParser):
        pass

    class CustomView(VuedaViewSet):
        parser_classes = [JSONParser, CustomMultipartParser]

    assert [type(parser) for parser in CustomView().get_parsers()] == [JSONParser, CustomMultipartParser]


def test_json_requests_and_viewset_action_are_preserved():
    raw = APIRequestFactory().patch("/", {"items": [], "note": None}, format="json")
    view = VuedaViewSet()
    view.action_map = {"patch": "partial_update"}
    request = view.initialize_request(raw)
    assert view.action == "partial_update"
    assert request.data == {"items": [], "note": None}


@pytest.mark.django_db
class TestMultipartNestedSaves(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Invoice Writer": [("store", "Invoice", "create"), ("store", "Invoice", "update")],
    }
    users_to_create: ClassVar[dict] = {
        "multipart@domain.invalid": {
            "name": "Invoice Writer",
            "password": "testpass",
            "groups": ["Invoice Writer"],
        },
    }

    @pytest.mark.parametrize("method", ["post", "put", "patch"])
    def test_nested_file_reaches_save_with_other_values_intact(self, method, api_client, monkeypatch, tmp_path):
        # The test invoice model has no file column. This consuming-app serializer
        # saves the upload to storage and records its extra validated values, while
        # VUEDA and drf-writable-nested perform the real parent and child DB writes.
        storage = FileSystemStorage(location=tmp_path)
        saved = []

        class UploadLineSerializer(InvoiceLineSerializer):
            attachment = serializers.FileField(write_only=True)
            tags = serializers.ListField(child=serializers.CharField(), write_only=True)
            parent = serializers.DictField(write_only=True)
            note = serializers.CharField(allow_null=True, write_only=True)

            class Meta(InvoiceLineSerializer.Meta):
                fields = [*InvoiceLineSerializer.Meta.fields, "attachment", "tags", "parent", "note"]

            def take_upload(self, validated_data):
                attachment = validated_data.pop("attachment")
                saved.append(
                    {
                        "filename": storage.save(attachment.name, attachment),
                        **{key: validated_data.pop(key) for key in ("tags", "parent", "note")},
                    }
                )

            def create(self, validated_data):
                self.take_upload(validated_data)
                return super().create(validated_data)

            def update(self, instance, validated_data):
                self.take_upload(validated_data)
                return super().update(instance, validated_data)

        class UploadInvoiceSerializer(InvoiceSerializer):
            invoice_lines = UploadLineSerializer(many=True)

        monkeypatch.setattr(InvoiceViewSet, "serializer_class", UploadInvoiceSerializer)
        api_client.force_authenticate(user=self.users["multipart@domain.invalid"])
        row = {
            "name": "Line",
            "amount": "12.00",
            "attachment": None,
            "tags": ["x", "y"],
            "parent": {"id": 1},
            "note": None,
        }
        if method == "post":
            url = reverse("store.invoice-list")
        else:
            invoice = Invoice.objects.create(name="Old invoice")
            line = InvoiceLine.objects.create(invoice=invoice, name="Old line", amount="1.00")
            row["id"] = line.pk
            url = reverse("store.invoice-detail", kwargs={"pk": invoice.pk})
        response = getattr(api_client, method)(
            url,
            {
                "name": json.dumps("Invoice"),
                "invoice_lines": json.dumps([row]),
                "__vueda_file_0": upload(),
                MANIFEST: manifest({"__vueda_file_0": ["invoice_lines", 0, "attachment"]}),
            },
            format="multipart",
        )
        assert response.status_code == (201 if method == "post" else 200), response_body(response)
        assert saved == [{"filename": "file.txt", "tags": ["x", "y"], "parent": {"id": 1}, "note": None}]
        assert (tmp_path / "file.txt").read_bytes() == b"file bytes"
        invoice = Invoice.objects.get(name="Invoice")
        assert list(invoice.invoice_lines.values_list("name", "amount")) == [("Line", 12)]
