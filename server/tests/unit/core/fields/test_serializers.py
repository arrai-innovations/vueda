from datetime import timedelta
from unittest.mock import MagicMock

import pytest
from django.contrib.contenttypes.models import ContentType
from django.contrib.postgres.fields.ranges import Range
from rest_framework.exceptions import ErrorDetail
from rest_framework.exceptions import ValidationError

from vueda.core.fields import serializers as core_fields_serializers


@pytest.mark.django_db
class TestContentTypeField:
    def setup_method(self):
        self.field = core_fields_serializers.ContentTypeField(queryset=ContentType.objects.all())

    def test_to_representation(self):
        content_type = ContentType.objects.get(app_label="store", model="storehours")
        expected_output = "store/storehours"
        assert self.field.to_representation(content_type) == expected_output

    def test_to_internal_value_valid(self):
        input_data = "store/storehours"
        content_type = self.field.to_internal_value(input_data)
        assert content_type.app_label == "store"
        assert content_type.model == "storehours"

    def test_to_internal_value_invalid_format(self):
        input_data = "invalidformat"
        with pytest.raises(ValidationError, match="Invalid value."):
            self.field.to_internal_value(input_data)

    def test_to_internal_value_nonexistent(self):
        input_data = "nonexistent/model"
        with pytest.raises(
            ValidationError, match="ContentType with nonexistent/model does not exist or is not allowed."
        ):
            self.field.to_internal_value(input_data)


class TestDurationSecondsField:
    def setup_method(self):
        self.field = core_fields_serializers.DurationSecondsField()

    def test_to_internal_value_valid(self):
        input_data = "3600"  # 1 hour in seconds
        expected_output = timedelta(hours=1)
        assert self.field.to_internal_value(input_data) == expected_output

    def test_to_internal_value_invalid(self):
        input_data = "invalid"
        with pytest.raises(ValidationError, match="Duration must be an integer number of seconds."):
            self.field.to_internal_value(input_data)

    def test_to_representation(self):
        input_data = timedelta(hours=1)
        expected_output = 3600  # 1 hour in seconds
        assert self.field.to_representation(input_data) == expected_output


class TestRangeField:
    def setup_method(self):
        self.field = core_fields_serializers.RangeField()

    def test_to_internal_value_valid(self):
        input_data = {"lower": 12, "upper": 13}
        expected_output = Range(lower=12, upper=13)
        assert self.field.to_internal_value(input_data) == expected_output

    def test_to_internal_value_missing_data(self):
        input_data = {"start_time": "09:00"}
        with pytest.raises(ValidationError) as exc_info:
            self.field.to_internal_value(input_data)
        assert exc_info.value.detail == [ErrorDetail(string="Invalid data for RangeField", code="invalid")]

    def test_to_representation(self):
        input_data = Range(lower=9, upper=17)
        expected_output = {"lower": 9, "upper": 17}
        assert self.field.to_representation(input_data) == expected_output


class TestFileField:
    def setup_method(self):
        self.field = core_fields_serializers.FileField()

    def test_to_representation(self):
        # Create a mock file object
        mock_file = MagicMock()
        mock_file.name = "test_file.txt"
        mock_file.url = "/media/test_file.txt"

        # Test without request in context
        result = self.field.to_representation(mock_file)
        expected_output = {"name": "test_file.txt", "url": "/media/test_file.txt"}
        assert result == expected_output

    def test_to_representation_without_url(self):
        # Create a mock file object with no URL
        mock_file = MagicMock()
        mock_file.name = "test_file.txt"
        mock_file.url = None

        # Test when file.url is not available
        result = self.field.to_representation(mock_file)
        expected_output = {"name": "test_file.txt", "url": None}
        assert result == expected_output

    def test_to_representation_no_file(self):
        # Test when no file is provided
        result = self.field.to_representation(None)
        assert result is None
