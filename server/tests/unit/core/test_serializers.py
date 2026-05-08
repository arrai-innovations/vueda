from datetime import date
from typing import ClassVar

import pytest
from django.conf import settings
from django.test import override_settings
from rest_framework.exceptions import ValidationError

from tests.conftest import BaseTestAssertResponseMixin
from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.models import Employee
from tests.models import Timesheet
from tests.serializers import TimesheetSerializer
from tests.serializers import TimesheetSerializerExclude
from tests.store import serializers as store_serializers
from tests.store import viewsets as store_viewsets
from tests.unit.info.test_model_info import VuedaTestData
from tests.utils import FakeRequest
from tests.utils import FakeView
from vueda import info
from vueda.core.serializers import PrimaryKeyListSerializer
from vueda.core.viewsets import get_recursive_expands_and_fields


@pytest.mark.django_db
class TestValidateFlexExpandsAndFields(BaseTestAssertResponseMixin):
    @pytest.fixture
    def test_data(self):
        return VuedaTestData()

    @staticmethod
    def register_viewsets():
        info.registration.get_empty_registry()
        info.register(store_serializers.CustomerSerializer, store_viewsets.CustomerViewSet)
        info.register(store_serializers.ProductSerializer, store_viewsets.ProductViewSet)
        info.register(store_serializers.OptionTypeSerializer, store_viewsets.OptionTypeViewSet)
        info.register(store_serializers.ProductOptionSerializer, store_viewsets.ProductOptionViewSet)
        info.register(store_serializers.CustomerOrderSerializer, store_viewsets.CustomerOrderViewSet)
        info.register_serializer(store_serializers.OrderItemSerializer)

    @override_settings(
        REST_FLEX_FIELDS={
            "EXPAND_PARAM": "e",
            "FIELDS_PARAM": "f",
            "OMIT_PARAM": "om",
            "MAXIMUM_EXPANSION_DEPTH": 2,
        },
    )
    def test_limits_depth_to_default(self, api_client, test_data):
        serializer = store_serializers.CustomerOrderSerializer()
        valid_expands, valid_wildcard_expands, valid_fields, valid_wildcard_fields = get_recursive_expands_and_fields(
            serializer, 0, 10
        )

        actual_depth = (
            max(
                [field.count(".") for field in valid_expands]
                + [field.count(".") for field in valid_wildcard_expands]
                + [field.count(".") for field in valid_fields]
                + [field.count(".") for field in valid_wildcard_fields]
            )
            + 1
        )

        assert actual_depth == 2  # noqa PLR2004

    def test_valid_expands_and_fields_two_deep(self, api_client, test_data):
        serializer = store_serializers.CustomerOrderSerializer()
        valid_expands, valid_wildcard_expands, valid_fields, valid_wildcard_fields = get_recursive_expands_and_fields(
            serializer, 0, 2
        )

        assert valid_expands == {
            "customer",
            "customer.dict_data",
            "customer.first_history_entry",
            "customer.history",
            "customer.last_history_entry",
            "customer.single_value",
            "customer.user",
            "first_history_entry",
            "history",
            "last_history_entry",
            "order_items",
            "order_items.customer_order",
            "order_items.product_option",
            "order_state",
        }

        assert valid_wildcard_expands == {
            "*",
            "~all",
            "customer.*",
            "customer.~all",
            "order_items.*",
            "order_items.~all",
            "order_state.*",
            "order_state.~all",
        }

        assert valid_fields == {
            "available_actions",
            "current_history_id",
            "customer",
            "customer.dict_data",
            "customer.first_history_entry",
            "customer.formatted_name",
            "customer.history",
            "customer.id",
            "customer.last_history_entry",
            "customer.single_value",
            "customer.user",
            "first_history_entry",
            "formatted_name",
            "history",
            "id",
            "last_history_entry",
            "order_items",
            "order_items.customer_order",
            "order_items.formatted_name",
            "order_items.id",
            "order_items.product_option",
            "order_items.quantity",
            "order_number",
            "order_state",
            "order_state.id",
            "order_state.code",
            "order_state.name",
            "shipping_method",
            "valid_transitions",
            "when",
            "workflow_state_code",
            "workflow_state_name",
        }

        assert valid_wildcard_fields == {
            "*",
            "~all",
            "customer.*",
            "customer.~all",
            "order_items.*",
            "order_items.~all",
            "order_state.*",
            "order_state.~all",
        }

    def test_valid_expands_and_fields_three_deep(self, api_client, test_data):
        serializer = store_serializers.CustomerOrderSerializer()
        valid_expands, valid_wildcard_expands, valid_fields, valid_wildcard_fields = get_recursive_expands_and_fields(
            serializer, 0, 3
        )

        assert valid_expands == {
            "customer",
            "customer.dict_data",
            "customer.first_history_entry",
            "customer.history",
            "customer.last_history_entry",
            "customer.single_value",
            "customer.user",
            "customer.user.groups",
            "first_history_entry",
            "history",
            "last_history_entry",
            "order_items",
            "order_items.customer_order",
            "order_items.customer_order.customer",
            "order_items.customer_order.first_history_entry",
            "order_items.customer_order.history",
            "order_items.customer_order.last_history_entry",
            "order_items.customer_order.order_items",
            "order_items.customer_order.order_state",
            "order_items.product_option",
            "order_items.product_option.first_history_entry",
            "order_items.product_option.history",
            "order_items.product_option.last_history_entry",
            "order_items.product_option.option_type",
            "order_items.product_option.product",
            "order_state",
        }

        assert valid_wildcard_expands == {
            "*",
            "~all",
            "customer.*",
            "customer.~all",
            "customer.user.*",
            "customer.user.~all",
            "order_items.*",
            "order_items.~all",
            "order_items.customer_order.*",
            "order_items.customer_order.~all",
            "order_items.product_option.*",
            "order_items.product_option.~all",
            "order_state.*",
            "order_state.~all",
        }

        assert valid_fields == {
            "available_actions",
            "current_history_id",
            "customer",
            "customer.dict_data",
            "customer.first_history_entry",
            "customer.formatted_name",
            "customer.history",
            "customer.id",
            "customer.last_history_entry",
            "customer.single_value",
            "customer.user",
            "customer.user.email",
            "customer.user.groups",
            "customer.user.id",
            "customer.user.name",
            "first_history_entry",
            "formatted_name",
            "history",
            "id",
            "last_history_entry",
            "order_items",
            "order_items.customer_order",
            "order_items.customer_order.customer",
            "order_items.customer_order.first_history_entry",
            "order_items.customer_order.history",
            "order_items.customer_order.id",
            "order_items.customer_order.last_history_entry",
            "order_items.customer_order.order_items",
            "order_items.customer_order.order_number",
            "order_items.customer_order.order_state",
            "order_items.customer_order.when",
            "order_items.id",
            "order_items.formatted_name",
            "order_items.product_option",
            "order_items.product_option.disabled",
            "order_items.product_option.first_history_entry",
            "order_items.product_option.gtin",
            "order_items.product_option.history",
            "order_items.product_option.id",
            "order_items.product_option.last_history_entry",
            "order_items.product_option.name",
            "order_items.product_option.option_type",
            "order_items.product_option.price",
            "order_items.product_option.product",
            "order_items.product_option.sku",
            "order_items.quantity",
            "order_number",
            "order_state",
            "order_state.id",
            "order_state.code",
            "order_state.name",
            "shipping_method",
            "valid_transitions",
            "when",
            "workflow_state_code",
            "workflow_state_name",
        }

        assert valid_wildcard_fields == {
            "*",
            "~all",
            "customer.*",
            "customer.~all",
            "customer.user.*",
            "customer.user.~all",
            "order_items.*",
            "order_items.~all",
            "order_items.customer_order.*",
            "order_items.customer_order.~all",
            "order_items.product_option.*",
            "order_items.product_option.~all",
            "order_state.*",
            "order_state.~all",
        }


