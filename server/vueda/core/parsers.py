"""Multipart object saves with JSON values and files at explicit paths."""

__all__ = ("NestedMultipartMixin",)

from django.utils.datastructures import MultiValueDict
from rest_framework.exceptions import ParseError
from rest_framework.parsers import DataAndFiles
from rest_framework.parsers import MultiPartParser
from rest_framework.request import Request
from rest_framework.utils import json


_MANIFEST = "__vueda_multipart"


class _MultipartData(dict):
    """Mark data whose uploaded files already occupy their final nested paths."""


def _unique_object(pairs: list) -> dict:
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"Duplicate JSON key {key!r}.")
        result[key] = value
    return result


def _load_json(value: str, field: str):
    try:
        return json.loads(value, object_pairs_hook=_unique_object)
    except (ValueError, RecursionError) as error:
        raise ParseError(f"Invalid multipart JSON in {field!r}.") from error


def _restore_files(data: dict, files: MultiValueDict, paths: dict) -> None:
    if set(files) != set(paths):
        raise ParseError("Multipart file parts must match the manifest exactly.")
    for part, path in paths.items():
        if (
            part == _MANIFEST
            or not isinstance(path, list)
            or not path
            or not isinstance(path[0], str)
            or any(type(key) not in (str, int) for key in path)
            or len(files.getlist(part)) != 1
        ):
            raise ParseError(f"Invalid multipart file path for {part!r}.")
        if len(path) == 1:
            if path[0] != part or part in data:
                raise ParseError(f"Conflicting multipart file path {path!r}.")
            data[part] = files[part]
            continue
        if part in data:
            raise ParseError(f"Multipart part {part!r} contains both JSON and a file.")
        container = data
        for index, key in enumerate(path):
            if isinstance(container, dict):
                valid = isinstance(key, str) and key in container
            elif isinstance(container, list):
                valid = type(key) is int and 0 <= key < len(container)
            else:
                valid = False
            if not valid:
                raise ParseError(f"Missing multipart file placeholder at {path!r}.")
            if index == len(path) - 1:
                if container[key] is not None:
                    raise ParseError(f"Conflicting multipart file path {path!r}.")
                container[key] = files[part]
            else:
                container = container[key]


class _NestedMultipartParser(MultiPartParser):
    def parse(self, stream, media_type=None, parser_context=None):
        parsed = super().parse(stream, media_type, parser_context)
        if _MANIFEST not in parsed.data and _MANIFEST not in parsed.files:
            return parsed
        try:
            if _MANIFEST in parsed.files or len(parsed.data.getlist(_MANIFEST)) != 1:
                raise ParseError("Expected one multipart manifest text field.")
            manifest = _load_json(parsed.data[_MANIFEST], _MANIFEST)
            if (
                not isinstance(manifest, dict)
                or set(manifest) != {"version", "files"}
                or type(manifest["version"]) is not int
                or manifest["version"] != 1
                or not isinstance(manifest["files"], dict)
            ):
                raise ParseError("Invalid multipart manifest; expected version 1 and file paths.")
            data = _MultipartData()
            for field, values in parsed.data.lists():
                if len(values) != 1:
                    raise ParseError(f"Duplicate multipart field {field!r}.")
                if field != _MANIFEST:
                    data[field] = _load_json(values[0], field)
            _restore_files(data, parsed.files, manifest["files"])
            return DataAndFiles(data, parsed.files)
        except Exception:
            # DRF replaces files with an empty mapping when parsing fails. Close
            # the uploads here, including files spooled to disk by Django.
            for uploads in parsed.files.lists():
                for upload in uploads[1]:
                    upload.close()
            raise


class _MultipartRequest(Request):
    def _load_data_and_files(self):
        super()._load_data_and_files()
        if isinstance(self._data, _MultipartData):
            # DRF normally merges flat file part names into request.data. These
            # files already have their nested positions. Keep request.FILES and
            # Django's file ownership intact for request.close().
            self._full_data = self._data
            self._request._post = self._data


class NestedMultipartMixin:
    """Accept object saves with JSON multipart fields and a file-path manifest.

    Replace DRF's standard multipart parser while retaining other configured
    parsers. Requests without a manifest keep DRF's existing form behavior.
    Place this mixin before a DRF view or viewset in its inheritance list.
    """

    def get_parsers(self):
        """Use the nested parser wherever the standard multipart parser is enabled."""
        return [
            _NestedMultipartParser() if type(parser) is MultiPartParser else parser for parser in super().get_parsers()
        ]

    def initialize_request(self, request, *args, **kwargs):
        """Keep decoded data separate from the flat uploads that Django must close."""
        request = super().initialize_request(request, *args, **kwargs)
        return _MultipartRequest(
            request._request,
            parsers=request.parsers,
            authenticators=request.authenticators,
            negotiator=request.negotiator,
            parser_context=dict(request.parser_context),
        )