@pytest.mark.django_db
class TestNoExtraFieldsSerializerMixinDirectly(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Timesheet Updater": [
            ("tests", "Timesheet", "update"),
        ]
    }

    users_to_create: ClassVar[dict] = {
        "test_my_user@example.com": {
            "name": "Test User update",
            "password": "testpass",
            "groups": ["Timesheet Updater"],
        },
    }

    @pytest.fixture
    def employee(self):
        return Employee.objects.create(
            user=self.users["test_my_user@example.com"],
            employee_number="abcd-1234",
        )

    @pytest.fixture
    def valid_timesheet_data(self):
        return {
            "id": 1,
            "employee": 1,
            "period_start": date(2024, 2, 15),
            "period_end": date(2024, 2, 29),
        }

    def test_flex_fields_with_valid_field_param(self, employee, valid_timesheet_data):
        put_data = {
            "period_start": "2024-02-16",
            "period_end": "2024-02-28",
        }

        context = {
            "request": FakeRequest(
                {settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: ["period_start", "period_end"]}, put_data, "PUT"
            )
        }

        t = Timesheet.objects.create(
            **{
                **valid_timesheet_data,
                "employee": employee,
            }
        )

        context["view"] = FakeView(context["request"], TimesheetSerializer, queryset=Timesheet.objects.filter(pk=t.id))

        # simulate an update as if it was done through the view with flex fields
        serializer = TimesheetSerializer(instance=t, data=put_data, context=context)

        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError as e:
            pytest.fail(f"Serializer is not valid: {e}")
        serializer.save()

        assert serializer.data["period_start"] == "2024-02-16"
        assert serializer.data["period_end"] == "2024-02-28"
        assert "employee" not in serializer.data

    def test_flex_fields_with_invalid_field_param(self, employee, valid_timesheet_data):
        put_data = {
            "period_start": "2024-02-16",
            "period_end": "2024-02-28",
            "invalid_field_name": "invalid_value",
        }
        context = {
            "request": FakeRequest(
                {settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: ["period_start", "invalid_field_name"]}, put_data, "PUT"
            )
        }
        context["view"] = FakeView(context["request"], TimesheetSerializer)
        t = Timesheet.objects.create(
            **{
                **valid_timesheet_data,
                "employee": employee,
            }
        )

        # simulate an update as if it was done through the view with flex fields
        serializer = TimesheetSerializer(instance=t, data=put_data, context=context)

        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError as e:
            assert "period_end" in e.detail
            assert e.detail["period_end"][0].code == "invalid"
            assert "invalid_field_name" in e.detail
            assert e.detail["invalid_field_name"][0].code == "invalid"
        else:
            pytest.fail("Serializer is valid when it should not be")

    def test_flex_fields_with_valid_expand_param(self, employee, valid_timesheet_data):
        put_data = {
            "employee": {"id": employee.pk, "user": employee.user.pk, "employee_number": "abcd-12345"},
            "period_start": "2024-02-16",
            "period_end": "2024-02-28",
        }

        context = {
            "request": FakeRequest({settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: ["employee", "foo"]}, put_data, "PUT")
        }

        t = Timesheet.objects.create(
            **{
                **valid_timesheet_data,
                "employee": employee,
            }
        )
        context["view"] = FakeView(context["request"], TimesheetSerializer, queryset=Timesheet.objects.filter(pk=t.id))

        # simulate an update as if it was done through the view with flex fields
        serializer = TimesheetSerializer(instance=t, data=put_data, context=context)

        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError as e:
            pytest.fail(f"Serializer is not valid: {e}")
        serializer.save()

        assert serializer.data["period_start"] == "2024-02-16"
        assert serializer.data["period_end"] == "2024-02-28"
        assert "employee" in serializer.data
        assert "foo" in serializer.data

    def test_flex_fields_with_invalid_expand_param(self, employee, valid_timesheet_data):
        put_data = {
            "employee": {"id": employee.pk, "user": employee.user.pk, "employee_number": "abcd-12345"},
            "period_start": "2024-02-16",
            "period_end": "2024-02-28",
        }
        context = {
            "request": FakeRequest({settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: ["foo", "label10"]}, put_data, "PUT")
        }

        context["view"] = FakeView(context["request"], TimesheetSerializer)
        t = Timesheet.objects.create(
            **{
                **valid_timesheet_data,
                "employee": employee,
            }
        )

        # simulate an update as if it was done through the view with flex fields
        serializer = TimesheetSerializer(instance=t, data=put_data, context=context)

        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError as e:
            assert "employee" in e.detail
            assert e.detail["employee"][0].code == "incorrect_type"  # not expanded, expected a pk
        else:
            pytest.fail("Serializer is valid when it should not be")

        # you won't get all the errors at once due to the incorrect_type happening before validate.
        # fix the employee to the correct type and check that label10 is complained about
        put_data["employee"] = employee.pk
        serializer = TimesheetSerializer(instance=t, data=put_data, context=context)

        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError as e:
            assert "label10" in e.detail
            assert e.detail["label10"][0].code == "invalid"
        else:
            pytest.fail("Serializer is valid when it should not be")


@pytest.mark.django_db
class TestExcludeFieldsSerializerMixinDirectly(BaseTestAssertResponseMixin, BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Timesheet Updater": [
            ("tests", "Timesheet", "update"),
        ]
    }

    users_to_create: ClassVar[dict] = {
        "test_my_user@example.com": {
            "name": "Test User update",
            "password": "testpass",
            "groups": ["Timesheet Updater"],
        },
        "test_my_user2@example.com": {
            "name": "Test User update",
            "password": "testpass2",
            "groups": ["Timesheet Updater"],
        },
    }

    @pytest.fixture
    def employee(self):
        return Employee.objects.create(
            user=self.users["test_my_user@example.com"],
            employee_number="abcd-1234",
        )

    @pytest.fixture
    def employee2(self):
        return Employee.objects.create(
            user=self.users["test_my_user2@example.com"],
            employee_number="abcd-234",
        )

    # This tests the validity of the serializer as well
    def test_exclude_update_field(self, employee):
        t = Timesheet.objects.create(
            period_start=date(2024, 2, 15),
            period_end=date(2024, 2, 29),
            employee=employee,
        )
        put_data = {
            "period_start": "2024-02-16",
            "period_end": "2024-02-28",
        }

        request = FakeRequest(data=put_data, method="PUT")
        context = {
            "request": request,
            "view": FakeView(request, TimesheetSerializerExclude, "update", queryset=Timesheet.objects.filter(pk=t.id)),
        }

        serializer = TimesheetSerializerExclude(instance=t, data=put_data, context=context)

        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError as e:
            pytest.fail(f"Serializer is not valid: {e}")
        serializer.save()

        assert serializer.data["period_start"] == "2024-02-16"
        assert serializer.data["period_end"] == "2024-02-28"
        assert (serializer.get_extra_kwargs()["employee"])["read_only"] is True

    def test_exclude_create_field(self, employee):
        post_data = {
            "period_start": "2024-03-01",
            "period_end": "2024-03-15",
            "employee": f"{employee.pk}",
            "supervisor": f"{employee.pk}",
        }

        def get_queryset():
            # We can't pass in the supervisor, because it becomes None, not a number.
            timesheet = Timesheet.objects.get(
                period_start="2024-03-01",
                period_end="2024-03-15",
                employee=f"{employee.pk}",
            )
            return Timesheet.objects.filter(pk=timesheet.pk)

        request = FakeRequest(data=post_data, method="POST")
        context = {
            "request": request,
            "view": FakeView(request, TimesheetSerializerExclude, "create", queryset=get_queryset),
        }
        serializer = TimesheetSerializerExclude(data=post_data, context=context)

        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError as e:
            pytest.fail(f"Serializer is not valid: {e}")
        obj = serializer.save()
        assert obj.supervisor is None

    def test_exclude_partial_update_fields(self, employee, employee2):
        t = Timesheet.objects.create(
            period_start=date(2024, 2, 15),
            period_end=date(2024, 2, 29),
            employee=employee,
        )
        patch_data = {
            "period_start": "2024-02-05",
            "employee": f"{employee2.pk}",
        }

        request = FakeRequest(data=patch_data, method="PATCH")
        context = {
            "request": request,
            "view": FakeView(
                request, TimesheetSerializerExclude, "partial_update", queryset=Timesheet.objects.filter(pk=t.id)
            ),
        }
        # "partial = True" must be passed in the serializer to make the serializer partial
        serializer = TimesheetSerializerExclude(instance=t, data=patch_data, context=context, partial=True)

        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError as e:
            pytest.fail(f"Serializer is not valid: {e}")
        obj = serializer.save()

        assert obj.period_start == date(2024, 2, 5)
        assert obj.period_end == date(2024, 2, 29)
        assert obj.employee == employee


@pytest.mark.django_db
class TestFlexFieldsWriteableNestedSerializerInitialData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Timesheet Updater": [
            ("tests", "Timesheet", "update"),
        ]
    }

    users_to_create: ClassVar[dict] = {
        "test_nested_initial_data@example.com": {
            "name": "Test Nested Initial Data User",
            "password": "testpass",
            "groups": ["Timesheet Updater"],
        },
    }

    @pytest.fixture
    def employee(self):
        return Employee.objects.create(
            user=self.users["test_nested_initial_data@example.com"],
            employee_number="nested-12345",
        )

    def test_initial_data_propagated_to_nested_serializer(self, employee):
        timesheet = Timesheet.objects.create(
            employee=employee,
            period_start=date(2024, 2, 15),
            period_end=date(2024, 2, 29),
        )
        employee_data = {"id": employee.pk, "user": employee.user.pk, "employee_number": "nested-12345"}
        data = {
            "employee": employee_data,
            "period_start": "2024-02-16",
            "period_end": "2024-02-28",
        }

        context = {"request": FakeRequest({settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: ["employee"]}, data, "PUT")}
        context["view"] = FakeView(
            context["request"], TimesheetSerializer, queryset=Timesheet.objects.filter(pk=timesheet.pk)
        )

        serializer = TimesheetSerializer(instance=timesheet, data=data, context=context)
        serializer.is_valid(raise_exception=True)

        # to_internal_value should have propagated initial_data from the main serializer
        # down to the nested EmployeeSerializer field
        assert serializer.fields["employee"].initial_data == employee_data


class TestPrimaryKeyListSerializer:
    def test_valid_pk_list(self):
        serializer = PrimaryKeyListSerializer(data={"pks": [1, 2, 3]})

        assert serializer.is_valid()
        assert serializer.validated_data["pks"] == [1, 2, 3]

    def test_rejects_non_integer_values(self):
        serializer = PrimaryKeyListSerializer(data={"pks": [1, "abc"]})

        assert not serializer.is_valid()
        assert serializer.errors["pks"][1][0] == "Primary keys must be valid integers."

    def test_requires_list_input(self):
        serializer = PrimaryKeyListSerializer(data={"pks": "1"})

        assert not serializer.is_valid()
        assert serializer.errors["pks"][0] == "pks must be a list of primary keys."

    def test_requires_data(self):
        serializer = PrimaryKeyListSerializer(data={"pks": []})

        assert not serializer.is_valid()
        assert serializer.errors["pks"][0] == "pks list cannot be empty."
