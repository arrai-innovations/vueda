import datetime
from collections import defaultdict
from decimal import Decimal
from pprint import pformat

import pytest
from django.conf import settings
from rest_framework.reverse import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.erring.models import NoExpandableFieldsData
from tests.erring.serializers import NoExpandableFieldsDataSerializer
from tests.erring.viewsets import NoExpandableFieldsDataViewSet
from tests.store.models import Cart
from tests.store.models import CartItem
from tests.store.models import Customer
from tests.store.models import CustomerOrder
from tests.store.models import Distributor
from tests.store.models import InventoryRecord
from tests.store.models import InventoryRecordReason
from tests.store.models import OptionType
from tests.store.models import OrderItem
from tests.store.models import OrderState
from tests.store.models import Product
from tests.store.models import ProductOption
from tests.store.serializers import CartItemSerializer
from tests.store.serializers import CartSerializer
from tests.store.serializers import CustomerOrderSerializer
from tests.store.serializers import CustomerSerializer
from tests.store.serializers import DistributorSerializer
from tests.store.serializers import InventoryRecordReasonSerializer
from tests.store.serializers import InventoryRecordSerializer
from tests.store.serializers import OptionTypeSerializer
from tests.store.serializers import OrderItemSerializer
from tests.store.serializers import ProductOptionSerializer
from tests.store.serializers import ProductSerializer
from tests.store.viewsets import CartItemViewSet
from tests.store.viewsets import CartViewSet
from tests.store.viewsets import CustomerOrderViewSet
from tests.store.viewsets import CustomerViewSet
from tests.store.viewsets import DistributorViewSet
from tests.store.viewsets import InventoryRecordReasonViewSet
from tests.store.viewsets import InventoryRecordViewSet
from tests.store.viewsets import OptionTypeViewSet
from tests.store.viewsets import OrderItemViewSet
from tests.store.viewsets import ProductOptionViewSet
from tests.store.viewsets import ProductViewSet
from vueda import info


DETAIL_PARAMETRIZE = [
    (
        "store",
        "distributor",
        {
            "verbose_name": "distributor",
            "verbose_name_plural": "distributors",
            "expected_actions": {
                "list",
                "retrieve",
                "create",
                "update",
                "partial_update",
                "destroy",
                "current",
                "bulk-delete",
            },
            "expected_expands": [
                {
                    "name": "first_history_entry",
                    "content_type": None,
                    "many": False,
                    "read_only": True,
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                        "pk": "history_id",
                        "id": {
                            "label": "ID",
                            "type": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "name": {
                            "label": "Name",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "max_length": 255,
                            "choices": False,
                        },
                        "history_id": {
                            "label": "History ID",
                            "type": "IntegerField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_date": {
                            "label": "History Date",
                            "type": "DateTimeField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_change_reason": {
                            "label": "Change Reason",
                            "type": "CharField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_type": {
                            "label": "History Type",
                            "type": "CharField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_relation": {
                            "label": "In Relation To",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_user": {
                            "label": "History User",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                    },
                },
                {
                    "name": "history",
                    "content_type": None,
                    "many": True,
                    "read_only": True,
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                        "pk": "history_id",
                        "id": {
                            "label": "ID",
                            "type": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "name": {
                            "label": "Name",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "max_length": 255,
                            "choices": False,
                        },
                        "history_id": {
                            "label": "History ID",
                            "type": "IntegerField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_date": {
                            "label": "History Date",
                            "type": "DateTimeField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_change_reason": {
                            "label": "Change Reason",
                            "type": "CharField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_type": {
                            "label": "History Type",
                            "type": "CharField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_relation": {
                            "label": "In Relation To",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_user": {
                            "label": "History User",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                    },
                },
                {
                    "name": "last_history_entry",
                    "content_type": None,
                    "many": False,
                    "read_only": True,
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                        "pk": "history_id",
                        "id": {
                            "label": "ID",
                            "type": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "name": {
                            "label": "Name",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "max_length": 255,
                            "choices": False,
                        },
                        "history_id": {
                            "label": "History ID",
                            "type": "IntegerField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_date": {
                            "label": "History Date",
                            "type": "DateTimeField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_change_reason": {
                            "label": "Change Reason",
                            "type": "CharField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_type": {
                            "label": "History Type",
                            "type": "CharField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_relation": {
                            "label": "In Relation To",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_user": {
                            "label": "History User",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                    },
                },
            ],
            "expected_fields": {
                "pk": "id",
                "id": {
                    "label": "ID",
                    "type": "IntegerField",
                    "max_value": 2147483647,
                    "min_value": -2147483648,
                    "many": False,
                    "read_only": True,
                    "required": False,
                    "choices": False,
                },
                "name": {
                    "label": "Name",
                    "type": "CharField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "max_length": 255,
                    "choices": False,
                },
                "current_history_id": {
                    "label": "Current History ID",
                    "type": "IntegerField",
                    "many": False,
                    "read_only": True,
                    "required": False,
                    "choices": False,
                },
            },
            "expected_filtering": [
                {
                    "name": "name",
                    "type": "alpha",
                    "filters": [
                        {
                            "label": "Name",
                            "lookup_exprs": [
                                "exact",
                                "contains",
                            ],
                        },
                    ],
                    "choices": False,
                },
            ],
            "expected_ordering": [
                {"name": "name", "type": "alpha"},
            ],
            "expected_permissions": [
                {"codename": "create_distributor", "name": "Can create distributor"},
                {"codename": "delete_distributor", "name": "Can delete distributor"},
                {"codename": "list_distributor", "name": "Can list distributor"},
                {"codename": "read_distributor", "name": "Can read distributor"},
                {"codename": "update_distributor", "name": "Can update distributor"},
            ],
        },
    ),
    (
        "store",
        "optiontype",
        {
            "verbose_name": "option type",
            "verbose_name_plural": "option types",
            "expected_actions": {
                "list",
                "retrieve",
                "create",
                "update",
                "partial_update",
                "destroy",
                "bulk-delete",
            },
            "expected_expands": [],
            "expected_fields": {
                "pk": "id",
                "id": {
                    "label": "ID",
                    "type": "IntegerField",
                    "max_value": 2147483647,
                    "min_value": -2147483648,
                    "many": False,
                    "read_only": True,
                    "required": False,
                    "choices": False,
                },
                "code": {
                    "label": "Code",
                    "type": "CharField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "max_length": 255,
                    "choices": False,
                },
                "name": {
                    "label": "Name",
                    "type": "CharField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "max_length": 255,
                    "choices": False,
                },
            },
            "expected_filtering": [],
            "expected_ordering": [
                {"name": "name", "type": "alpha"},
            ],
            "expected_permissions": [
                {"codename": "create_optiontype", "name": "Can create option type"},
                {"codename": "delete_optiontype", "name": "Can delete option type"},
                {"codename": "list_optiontype", "name": "Can list option type"},
                {"codename": "read_optiontype", "name": "Can read option type"},
                {"codename": "update_optiontype", "name": "Can update option type"},
            ],
        },
    ),
    (
        "store",
        "customer",
        {
            "verbose_name": "customer",
            "verbose_name_plural": "customers",
            "expected_actions": {
                "list",
                "retrieve",
                "create",
                "update",
                "partial_update",
                "destroy",
                "current",
                "bulk-delete",
            },
            "expected_expands": [
                {
                    "name": "user",
                    "content_type": None,
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                        "pk": "id",
                        "id": {
                            "label": "ID",
                            "type": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "email": {
                            "label": "Email address",
                            "type": "EmailField",
                            "max_length": 254,
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "name": {
                            "label": "Name",
                            "type": "CharField",
                            "max_length": 255,
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                    },
                },
                {
                    "name": "dict_data",
                    "many": False,
                    "read_only": True,
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                        "name": {
                            "label": "Name",
                            "type": "CharField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                    },
                },
                {
                    "name": "single_value",
                    "type": "CharField",
                    "many": False,
                    "read_only": True,
                },
                {
                    "name": "first_history_entry",
                    "content_type": None,
                    "many": False,
                    "read_only": True,
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                        "pk": "history_id",
                        "id": {
                            "label": "ID",
                            "type": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "name": {
                            "label": "Name",
                            "type": "CharField",
                            "max_length": 255,
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "user": {
                            "label": "User",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "history_id": {
                            "label": "History ID",
                            "type": "IntegerField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_date": {
                            "label": "History Date",
                            "type": "DateTimeField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_change_reason": {
                            "label": "Change Reason",
                            "type": "CharField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_type": {
                            "label": "History Type",
                            "type": "CharField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_relation": {
                            "label": "In Relation To",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_user": {
                            "label": "History User",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                    },
                },
                {
                    "name": "history",
                    "content_type": None,
                    "many": True,
                    "read_only": True,
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                        "pk": "history_id",
                        "id": {
                            "label": "ID",
                            "type": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "name": {
                            "label": "Name",
                            "type": "CharField",
                            "max_length": 255,
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "user": {
                            "label": "User",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "history_id": {
                            "label": "History ID",
                            "type": "IntegerField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_date": {
                            "label": "History Date",
                            "type": "DateTimeField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_change_reason": {
                            "label": "Change Reason",
                            "type": "CharField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_type": {
                            "label": "History Type",
                            "type": "CharField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_relation": {
                            "label": "In Relation To",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_user": {
                            "label": "History User",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                    },
                },
                {
                    "name": "last_history_entry",
                    "content_type": None,
                    "many": False,
                    "read_only": True,
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                        "pk": "history_id",
                        "id": {
                            "label": "ID",
                            "type": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "name": {
                            "label": "Name",
                            "type": "CharField",
                            "max_length": 255,
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "user": {
                            "label": "User",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "history_id": {
                            "label": "History ID",
                            "type": "IntegerField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_date": {
                            "label": "History Date",
                            "type": "DateTimeField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_change_reason": {
                            "label": "Change Reason",
                            "type": "CharField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_type": {
                            "label": "History Type",
                            "type": "CharField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_relation": {
                            "label": "In Relation To",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_user": {
                            "label": "History User",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                    },
                },
            ],
            "expected_fields": {
                "pk": "id",
                "id": {
                    "label": "ID",
                    "type": "IntegerField",
                    "max_value": 2147483647,
                    "min_value": -2147483648,
                    "many": False,
                    "read_only": True,
                    "required": False,
                    "choices": False,
                },
                "user": {
                    "label": "User",
                    "type": "PrimaryKeyRelatedField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "choices": True,
                },
                "current_history_id": {
                    "label": "Current History ID",
                    "type": "IntegerField",
                    "many": False,
                    "read_only": True,
                    "required": False,
                    "choices": False,
                },
            },
            "expected_filtering": [],
            "expected_ordering": [
                {"name": "user__email", "type": "alpha"},
            ],
            "expected_permissions": [
                {"codename": "create_customer", "name": "Can create customer"},
                {"codename": "delete_customer", "name": "Can delete customer"},
                {"codename": "list_customer", "name": "Can list customer"},
                {"codename": "read_customer", "name": "Can read customer"},
                {"codename": "update_customer", "name": "Can update customer"},
            ],
        },
    ),
    (
        "store",
        "cart",
        {
            "verbose_name": "cart",
            "verbose_name_plural": "carts",
            "expected_actions": {
                "list",
                "retrieve",
                "create",
                "update",
                "partial_update",
                "destroy",
                "abandoned-carts-count",
                "create-order",
                "bulk-delete",
            },
            "expected_expands": [
                {
                    "name": "customer",
                    "content_type": None,
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                        "pk": "id",
                        "id": {
                            "label": "ID",
                            "type": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "user": {
                            "label": "User",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                    },
                },
                {
                    "name": "cart_items",
                    "content_type": None,
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                        "pk": "id",
                        "id": {
                            "label": "ID",
                            "type": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "product_option": {
                            "label": "Product Option",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "quantity": {
                            "label": "Quantity",
                            "type": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                    },
                },
            ],
            "expected_fields": {
                "pk": "id",
                "id": {
                    "label": "ID",
                    "type": "IntegerField",
                    "max_value": 2147483647,
                    "min_value": -2147483648,
                    "many": False,
                    "read_only": True,
                    "required": False,
                    "choices": False,
                },
                "customer": {
                    "label": "Customer",
                    "type": "PrimaryKeyRelatedField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "choices": True,
                },
                "last_modified": {
                    "label": "Last Modified",
                    "type": "DateTimeField",
                    "many": False,
                    "read_only": True,
                    "required": False,
                    "choices": False,
                },
                "cart_items": {
                    "label": "Cart Items",
                    "type": "ManyRelatedField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "choices": False,
                },
            },
            "expected_filtering": [
                {
                    "name": "last_modified",
                    "type": "datetime",
                    "filters": [{"label": "Last modified", "lookup_exprs": ["range"]}],
                    "choices": False,
                }
            ],
            "expected_ordering": [
                {"name": "customer__user__email", "type": "alpha"},
                {"name": "last_modified", "type": "datetime"},
            ],
            "expected_permissions": [
                {"codename": "create_cart", "name": "Can create cart"},
                {"codename": "delete_cart", "name": "Can delete cart"},
                {"codename": "list_cart", "name": "Can list cart"},
                {"codename": "read_cart", "name": "Can read cart"},
                {"codename": "update_cart", "name": "Can update cart"},
            ],
        },
    ),
    (
        "store",
        "customerorder",
        {
            "verbose_name": "customer order",
            "verbose_name_plural": "customer orders",
            "expected_actions": {
                "list",
                "retrieve",
                "create",
                "update",
                "partial_update",
                "destroy",
                "current",
                "bulk-delete",
            },
            "expected_expands": [
                {
                    "name": "customer",
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                        "pk": "id",
                        "id": {
                            "label": "ID",
                            "type": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "user": {
                            "label": "User",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                    },
                    "content_type": None,
                },
                {
                    "name": "order_state",
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                        "pk": "id",
                        "id": {
                            "label": "ID",
                            "type": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "code": {
                            "label": "Code",
                            "type": "CharField",
                            "max_length": 255,
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "name": {
                            "label": "Name",
                            "type": "CharField",
                            "max_length": 255,
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                    },
                    "content_type": None,
                },
                {
                    "name": "first_history_entry",
                    "content_type": None,
                    "many": False,
                    "read_only": True,
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                        "pk": "history_id",
                        "id": {
                            "label": "ID",
                            "type": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "name": {
                            "label": "Name",
                            "type": "CharField",
                            "max_length": 255,
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "order_number": {
                            "label": "Order Number",
                            "type": "DecimalField",
                            "max_digits": 7,
                            "decimal_places": 0,
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "order_state": {
                            "label": "Order State",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "customer": {
                            "label": "Customer",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "user": {
                            "label": "User",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "when": {
                            "label": "Date / Time",
                            "type": "DateTimeField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_id": {
                            "label": "History ID",
                            "type": "IntegerField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_date": {
                            "label": "History Date",
                            "type": "DateTimeField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_change_reason": {
                            "label": "Change Reason",
                            "type": "CharField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_type": {
                            "label": "History Type",
                            "type": "CharField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_relation": {
                            "label": "In Relation To",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_user": {
                            "label": "History User",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                    },
                },
                {
                    "name": "history",
                    "content_type": None,
                    "many": True,
                    "read_only": True,
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                        "pk": "history_id",
                        "id": {
                            "label": "ID",
                            "type": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "name": {
                            "label": "Name",
                            "type": "CharField",
                            "max_length": 255,
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "order_number": {
                            "label": "Order Number",
                            "type": "DecimalField",
                            "max_digits": 7,
                            "decimal_places": 0,
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "order_state": {
                            "label": "Order State",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "customer": {
                            "label": "Customer",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "user": {
                            "label": "User",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "when": {
                            "label": "Date / Time",
                            "type": "DateTimeField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_id": {
                            "label": "History ID",
                            "type": "IntegerField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_date": {
                            "label": "History Date",
                            "type": "DateTimeField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_change_reason": {
                            "label": "Change Reason",
                            "type": "CharField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_type": {
                            "label": "History Type",
                            "type": "CharField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_relation": {
                            "label": "In Relation To",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_user": {
                            "label": "History User",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                    },
                },
                {
                    "name": "last_history_entry",
                    "content_type": None,
                    "many": False,
                    "read_only": True,
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                        "pk": "history_id",
                        "id": {
                            "label": "ID",
                            "type": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "name": {
                            "label": "Name",
                            "type": "CharField",
                            "max_length": 255,
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "order_number": {
                            "label": "Order Number",
                            "type": "DecimalField",
                            "max_digits": 7,
                            "decimal_places": 0,
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "order_state": {
                            "label": "Order State",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "customer": {
                            "label": "Customer",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "user": {
                            "label": "User",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "when": {
                            "label": "Date / Time",
                            "type": "DateTimeField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_id": {
                            "label": "History ID",
                            "type": "IntegerField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_date": {
                            "label": "History Date",
                            "type": "DateTimeField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_change_reason": {
                            "label": "Change Reason",
                            "type": "CharField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_type": {
                            "label": "History Type",
                            "type": "CharField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_relation": {
                            "label": "In Relation To",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_user": {
                            "label": "History User",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                    },
                },
            ],
            "expected_fields": {
                "pk": "id",
                "id": {
                    "label": "ID",
                    "type": "IntegerField",
                    "max_value": 2147483647,
                    "min_value": -2147483648,
                    "many": False,
                    "read_only": True,
                    "required": False,
                    "choices": False,
                },
                "order_number": {
                    "label": "Order Number",
                    "type": "DecimalField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "max_digits": 7,
                    "decimal_places": 0,
                    "choices": False,
                },
                "when": {
                    "label": "Date / Time",
                    "type": "DateTimeField",
                    "many": False,
                    "read_only": True,
                    "required": False,
                    "choices": False,
                },
                "customer": {
                    "label": "Customer",
                    "type": "PrimaryKeyRelatedField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "choices": True,
                },
                "order_state": {
                    "label": "Order State",
                    "type": "PrimaryKeyRelatedField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "choices": True,
                },
                "current_history_id": {
                    "label": "Current History ID",
                    "type": "IntegerField",
                    "many": False,
                    "read_only": True,
                    "required": False,
                    "choices": False,
                },
            },
            "expected_filtering": [],
            "expected_ordering": [
                {"name": "order_number", "type": "numeric"},
                {"name": "customer__user__email", "type": "alpha"},
                {"name": "when", "type": "datetime"},
                {"name": "order_state", "type": "alpha"},
            ],
            "expected_permissions": [
                {"codename": "create_customerorder", "name": "Can create customer order"},
                {"codename": "delete_customerorder", "name": "Can delete customer order"},
                {"codename": "list_customerorder", "name": "Can list customer order"},
                {"codename": "read_customerorder", "name": "Can read customer order"},
                {"codename": "update_customerorder", "name": "Can update customer order"},
                {"codename": "fulfill_orders", "name": "Can fulfill orders"},
            ],
        },
    ),
    (
        "store",
        "inventoryrecordreason",
        {
            "verbose_name": "inventory entry reason",
            "verbose_name_plural": "inventory entry reasons",
            "expected_actions": {
                "list",
                "retrieve",
                "create",
                "update",
                "partial_update",
                "destroy",
                "bulk-delete",
            },
            "expected_expands": [],
            "expected_fields": {
                "pk": "id",
                "id": {
                    "label": "ID",
                    "type": "IntegerField",
                    "max_value": 2147483647,
                    "min_value": -2147483648,
                    "many": False,
                    "read_only": True,
                    "required": False,
                    "choices": False,
                },
                "name": {
                    "label": "Reason",
                    "type": "CharField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "max_length": 255,
                    "choices": False,
                },
                "code": {
                    "label": "Code",
                    "type": "CharField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "max_length": 255,
                    "choices": False,
                },
                "is_added_reason": {
                    "label": "Is Added Reason",
                    "type": "BooleanField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "choices": False,
                },
            },
            "expected_filtering": [],
            "expected_ordering": [
                {"name": "name", "type": "alpha"},
            ],
            "expected_permissions": [
                {"codename": "create_inventoryrecordreason", "name": "Can create inventory entry reason"},
                {"codename": "delete_inventoryrecordreason", "name": "Can delete inventory entry reason"},
                {"codename": "list_inventoryrecordreason", "name": "Can list inventory entry reason"},
                {"codename": "read_inventoryrecordreason", "name": "Can read inventory entry reason"},
                {"codename": "update_inventoryrecordreason", "name": "Can update inventory entry reason"},
            ],
        },
    ),
    (
        "store",
        "product",
        {
            "verbose_name": "product",
            "verbose_name_plural": "products",
            "expected_actions": {
                "list",
                "retrieve",
                "create",
                "update",
                "partial_update",
                "destroy",
                "current",
                "bulk-delete",
            },
            "expected_expands": [
                {
                    "name": "distributor",
                    "content_type": None,
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                        "pk": "id",
                        "id": {
                            "label": "ID",
                            "type": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "name": {
                            "label": "Name",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "max_length": 255,
                            "choices": False,
                        },
                        "current_history_id": {
                            "label": "Current History ID",
                            "type": "IntegerField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                    },
                },
                {
                    "name": "first_history_entry",
                    "content_type": None,
                    "many": False,
                    "read_only": True,
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                        "pk": "history_id",
                        "id": {
                            "label": "ID",
                            "type": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "current_sale_date": {
                            "label": "Current Sale Date",
                            "type": "DateRangeField",
                            "many": False,
                            "read_only": False,
                            "required": False,
                            "choices": False,
                        },
                        "customer": {
                            "label": "Customer",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "description": {
                            "label": "Description",
                            "type": "TextField",
                            "many": False,
                            "read_only": False,
                            "required": False,
                            "choices": False,
                        },
                        "disabled": {
                            "label": "Disabled",
                            "type": "BooleanField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "distributor": {
                            "label": "Distributor",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "future_sale_dates": {
                            "label": "Future Sale Dates",
                            "type": "DateRangeField",
                            "many": True,
                            "read_only": False,
                            "required": False,
                            "choices": False,
                        },
                        "last_ten_order_betweens": {
                            "label": "Last Ten Order Betweens",
                            "type": "IntegerRangeField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": True,
                            "read_only": False,
                            "required": False,
                            "choices": False,
                        },
                        "name": {
                            "label": "Name",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "max_length": 255,
                            "choices": False,
                        },
                        "order_between": {
                            "label": "Order Between",
                            "type": "IntegerRangeField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "order_number": {
                            "label": "Order Number",
                            "type": "DecimalField",
                            "max_digits": 7,
                            "decimal_places": 0,
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "order_state": {
                            "label": "Order State",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "tangible": {
                            "label": "Tangible",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "user": {
                            "label": "User",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "when": {
                            "label": "Date / Time",
                            "type": "DateTimeField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_id": {
                            "label": "History ID",
                            "type": "IntegerField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_date": {
                            "label": "History Date",
                            "type": "DateTimeField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_change_reason": {
                            "label": "Change Reason",
                            "type": "CharField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_type": {
                            "label": "History Type",
                            "type": "CharField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_relation": {
                            "label": "In Relation To",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_user": {
                            "label": "History User",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                    },
                },
                {
                    "name": "history",
                    "content_type": None,
                    "many": True,
                    "read_only": True,
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                        "pk": "history_id",
                        "id": {
                            "label": "ID",
                            "type": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "current_sale_date": {
                            "label": "Current Sale Date",
                            "type": "DateRangeField",
                            "many": False,
                            "read_only": False,
                            "required": False,
                            "choices": False,
                        },
                        "customer": {
                            "label": "Customer",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "description": {
                            "label": "Description",
                            "type": "TextField",
                            "many": False,
                            "read_only": False,
                            "required": False,
                            "choices": False,
                        },
                        "disabled": {
                            "label": "Disabled",
                            "type": "BooleanField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "distributor": {
                            "label": "Distributor",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "future_sale_dates": {
                            "label": "Future Sale Dates",
                            "type": "DateRangeField",
                            "many": True,
                            "read_only": False,
                            "required": False,
                            "choices": False,
                        },
                        "last_ten_order_betweens": {
                            "label": "Last Ten Order Betweens",
                            "type": "IntegerRangeField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": True,
                            "read_only": False,
                            "required": False,
                            "choices": False,
                        },
                        "name": {
                            "label": "Name",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "max_length": 255,
                            "choices": False,
                        },
                        "order_between": {
                            "label": "Order Between",
                            "type": "IntegerRangeField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "order_number": {
                            "label": "Order Number",
                            "type": "DecimalField",
                            "max_digits": 7,
                            "decimal_places": 0,
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "order_state": {
                            "label": "Order State",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "tangible": {
                            "label": "Tangible",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "user": {
                            "label": "User",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "when": {
                            "label": "Date / Time",
                            "type": "DateTimeField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_id": {
                            "label": "History ID",
                            "type": "IntegerField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_date": {
                            "label": "History Date",
                            "type": "DateTimeField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_change_reason": {
                            "label": "Change Reason",
                            "type": "CharField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_type": {
                            "label": "History Type",
                            "type": "CharField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_relation": {
                            "label": "In Relation To",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_user": {
                            "label": "History User",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                    },
                },
                {
                    "name": "last_history_entry",
                    "content_type": None,
                    "many": False,
                    "read_only": True,
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                        "pk": "history_id",
                        "id": {
                            "label": "ID",
                            "type": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "current_sale_date": {
                            "label": "Current Sale Date",
                            "type": "DateRangeField",
                            "many": False,
                            "read_only": False,
                            "required": False,
                            "choices": False,
                        },
                        "customer": {
                            "label": "Customer",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "description": {
                            "label": "Description",
                            "type": "TextField",
                            "many": False,
                            "read_only": False,
                            "required": False,
                            "choices": False,
                        },
                        "disabled": {
                            "label": "Disabled",
                            "type": "BooleanField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "distributor": {
                            "label": "Distributor",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "future_sale_dates": {
                            "label": "Future Sale Dates",
                            "type": "DateRangeField",
                            "many": True,
                            "read_only": False,
                            "required": False,
                            "choices": False,
                        },
                        "last_ten_order_betweens": {
                            "label": "Last Ten Order Betweens",
                            "type": "IntegerRangeField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": True,
                            "read_only": False,
                            "required": False,
                            "choices": False,
                        },
                        "name": {
                            "label": "Name",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "max_length": 255,
                            "choices": False,
                        },
                        "order_between": {
                            "label": "Order Between",
                            "type": "IntegerRangeField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "order_number": {
                            "label": "Order Number",
                            "type": "DecimalField",
                            "max_digits": 7,
                            "decimal_places": 0,
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "order_state": {
                            "label": "Order State",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "tangible": {
                            "label": "Tangible",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "user": {
                            "label": "User",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "when": {
                            "label": "Date / Time",
                            "type": "DateTimeField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_id": {
                            "label": "History ID",
                            "type": "IntegerField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_date": {
                            "label": "History Date",
                            "type": "DateTimeField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_change_reason": {
                            "label": "Change Reason",
                            "type": "CharField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_type": {
                            "label": "History Type",
                            "type": "CharField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_relation": {
                            "label": "In Relation To",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_user": {
                            "label": "History User",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                    },
                },
            ],
            "expected_fields": {
                "pk": "id",
                "id": {
                    "label": "ID",
                    "type": "IntegerField",
                    "max_value": 2147483647,
                    "min_value": -2147483648,
                    "many": False,
                    "read_only": True,
                    "required": False,
                    "choices": False,
                },
                "current_history_id": {
                    "label": "Current History ID",
                    "type": "IntegerField",
                    "many": False,
                    "read_only": True,
                    "required": False,
                    "choices": False,
                },
                "current_sale_date": {
                    "label": "Current Sale Date",
                    "type": "DateRangeField",
                    "many": False,
                    "read_only": False,
                    "required": False,
                    "choices": False,
                },
                "description": {
                    "label": "Description",
                    "type": "TextField",
                    "many": False,
                    "read_only": False,
                    "required": False,
                    "choices": False,
                },
                "distributor": {
                    "label": "Distributor",
                    "type": "PrimaryKeyRelatedField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "choices": True,
                },
                "name": {
                    "label": "Name",
                    "type": "CharField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "max_length": 255,
                    "choices": False,
                },
                "disabled": {
                    "label": "Disabled",
                    "type": "BooleanField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "choices": False,
                },
                "future_sale_dates": {
                    "label": "Future Sale Dates",
                    "type": "DateRangeField",
                    "many": True,
                    "read_only": False,
                    "required": False,
                    "choices": False,
                },
                "tangible": {
                    "label": "Tangible",
                    "type": "CharField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "choices": True,
                },
                "order_between": {
                    "label": "Order Between",
                    "type": "IntegerRangeField",
                    "max_value": 2147483647,
                    "min_value": -2147483648,
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "choices": False,
                },
                "last_ten_order_betweens": {
                    "label": "Last Ten Order Betweens",
                    "type": "IntegerRangeField",
                    "max_value": 2147483647,
                    "min_value": -2147483648,
                    "many": True,
                    "read_only": False,
                    "required": False,
                    "choices": False,
                },
            },
            "expected_filtering": [
                {
                    "name": "name",
                    "type": "alpha",
                    "filters": [
                        {
                            "label": "Name",
                            "lookup_exprs": [
                                "exact",
                                "contains",
                            ],
                        },
                    ],
                    "choices": False,
                },
                {
                    "name": "disabled",
                    "type": "boolean",
                    "filters": [
                        {
                            "lookup_exprs": [
                                "exact",
                            ],
                        },
                    ],
                    "choices": False,
                },
                {
                    "name": "tangible",
                    "type": "alpha",
                    "filters": [
                        {
                            "label": "Tangible",
                            "lookup_exprs": [
                                "exact",
                            ],
                        }
                    ],
                    "choices": True,
                },
            ],
            "expected_ordering": [
                {"name": "distributor__name", "type": "alpha"},
                {"name": "name", "type": "alpha"},
                {"name": "disabled", "type": "boolean"},
            ],
            "expected_permissions": [
                {"codename": "create_product", "name": "Can create product"},
                {"codename": "delete_product", "name": "Can delete product"},
                {"codename": "list_product", "name": "Can list product"},
                {"codename": "read_product", "name": "Can read product"},
                {"codename": "update_product", "name": "Can update product"},
            ],
        },
    ),
    (
        "store",
        "productoption",
        {
            "verbose_name": "product option",
            "verbose_name_plural": "product options",
            "expected_actions": {
                "list",
                "retrieve",
                "create",
                "update",
                "partial_update",
                "destroy",
                "current",
                "bulk-delete",
            },
            "expected_expands": [
                {
                    "name": "option_type",
                    "content_type": None,
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                        "pk": "id",
                        "id": {
                            "label": "ID",
                            "type": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "code": {
                            "label": "Code",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "max_length": 255,
                            "choices": False,
                        },
                        "name": {
                            "label": "Name",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "max_length": 255,
                            "choices": False,
                        },
                    },
                },
                {
                    "name": "product",
                    "content_type": None,
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                        "pk": "id",
                        "id": {
                            "label": "ID",
                            "type": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "distributor": {
                            "label": "Distributor",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "name": {
                            "label": "Name",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "max_length": 255,
                            "choices": False,
                        },
                        "disabled": {
                            "label": "Disabled",
                            "type": "BooleanField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "tangible": {
                            "label": "Tangible",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                    },
                },
                {
                    "name": "first_history_entry",
                    "content_type": None,
                    "many": False,
                    "read_only": True,
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                        "pk": "history_id",
                        "id": {
                            "label": "ID",
                            "type": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "current_sale_date": {
                            "label": "Current Sale Date",
                            "type": "DateRangeField",
                            "many": False,
                            "read_only": False,
                            "required": False,
                            "choices": False,
                        },
                        "customer": {
                            "label": "Customer",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "description": {
                            "label": "Description",
                            "type": "TextField",
                            "many": False,
                            "read_only": False,
                            "required": False,
                            "choices": False,
                        },
                        "disabled": {
                            "label": "Disabled",
                            "type": "BooleanField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "distributor": {
                            "label": "Distributor",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "future_sale_dates": {
                            "label": "Future Sale Dates",
                            "type": "DateRangeField",
                            "many": True,
                            "read_only": False,
                            "required": False,
                            "choices": False,
                        },
                        "gtin": {
                            "label": "GTIN",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "max_length": 255,
                            "choices": False,
                        },
                        "last_ten_order_betweens": {
                            "label": "Last Ten Order Betweens",
                            "type": "IntegerRangeField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": True,
                            "read_only": False,
                            "required": False,
                            "choices": False,
                        },
                        "name": {
                            "label": "Name",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "max_length": 255,
                            "choices": False,
                        },
                        "option_type": {
                            "label": "Option Type",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": False,
                            "choices": True,
                        },
                        "order_between": {
                            "label": "Order Between",
                            "type": "IntegerRangeField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "order_number": {
                            "label": "Order Number",
                            "type": "DecimalField",
                            "max_digits": 7,
                            "decimal_places": 0,
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "order_state": {
                            "label": "Order State",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "price": {
                            "label": "Price",
                            "type": "DecimalField",
                            "max_digits": 12,
                            "decimal_places": 2,
                            "many": False,
                            "read_only": False,
                            "required": False,
                            "choices": False,
                        },
                        "product": {
                            "label": "Product",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "sku": {
                            "label": "SKU",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "max_length": 255,
                            "choices": False,
                        },
                        "tangible": {
                            "label": "Tangible",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "user": {
                            "label": "User",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "when": {
                            "label": "Date / Time",
                            "type": "DateTimeField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_id": {
                            "label": "History ID",
                            "type": "IntegerField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_date": {
                            "label": "History Date",
                            "type": "DateTimeField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_change_reason": {
                            "label": "Change Reason",
                            "type": "CharField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_type": {
                            "label": "History Type",
                            "type": "CharField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_relation": {
                            "label": "In Relation To",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_user": {
                            "label": "History User",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                    },
                },
                {
                    "name": "history",
                    "content_type": None,
                    "many": True,
                    "read_only": True,
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                        "pk": "history_id",
                        "id": {
                            "label": "ID",
                            "type": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "current_sale_date": {
                            "label": "Current Sale Date",
                            "type": "DateRangeField",
                            "many": False,
                            "read_only": False,
                            "required": False,
                            "choices": False,
                        },
                        "customer": {
                            "label": "Customer",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "description": {
                            "label": "Description",
                            "type": "TextField",
                            "many": False,
                            "read_only": False,
                            "required": False,
                            "choices": False,
                        },
                        "disabled": {
                            "label": "Disabled",
                            "type": "BooleanField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "distributor": {
                            "label": "Distributor",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "future_sale_dates": {
                            "label": "Future Sale Dates",
                            "type": "DateRangeField",
                            "many": True,
                            "read_only": False,
                            "required": False,
                            "choices": False,
                        },
                        "gtin": {
                            "label": "GTIN",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "max_length": 255,
                            "choices": False,
                        },
                        "last_ten_order_betweens": {
                            "label": "Last Ten Order Betweens",
                            "type": "IntegerRangeField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": True,
                            "read_only": False,
                            "required": False,
                            "choices": False,
                        },
                        "name": {
                            "label": "Name",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "max_length": 255,
                            "choices": False,
                        },
                        "option_type": {
                            "label": "Option Type",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": False,
                            "choices": True,
                        },
                        "order_between": {
                            "label": "Order Between",
                            "type": "IntegerRangeField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "order_number": {
                            "label": "Order Number",
                            "type": "DecimalField",
                            "max_digits": 7,
                            "decimal_places": 0,
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "order_state": {
                            "label": "Order State",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "price": {
                            "label": "Price",
                            "type": "DecimalField",
                            "max_digits": 12,
                            "decimal_places": 2,
                            "many": False,
                            "read_only": False,
                            "required": False,
                            "choices": False,
                        },
                        "product": {
                            "label": "Product",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "sku": {
                            "label": "SKU",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "max_length": 255,
                            "choices": False,
                        },
                        "tangible": {
                            "label": "Tangible",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "user": {
                            "label": "User",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "when": {
                            "label": "Date / Time",
                            "type": "DateTimeField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_id": {
                            "label": "History ID",
                            "type": "IntegerField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_date": {
                            "label": "History Date",
                            "type": "DateTimeField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_change_reason": {
                            "label": "Change Reason",
                            "type": "CharField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_type": {
                            "label": "History Type",
                            "type": "CharField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_relation": {
                            "label": "In Relation To",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_user": {
                            "label": "History User",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                    },
                },
                {
                    "name": "last_history_entry",
                    "content_type": None,
                    "many": False,
                    "read_only": True,
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                        "pk": "history_id",
                        "id": {
                            "label": "ID",
                            "type": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "current_sale_date": {
                            "label": "Current Sale Date",
                            "type": "DateRangeField",
                            "many": False,
                            "read_only": False,
                            "required": False,
                            "choices": False,
                        },
                        "customer": {
                            "label": "Customer",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "description": {
                            "label": "Description",
                            "type": "TextField",
                            "many": False,
                            "read_only": False,
                            "required": False,
                            "choices": False,
                        },
                        "disabled": {
                            "label": "Disabled",
                            "type": "BooleanField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "distributor": {
                            "label": "Distributor",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "future_sale_dates": {
                            "label": "Future Sale Dates",
                            "type": "DateRangeField",
                            "many": True,
                            "read_only": False,
                            "required": False,
                            "choices": False,
                        },
                        "gtin": {
                            "label": "GTIN",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "max_length": 255,
                            "choices": False,
                        },
                        "last_ten_order_betweens": {
                            "label": "Last Ten Order Betweens",
                            "type": "IntegerRangeField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": True,
                            "read_only": False,
                            "required": False,
                            "choices": False,
                        },
                        "name": {
                            "label": "Name",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "max_length": 255,
                            "choices": False,
                        },
                        "option_type": {
                            "label": "Option Type",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": False,
                            "choices": True,
                        },
                        "order_between": {
                            "label": "Order Between",
                            "type": "IntegerRangeField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "order_number": {
                            "label": "Order Number",
                            "type": "DecimalField",
                            "max_digits": 7,
                            "decimal_places": 0,
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "order_state": {
                            "label": "Order State",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "price": {
                            "label": "Price",
                            "type": "DecimalField",
                            "max_digits": 12,
                            "decimal_places": 2,
                            "many": False,
                            "read_only": False,
                            "required": False,
                            "choices": False,
                        },
                        "product": {
                            "label": "Product",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "sku": {
                            "label": "SKU",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "max_length": 255,
                            "choices": False,
                        },
                        "tangible": {
                            "label": "Tangible",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "user": {
                            "label": "User",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "when": {
                            "label": "Date / Time",
                            "type": "DateTimeField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_id": {
                            "label": "History ID",
                            "type": "IntegerField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_date": {
                            "label": "History Date",
                            "type": "DateTimeField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_change_reason": {
                            "label": "Change Reason",
                            "type": "CharField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_type": {
                            "label": "History Type",
                            "type": "CharField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_relation": {
                            "label": "In Relation To",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "history_user": {
                            "label": "History User",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                    },
                },
            ],
            "expected_fields": {
                "pk": "id",
                "id": {
                    "label": "ID",
                    "type": "IntegerField",
                    "max_value": 2147483647,
                    "min_value": -2147483648,
                    "many": False,
                    "read_only": True,
                    "required": False,
                    "choices": False,
                },
                "product": {
                    "label": "Product",
                    "type": "PrimaryKeyRelatedField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "choices": True,
                },
                "option_type": {
                    "label": "Option Type",
                    "type": "PrimaryKeyRelatedField",
                    "many": False,
                    "read_only": False,
                    "required": False,
                    "choices": True,
                },
                "name": {
                    "label": "Name",
                    "type": "CharField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "max_length": 255,
                    "choices": False,
                },
                "sku": {
                    "label": "SKU",
                    "type": "CharField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "max_length": 255,
                    "choices": False,
                },
                "gtin": {
                    "label": "GTIN",
                    "type": "CharField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "max_length": 255,
                    "choices": False,
                },
                "price": {
                    "label": "Price",
                    "type": "DecimalField",
                    "many": False,
                    "read_only": False,
                    "required": False,
                    "max_digits": 12,
                    "decimal_places": 2,
                    "choices": False,
                },
                "disabled": {
                    "label": "Disabled",
                    "type": "BooleanField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "choices": False,
                },
                "current_history_id": {
                    "label": "Current History ID",
                    "type": "IntegerField",
                    "many": False,
                    "read_only": True,
                    "required": False,
                    "choices": False,
                },
            },
            "expected_filtering": [
                {
                    "name": "name",
                    "type": "alpha",
                    "filters": [
                        {
                            "label": "Name",
                            "lookup_exprs": [
                                "exact",
                                "contains",
                            ],
                        },
                    ],
                    "choices": False,
                },
                {
                    "name": "sku",
                    "type": "alpha",
                    "filters": [
                        {
                            "label": "SKU",
                            "lookup_exprs": [
                                "exact",
                                "contains",
                            ],
                        },
                    ],
                    "choices": False,
                },
                {
                    "name": "price",
                    "type": "numeric",
                    "filters": [
                        {
                            "label": "Price",
                            "lookup_exprs": [
                                "range",
                            ],
                        },
                    ],
                    "choices": False,
                },
                {
                    "name": "disabled",
                    "type": "boolean",
                    "filters": [
                        {
                            "lookup_exprs": [
                                "exact",
                            ],
                        },
                    ],
                    "choices": False,
                },
            ],
            "expected_ordering": [
                {"name": "name", "type": "alpha"},
                {"name": "option_type", "type": "alpha"},
                {"name": "sku", "type": "alpha"},
                {"name": "gtin", "type": "alpha"},
                {"name": "price", "type": "numeric"},
            ],
            "expected_permissions": [
                {"codename": "create_productoption", "name": "Can create product option"},
                {"codename": "delete_productoption", "name": "Can delete product option"},
                {"codename": "list_productoption", "name": "Can list product option"},
                {"codename": "read_productoption", "name": "Can read product option"},
                {"codename": "update_productoption", "name": "Can update product option"},
            ],
        },
    ),
    (
        "store",
        "orderitem",
        {
            "verbose_name": "ORDER item",
            "verbose_name_plural": "ORDER items",
            "expected_actions": {
                "list",
                "retrieve",
                "create",
                "update",
                "partial_update",
                "destroy",
                "bulk-delete",
            },
            "expected_expands": [
                {
                    "name": "customer_order",
                    "content_type": None,
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                        "pk": "id",
                        "id": {
                            "label": "ID",
                            "type": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "order_number": {
                            "label": "Order Number",
                            "type": "DecimalField",
                            "max_digits": 7,
                            "decimal_places": 0,
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "when": {
                            "label": "Date / Time",
                            "type": "DateTimeField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "customer": {
                            "label": "Customer",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "order_state": {
                            "label": "Order State",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                    },
                },
                {
                    "name": "product_option",
                    "content_type": None,
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                        "pk": "id",
                        "id": {
                            "label": "ID",
                            "type": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "product": {
                            "label": "Product",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "option_type": {
                            "label": "Option Type",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": False,
                            "choices": True,
                        },
                        "name": {
                            "label": "Name",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "max_length": 255,
                            "choices": False,
                        },
                        "sku": {
                            "label": "SKU",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "max_length": 255,
                            "choices": False,
                        },
                        "gtin": {
                            "label": "GTIN",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "max_length": 255,
                            "choices": False,
                        },
                        "price": {
                            "label": "Price",
                            "type": "DecimalField",
                            "max_digits": 12,
                            "decimal_places": 2,
                            "many": False,
                            "read_only": False,
                            "required": False,
                            "choices": False,
                        },
                        "disabled": {
                            "label": "Disabled",
                            "type": "BooleanField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                    },
                },
            ],
            "expected_fields": {
                "pk": "id",
                "id": {
                    "label": "ID",
                    "type": "IntegerField",
                    "max_value": 2147483647,
                    "min_value": -2147483648,
                    "many": False,
                    "read_only": True,
                    "required": False,
                    "choices": False,
                },
                "customer_order": {
                    "label": "Customer Order",
                    "type": "PrimaryKeyRelatedField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "choices": True,
                },
                "product_option": {
                    "label": "Product Option",
                    "type": "PrimaryKeyRelatedField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "choices": True,
                },
                "quantity": {
                    "label": "Quantity",
                    "type": "IntegerField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "max_value": 1000,
                    "min_value": 0,
                    "choices": False,
                },
            },
            "expected_filtering": [
                {
                    "name": "quantity",
                    "type": "numeric",
                    "filters": [
                        {
                            "label": "Quantity",
                            "lookup_exprs": [
                                "range",
                            ],
                        },
                    ],
                    "choices": False,
                },
            ],
            "expected_ordering": [
                {"name": "customer_order__order_number", "type": "numeric"},
                {"name": "product_option__name", "type": "alpha"},
                {"name": "quantity", "type": "numeric"},
            ],
            "expected_permissions": [
                {"codename": "create_orderitem", "name": "Can create ORDER item"},
                {"codename": "delete_orderitem", "name": "Can delete ORDER item"},
                {"codename": "list_orderitem", "name": "Can list ORDER item"},
                {"codename": "read_orderitem", "name": "Can read ORDER item"},
                {"codename": "update_orderitem", "name": "Can update ORDER item"},
            ],
        },
    ),
    (
        "store",
        "inventoryrecord",
        {
            "verbose_name": "inventory entry",
            "verbose_name_plural": "inventory entries",
            "expected_actions": {
                "list",
                "retrieve",
                "create",
                "update",
                "partial_update",
                "destroy",
                "bulk-delete",
            },
            "expected_expands": [
                {
                    "name": "product_option",
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                        "pk": "id",
                        "id": {
                            "label": "ID",
                            "type": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "product": {
                            "label": "Product",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "option_type": {
                            "label": "Option Type",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": False,
                            "choices": True,
                        },
                        "name": {
                            "label": "Name",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "max_length": 255,
                            "choices": False,
                        },
                        "sku": {
                            "label": "SKU",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "max_length": 255,
                            "choices": False,
                        },
                        "gtin": {
                            "label": "GTIN",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "max_length": 255,
                            "choices": False,
                        },
                        "price": {
                            "label": "Price",
                            "type": "DecimalField",
                            "max_digits": 12,
                            "decimal_places": 2,
                            "many": False,
                            "read_only": False,
                            "required": False,
                            "choices": False,
                        },
                        "disabled": {
                            "label": "Disabled",
                            "type": "BooleanField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                    },
                    "content_type": None,
                },
                {
                    "name": "reason",
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                        "pk": "id",
                        "id": {
                            "label": "ID",
                            "type": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "name": {
                            "label": "Reason",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "max_length": 255,
                            "choices": False,
                        },
                        "code": {
                            "label": "Code",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "max_length": 255,
                            "choices": False,
                        },
                        "is_added_reason": {
                            "label": "Is Added Reason",
                            "type": "BooleanField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                    },
                    "content_type": None,
                },
                {
                    "name": "added_inventory_record",
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                        "pk": "id",
                        "id": {
                            "label": "ID",
                            "type": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "when": {
                            "label": "Date / Time",
                            "type": "DateTimeField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "quantity": {
                            "label": "Quantity",
                            "type": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "reason": {
                            "label": "Reason",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "archived": {
                            "label": "Archived",
                            "type": "BooleanField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "is_added": {
                            "label": "Is Added",
                            "type": "BooleanField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                        "cost": {
                            "label": "Cost",
                            "type": "DecimalField",
                            "max_digits": 12,
                            "decimal_places": 0,
                            "many": False,
                            "read_only": False,
                            "required": False,
                            "choices": False,
                        },
                        "added_inventory_record": {
                            "label": "Added Inventory Entry",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": False,
                            "choices": True,
                        },
                        "order_item": {
                            "label": "Order Item",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": False,
                            "choices": True,
                        },
                        "price": {
                            "label": "Price",
                            "type": "DecimalField",
                            "max_digits": 12,
                            "decimal_places": 2,
                            "many": False,
                            "read_only": False,
                            "required": False,
                            "choices": False,
                        },
                        "margin": {
                            "label": "Margin",
                            "type": "DecimalField",
                            "max_digits": 12,
                            "decimal_places": 2,
                            "many": False,
                            "read_only": False,
                            "required": False,
                            "choices": False,
                        },
                    },
                    "content_type": None,
                },
                {
                    "name": "order_item",
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                        "pk": "id",
                        "id": {
                            "label": "ID",
                            "type": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "product_option": {
                            "label": "Product Option",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "quantity": {
                            "label": "Quantity",
                            "type": "IntegerField",
                            "max_value": 1000,
                            "min_value": 0,
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                    },
                    "content_type": None,
                },
            ],
            "expected_fields": {
                "pk": "id",
                "id": {
                    "label": "ID",
                    "type": "IntegerField",
                    "max_value": 2147483647,
                    "min_value": -2147483648,
                    "many": False,
                    "read_only": True,
                    "required": False,
                    "choices": False,
                },
                "product_option": {
                    "label": "Product Option",
                    "type": "PrimaryKeyRelatedField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "choices": True,
                },
                "when": {
                    "label": "Date / Time",
                    "type": "DateTimeField",
                    "many": False,
                    "read_only": True,
                    "required": False,
                    "choices": False,
                },
                "quantity": {
                    "label": "Quantity",
                    "type": "IntegerField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "max_value": 2147483647,
                    "min_value": -2147483648,
                    "choices": False,
                },
                "reason": {
                    "label": "Reason",
                    "type": "PrimaryKeyRelatedField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "choices": True,
                },
                "archived": {
                    "label": "Archived",
                    "type": "BooleanField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "choices": False,
                },
                "is_added": {
                    "label": "Is Added",
                    "type": "BooleanField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "choices": False,
                },
                "cost": {
                    "label": "Cost",
                    "type": "DecimalField",
                    "many": False,
                    "read_only": False,
                    "required": False,
                    "max_digits": 12,
                    "decimal_places": 0,
                    "choices": False,
                },
                "added_inventory_record": {
                    "label": "Added Inventory Entry",
                    "type": "PrimaryKeyRelatedField",
                    "many": False,
                    "read_only": False,
                    "required": False,
                    "choices": True,
                },
                "order_item": {
                    "label": "Order Item",
                    "type": "PrimaryKeyRelatedField",
                    "many": False,
                    "read_only": False,
                    "required": False,
                    "choices": True,
                },
                "price": {
                    "label": "Price",
                    "type": "DecimalField",
                    "many": False,
                    "read_only": False,
                    "required": False,
                    "max_digits": 12,
                    "decimal_places": 2,
                    "choices": False,
                },
                "margin": {
                    "label": "Margin",
                    "type": "DecimalField",
                    "many": False,
                    "read_only": False,
                    "required": False,
                    "max_digits": 12,
                    "decimal_places": 2,
                    "choices": False,
                },
            },
            "expected_filtering": [
                {
                    "name": "when",
                    "type": "datetime",
                    "filters": [
                        {
                            "label": "When",
                            "lookup_exprs": [
                                "range",
                            ],
                        },
                    ],
                    "choices": False,
                },
                {
                    "name": "reason",
                    "type": "alpha",
                    "filters": [
                        {
                            "lookup_exprs": [
                                "exact",
                            ],
                        },
                    ],
                    "choices": False,
                },
                {
                    "name": "is_added",
                    "type": "boolean",
                    "filters": [
                        {
                            "lookup_exprs": [
                                "exact",
                            ],
                        },
                        {
                            "label": "isAdded",
                            "lookup_exprs": [
                                "exact",
                            ],
                            "required": True,
                        },
                    ],
                    "choices": False,
                },
                {
                    "name": "quantity",
                    "type": "numeric",
                    "filters": [
                        {
                            "label": "Quantity",
                            "lookup_exprs": [
                                "range",
                            ],
                        },
                    ],
                    "choices": False,
                },
                {
                    "name": "cost",
                    "type": "numeric",
                    "filters": [
                        {
                            "label": "Cost",
                            "lookup_exprs": [
                                "range",
                            ],
                        },
                    ],
                    "choices": False,
                },
                {
                    "name": "price",
                    "type": "numeric",
                    "filters": [
                        {
                            "label": "Price",
                            "lookup_exprs": [
                                "range",
                            ],
                        },
                    ],
                    "choices": False,
                },
                {
                    "name": "margin",
                    "type": "numeric",
                    "filters": [
                        {
                            "label": "Margin",
                            "lookup_exprs": [
                                "range",
                            ],
                        },
                    ],
                    "choices": False,
                },
            ],
            "expected_ordering": [
                {"name": "when", "type": "datetime"},
                {"name": "reason", "type": "alpha"},
                {"name": "quantity", "type": "numeric"},
            ],
            "expected_permissions": [
                {"codename": "create_inventoryrecord", "name": "Can create inventory entry"},
                {"codename": "delete_inventoryrecord", "name": "Can delete inventory entry"},
                {"codename": "list_inventoryrecord", "name": "Can list inventory entry"},
                {"codename": "read_inventoryrecord", "name": "Can read inventory entry"},
                {"codename": "update_inventoryrecord", "name": "Can update inventory entry"},
            ],
        },
    ),
    (
        "store",
        "cartitem",
        {
            "verbose_name": "cart item",
            "verbose_name_plural": "cart items",
            "expected_actions": {
                "list",
                "retrieve",
                "create",
                "update",
                "partial_update",
                "destroy",
                "bulk-delete",
            },
            "expected_expands": [
                {
                    "name": "cart",
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                        "pk": "id",
                        "id": {
                            "label": "ID",
                            "type": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "customer": {
                            "label": "Customer",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                    },
                    "content_type": None,
                },
                {
                    "name": "product_option",
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                        "pk": "id",
                        "id": {
                            "label": "ID",
                            "type": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                        "product": {
                            "label": "Product",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": True,
                        },
                        "option_type": {
                            "label": "Option Type",
                            "type": "PrimaryKeyRelatedField",
                            "many": False,
                            "read_only": False,
                            "required": False,
                            "choices": True,
                        },
                        "name": {
                            "label": "Name",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "max_length": 255,
                            "choices": False,
                        },
                        "sku": {
                            "label": "SKU",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "max_length": 255,
                            "choices": False,
                        },
                        "gtin": {
                            "label": "GTIN",
                            "type": "CharField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "max_length": 255,
                            "choices": False,
                        },
                        "price": {
                            "label": "Price",
                            "type": "DecimalField",
                            "max_digits": 12,
                            "decimal_places": 2,
                            "many": False,
                            "read_only": False,
                            "required": False,
                            "choices": False,
                        },
                        "disabled": {
                            "label": "Disabled",
                            "type": "BooleanField",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "choices": False,
                        },
                    },
                    "content_type": None,
                },
            ],
            "expected_fields": {
                "pk": "id",
                "id": {
                    "label": "ID",
                    "type": "IntegerField",
                    "max_value": 2147483647,
                    "min_value": -2147483648,
                    "many": False,
                    "read_only": True,
                    "required": False,
                    "choices": False,
                },
                "cart": {
                    "label": "Cart",
                    "type": "PrimaryKeyRelatedField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "choices": True,
                },
                "product_option": {
                    "label": "Product Option",
                    "type": "PrimaryKeyRelatedField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "choices": True,
                },
                "quantity": {
                    "label": "Quantity",
                    "type": "IntegerField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "max_value": 2147483647,
                    "min_value": -2147483648,
                    "choices": False,
                },
            },
            "expected_filtering": [],
            "expected_ordering": [
                {"name": "product_option__name", "type": "alpha"},
                {"name": "quantity", "type": "numeric"},
            ],
            "expected_permissions": [
                {"codename": "create_cartitem", "name": "Can create cart item"},
                {"codename": "delete_cartitem", "name": "Can delete cart item"},
                {"codename": "list_cartitem", "name": "Can list cart item"},
                {"codename": "read_cartitem", "name": "Can read cart item"},
                {"codename": "update_cartitem", "name": "Can update cart item"},
            ],
        },
    ),
]


DETAIL_CHOICES_PARAMETRIZE = [
    (
        "store",
        "customer",
        "user",
        {
            "choices": (
                "test_admin@example.com",
                "test_customer_1@example.com",
                "test_customer_2@example.com",
            ),
        },
    ),
    (
        "store",
        "cart",
        "customer",
        {
            "choices": (
                "test_customer_1@example.com",
                "test_customer_2@example.com",
            ),
        },
    ),
    (
        "store",
        "customerorder",
        "customer",
        {
            "choices": (
                "test_customer_1@example.com",
                "test_customer_2@example.com",
            ),
        },
    ),
    (
        "store",
        "customerorder",
        "order_state",
        {
            "choices": (
                "New",
                "Packed",
                "Returned",
                "Shipped",
            ),
        },
    ),
    (
        "store",
        "product",
        "distributor",
        {
            "choices": (
                "T-Shirt Corp.",
                "Tasty Treats Assoc.",
                "Vibrant Looks Inc.",
            ),
        },
    ),
    (
        "store",
        "product",
        "tangible",
        {
            "choices": (
                "Digital",
                "Physical",
            ),
        },
    ),
    (
        "store",
        "productoption",
        "product",
        {
            "choices": (
                "Men's White T-Shirt",
                "Paint",
                "Shaped Cookies For Drapes",
                "Spray Paint",
                "Square Cookies For Squares",
                "Women's White T-Shirt",
            ),
        },
    ),
    (
        "store",
        "productoption",
        "option_type",
        {
            "choices": (
                "Size",
                "Colour",
                "Flavour",
            ),
        },
    ),
    (
        "store",
        "orderitem",
        "customer_order",
        {
            "choices": (
                "1001",
                "1002",
                "1003",
                "1004",
                "1005",
            ),
        },
    ),
    (
        "store",
        "orderitem",
        "product_option",
        {
            "choices": (
                "Explosive Dynamite",
                "Gentle Cinnamon",
                "Large",
                "Medium",
                "Pearl Whisper",
                "Red",
                "Royal Crimson",
                "Small",
                "Sweet Sugar",
                "White",
            ),
        },
    ),
    (
        "store",
        "inventoryrecord",
        "product_option",
        {
            "choices": (
                "Explosive Dynamite",
                "Gentle Cinnamon",
                "Large",
                "Medium",
                "Pearl Whisper",
                "Red",
                "Royal Crimson",
                "Small",
                "Sweet Sugar",
                "White",
            ),
        },
    ),
    (
        "store",
        "inventoryrecord",
        "reason",
        {
            "choices": (
                "Damaged Inventory",
                "Order Fulfillment",
                "Received Inventory",
                "Returned Inventory",
            ),
        },
    ),
    (
        "store",
        "inventoryrecord",
        "added_inventory_record",
        {
            "choices": (
                "Damaged Inventory 2x Medium",
                "Order Fulfillment 1x Small",
                "Order Fulfillment 2x Large",
                "Order Fulfillment 2x Medium",
                "Order Fulfillment 2x Sweet Sugar",
                "Order Fulfillment 2x Sweet Sugar",
                "Order Fulfillment 2x White",
                "Order Fulfillment 3x Pearl Whisper",
                "Order Fulfillment 3x Red",
                "Order Fulfillment 3x Royal Crimson",
                "Order Fulfillment 3x White",
                "Order Fulfillment 4x Explosive Dynamite",
                "Order Fulfillment 4x Large",
                "Order Fulfillment 4x Pearl Whisper",
                "Order Fulfillment 4x Red",
                "Order Fulfillment 4x Sweet Sugar",
                "Order Fulfillment 5x Small",
                "Order Fulfillment 6x Explosive Dynamite",
                "Order Fulfillment 6x Gentle Cinnamon",
                "Order Fulfillment 6x Gentle Cinnamon",
                "Order Fulfillment 6x Medium",
                "Order Fulfillment 6x Medium",
                "Order Fulfillment 6x Royal Crimson",
                "Order Fulfillment 8x Explosive Dynamite",
                "Received Inventory 12x Explosive Dynamite",
                "Received Inventory 12x Explosive Dynamite",
                "Received Inventory 12x Medium",
                "Received Inventory 12x Medium",
                "Received Inventory 12x Royal Crimson",
                "Received Inventory 12x White",
                "Received Inventory 15x Red",
                "Received Inventory 6x Gentle Cinnamon",
                "Received Inventory 6x Gentle Cinnamon",
                "Received Inventory 6x Large",
                "Received Inventory 6x Small",
                "Received Inventory 6x Small",
                "Received Inventory 6x Sweet Sugar",
                "Received Inventory 6x Sweet Sugar",
                "Received Inventory 8x Pearl Whisper",
                "Returned Inventory 2x Medium",
                "Returned Inventory 3x Royal Crimson",
            ),
        },
    ),
    (
        "store",
        "inventoryrecord",
        "order_item",
        {
            "choices": (
                "1001 - 3x Red",
                "1001 - 5x Small",
                "1001 - 6x Gentle Cinnamon",
                "1001 - 6x Medium",
                "1002 - 3x Pearl Whisper",
                "1002 - 4x Large",
                "1002 - 4x Royal Crimson",
                "1002 - 4x Sweet Sugar",
                "1002 - 6x Medium",
                "1002 - 8x Explosive Dynamite",
                "1003 - 2x Medium",
                "1003 - 2x White",
                "1003 - 4x Explosive Dynamite",
                "1003 - 4x Red",
                "1004 - 2x Large",
                "1004 - 3x Royal Crimson",
                "1004 - 4x Pearl Whisper",
                "1004 - 4x Sweet Sugar",
                "1004 - 6x Explosive Dynamite",
                "1004 - 6x Small",
                "1005 - 3x White",
                "1005 - 6x Gentle Cinnamon",
            ),
        },
    ),
    (
        "store",
        "cartitem",
        "cart",
        {
            "choices": ("test_customer_1@example.com",),
        },
    ),
    (
        "store",
        "cartitem",
        "product_option",
        {
            "choices": (
                "Explosive Dynamite",
                "Gentle Cinnamon",
                "Large",
                "Medium",
                "Pearl Whisper",
                "Red",
                "Royal Crimson",
                "Small",
                "Sweet Sugar",
                "White",
            ),
        },
    ),
]


class TestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create = {
        "Admin": [
            ("contenttypes", "ContentType", "list"),
            ("contenttypes", "ContentType", "read"),
            ("store", "Cart", "create"),
            ("store", "Cart", "delete"),
            ("store", "Cart", "list"),
            ("store", "Cart", "read"),
            ("store", "Cart", "update"),
            ("store", "CartItem", "read"),
            ("store", "Customer", "list"),
            ("store", "CustomerOrder", "create"),
            ("store", "CustomerOrder", "delete"),
            ("store", "CustomerOrder", "list"),
            ("store", "CustomerOrder", "read"),
            ("store", "CustomerOrder", "update"),
            ("store", "Distributor", "list"),
            ("store", "InventoryRecord", "list"),
            ("store", "InventoryRecordReason", "list"),
            ("store", "OptionType", "list"),
            ("store", "OrderItem", "list"),
            ("store", "OrderState", "list"),
            ("store", "Product", "list"),
            ("store", "ProductOption", "list"),
            ("tests", "User", "list"),
            ("store", "Customer", "read"),
        ],
        "Customer": [
            ("contenttypes", "ContentType", "list"),
            ("contenttypes", "ContentType", "read"),
            ("store", "Cart", "create"),
            ("store", "Cart", "delete"),
            ("store", "Cart", "read"),
            ("store", "Cart", "update"),
            ("store", "CartItem", "read"),
            ("store", "CartItem", "list"),
            ("store", "CartItem", "update"),
            ("store", "CartItem", "delete"),
            ("store", "CustomerOrder", "create"),
            ("store", "CustomerOrder", "read"),
            ("store", "Distributor", "list"),
            ("store", "OptionType", "list"),
            ("store", "OrderItem", "list"),
            ("store", "OrderState", "list"),
            ("store", "Product", "list"),
            ("store", "ProductOption", "list"),
            ("tests", "User", "list"),
            ("store", "Customer", "read"),
        ],
    }

    users_to_create = {
        "test_admin@example.com": {
            "name": "Test Admin",
            "password": "testpass",
            "groups": ["Admin"],
        },
        "test_customer_1@example.com": {
            "name": "Test Customer 1",
            "password": "testpass",
            "groups": ["Customer"],
        },
        "test_customer_2@example.com": {
            "name": "Test Customer 2",
            "password": "testpass",
            "groups": ["Customer"],
        },
    }

    def __init__(self):
        # Option Types
        option_types = OptionType.objects.bulk_create(
            OptionType(**data)
            for data in (
                {
                    "name": "Size",
                    "code": "size",
                },
                {
                    "name": "Colour",
                    "code": "colour",
                },
                {
                    "name": "Flavour",
                    "code": "flavour",
                },
            )
        )
        self.option_types = option_types = {item.code: item for item in option_types}

        # Order States
        order_states = OrderState.objects.bulk_create(
            OrderState(**data)
            for data in (
                {
                    "name": "New",
                    "code": "new",
                },
                {
                    "name": "Packed",
                    "code": "packed",
                },
                {
                    "name": "Returned",
                    "code": "returned",
                },
                {
                    "name": "Shipped",
                    "code": "shipped",
                },
            )
        )
        self.order_states = order_states = {item.code: item for item in order_states}

        # Inventory Entry Reasons
        inventory_record_reasons = InventoryRecordReason.objects.bulk_create(
            InventoryRecordReason(**data)
            for data in (
                {
                    "name": "Damaged Inventory",
                    "code": "damaged_inventory",
                    "is_added_reason": False,
                },
                {
                    "name": "Order Fulfillment",
                    "code": "order_fulfillment",
                    "is_added_reason": False,
                },
                {
                    "name": "Received Inventory",
                    "code": "received_inventory",
                    "is_added_reason": True,
                },
                {
                    "name": "Returned Inventory",
                    "code": "returned_inventory",
                    "is_added_reason": True,
                },
            )
        )
        self.inventory_record_reasons = inventory_record_reasons = {
            (item.code, item.is_added_reason): item for item in inventory_record_reasons
        }

        # Customers
        customers = {}
        for data in (
            {"user": "test_customer_1@example.com"},
            {"user": "test_customer_2@example.com"},
        ):
            data["user"] = self.users[data["user"]]
            customer = Customer.objects.create(**data)
            customers[customer.user.email] = customer
        self.customers = customers

        # Distributors
        distributors = {}
        for data in (
            {"name": "T-Shirt Corp."},
            {"name": "Tasty Treats Assoc."},
            {"name": "Vibrant Looks Inc."},
        ):
            distributor = Distributor.objects.create(**data)
            distributors[distributor.name] = distributor
        self.distributors = distributors

        # Orders
        customer_orders = {}
        for data in (
            {
                "order_number": 1001,
                "when": datetime.datetime(2023, 12, 13, 13, 0, 0),
                "customer": "test_customer_1@example.com",
                "order_state": "shipped",
            },
            {
                "order_number": 1002,
                "when": datetime.datetime(2023, 12, 13, 14, 0, 0),
                "customer": "test_customer_2@example.com",
                "order_state": "shipped",
            },
            {
                "order_number": 1003,
                "when": datetime.datetime(2024, 1, 7, 13, 0, 0),
                "customer": "test_customer_2@example.com",
                "order_state": "shipped",
            },
            {
                "order_number": 1004,
                "when": datetime.datetime(2024, 3, 13, 12, 0, 0),
                "customer": "test_customer_2@example.com",
                "order_state": "packed",
            },
            {
                "order_number": 1005,
                "when": datetime.datetime(2024, 3, 13, 16, 0, 0),
                "customer": "test_customer_1@example.com",
                "order_state": "new",
            },
        ):
            data["customer"] = customers[data["customer"]]
            data["order_state"] = order_states[data["order_state"]]
            order = CustomerOrder.objects.create(**data)
            customer_orders[order.order_number] = order
        self.customer_orders = customer_orders

        # Products, Product Options, Inventory Entries, Orders, and Order Items.
        products = {}
        product_options = {}
        order_items = {}
        inventory_records = {}

        for data in (
            {
                "distributor": "T-Shirt Corp.",
                "products": (
                    {
                        "product": {"name": "Men's White T-Shirt", "order_between": [12, 24]},
                        "options": (
                            {
                                "option": {
                                    "option_type": "size",
                                    "name": "Medium",
                                    "sku": "1001",
                                    "gtin": "3032076999853",
                                    "price": Decimal("19.99"),
                                },
                                "order_items": (
                                    {
                                        "identifier": "order_item_1",
                                        "customer_order": 1001,
                                        "quantity": 6,
                                    },
                                    {
                                        "identifier": "order_item_2",
                                        "customer_order": 1002,
                                        "quantity": 6,
                                    },
                                    {
                                        "identifier": "order_item_3",
                                        "customer_order": 1003,
                                        "quantity": 2,
                                    },
                                ),
                                "inventory_records": (
                                    {
                                        # This exists as a way to associate between inventory entries.
                                        "identifier": "inventory_record_1",
                                        "when": datetime.datetime(2023, 12, 12, 12, 0, 0),
                                        "quantity": 12,
                                        "reason": ("received_inventory", True),
                                        "archived": True,
                                        "is_added": True,
                                        "cost": Decimal("12.34"),
                                    },
                                    {
                                        "when": datetime.datetime(2023, 12, 13, 13, 0, 0),
                                        "quantity": 6,
                                        "reason": ("order_fulfillment", False),
                                        "archived": True,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_1",
                                        "price": Decimal("19.99"),
                                        "margin": Decimal("7.65"),
                                    },
                                    {
                                        "when": datetime.datetime(2023, 12, 13, 14, 0, 0),
                                        "quantity": 6,
                                        "reason": ("order_fulfillment", False),
                                        "archived": True,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_2",
                                        "price": Decimal("19.99"),
                                        "margin": Decimal("7.65"),
                                    },
                                    {
                                        "when": datetime.datetime(2023, 12, 20, 10, 0, 0),
                                        "quantity": 2,
                                        "reason": ("returned_inventory", True),
                                        "archived": True,
                                        "is_added": True,
                                        "added_inventory_record": "inventory_record_1",
                                        "cost": Decimal("12.34"),
                                    },
                                    {
                                        "when": datetime.datetime(2023, 12, 20, 10, 15, 0),
                                        "quantity": 2,
                                        "reason": ("damaged_inventory", False),
                                        "archived": True,
                                        "is_added": True,
                                        "added_inventory_record": "inventory_record_1",
                                        "price": Decimal("12.34"),
                                        "margin": Decimal("0.00"),
                                    },
                                    {
                                        "identifier": "inventory_record_2",
                                        "when": datetime.datetime(2024, 1, 1, 12, 0, 0),
                                        "quantity": 12,
                                        "reason": ("received_inventory", True),
                                        "archived": False,
                                        "is_added": True,
                                        "cost": Decimal("12.36"),
                                    },
                                    {
                                        "when": datetime.datetime(2024, 1, 7, 13, 0, 0),
                                        "quantity": 2,
                                        "reason": ("order_fulfillment", False),
                                        "archived": False,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_2",
                                        "order_item": "order_item_3",
                                        "price": Decimal("19.99"),
                                        "margin": Decimal("7.63"),
                                    },
                                ),
                            },
                            {
                                "option": {
                                    "option_type": "size",
                                    "name": "Large",
                                    "sku": "1002",
                                    "gtin": "3032076999854",
                                    "price": Decimal("19.99"),
                                },
                                "order_items": (
                                    {
                                        "identifier": "order_item_1",
                                        "customer_order": 1002,
                                        "quantity": 4,
                                    },
                                    {
                                        "identifier": "order_item_2",
                                        "customer_order": 1004,
                                        "quantity": 2,
                                    },
                                ),
                                "inventory_records": (
                                    {
                                        # This exists as a way to associate between inventory entries.
                                        "identifier": "inventory_record_1",
                                        "when": datetime.datetime(2023, 12, 12, 12, 0, 0),
                                        "quantity": 6,
                                        "reason": ("received_inventory", True),
                                        "archived": True,
                                        "is_added": True,
                                        "cost": Decimal("12.44"),
                                    },
                                    {
                                        "when": datetime.datetime(2023, 12, 13, 14, 0, 0),
                                        "quantity": 4,
                                        "reason": ("order_fulfillment", False),
                                        "archived": True,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_1",
                                        "price": Decimal("19.99"),
                                        "margin": Decimal("7.55"),
                                    },
                                    {
                                        "when": datetime.datetime(2024, 3, 13, 12, 0, 0),
                                        "quantity": 2,
                                        "reason": ("order_fulfillment", False),
                                        "archived": True,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_2",
                                        "price": Decimal("19.99"),
                                        "margin": Decimal("7.55"),
                                    },
                                ),
                            },
                        ),
                    },
                    {
                        "product": {"name": "Women's White T-Shirt", "order_between": [12, 24]},
                        "options": (
                            {
                                "option": {
                                    "option_type": "size",
                                    "name": "Small",
                                    "sku": "1011",
                                    "gtin": "4109009311819",
                                    "price": Decimal("18.99"),
                                },
                                "order_items": (
                                    {
                                        "identifier": "order_item_1",
                                        "customer_order": 1001,
                                        "quantity": 5,
                                    },
                                    {
                                        "identifier": "order_item_2",
                                        "customer_order": 1004,
                                        "quantity": 6,
                                    },
                                ),
                                "inventory_records": (
                                    {
                                        "identifier": "inventory_record_1",
                                        "when": datetime.datetime(2023, 12, 12, 12, 0, 0),
                                        "quantity": 6,
                                        "reason": ("received_inventory", True),
                                        "archived": False,
                                        "is_added": True,
                                        "cost": Decimal("12.14"),
                                    },
                                    {
                                        "when": datetime.datetime(2023, 12, 13, 13, 0, 0),
                                        "quantity": 5,
                                        "reason": ("order_fulfillment", False),
                                        "archived": False,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_1",
                                        "price": Decimal("18.99"),
                                        "margin": Decimal("6.85"),
                                    },
                                    {
                                        "identifier": "inventory_record_2",
                                        "when": datetime.datetime(2024, 1, 1, 12, 0, 0),
                                        "quantity": 6,
                                        "reason": ("received_inventory", True),
                                        "archived": False,
                                        "is_added": True,
                                        "cost": Decimal("12.19"),
                                    },
                                    {
                                        "when": datetime.datetime(2024, 3, 13, 12, 0, 0),
                                        "quantity": 1,
                                        "reason": ("order_fulfillment", False),
                                        "archived": False,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_2",
                                        "order_item": "order_item_2",
                                        "price": Decimal("19.99"),
                                        "margin": Decimal("6.80"),
                                    },
                                ),
                            },
                        ),
                    },
                ),
            },
            {
                "distributor": "Tasty Treats Assoc.",
                "products": (
                    {
                        "product": {"name": "Square Cookies For Squares", "order_between": [6, 12]},
                        "options": (
                            {
                                "option": {
                                    "option_type": "flavour",
                                    "name": "Gentle Cinnamon",
                                    "sku": "10010",
                                    "gtin": "4189517411291",
                                    "price": Decimal("14.99"),
                                },
                                "order_items": (
                                    {
                                        "identifier": "order_item_1",
                                        "customer_order": 1001,
                                        "quantity": 6,
                                    },
                                    {
                                        "identifier": "order_item_3",
                                        "customer_order": 1005,
                                        "quantity": 6,
                                    },
                                ),
                                "inventory_records": (
                                    {
                                        # This exists as a way to associate between inventory entries.
                                        "identifier": "inventory_record_1",
                                        "when": datetime.datetime(2023, 12, 12, 12, 0, 0),
                                        "quantity": 6,
                                        "reason": ("received_inventory", True),
                                        "archived": True,
                                        "is_added": True,
                                        "cost": Decimal("7.56"),
                                    },
                                    {
                                        "when": datetime.datetime(2023, 12, 13, 13, 0, 0),
                                        "quantity": 6,
                                        "reason": ("order_fulfillment", False),
                                        "archived": True,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_1",
                                        "price": Decimal("14.99"),
                                        "margin": Decimal("7.43"),
                                    },
                                    {
                                        "identifier": "inventory_record_2",
                                        "when": datetime.datetime(2024, 2, 5, 11, 0, 0),
                                        "quantity": 6,
                                        "reason": ("received_inventory", True),
                                        "archived": False,
                                        "is_added": True,
                                        "cost": Decimal("7.56"),
                                    },
                                    {
                                        "when": datetime.datetime(2024, 3, 13, 16, 0, 0),
                                        "quantity": 6,
                                        "reason": ("order_fulfillment", False),
                                        "archived": False,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_2",
                                        "order_item": "order_item_3",
                                        "price": Decimal("14.99"),
                                        "margin": Decimal("7.43"),
                                    },
                                ),
                            },
                            {
                                "option": {
                                    "option_type": "size",
                                    "name": "Sweet Sugar",
                                    "sku": "10011",
                                    "gtin": "4189517411292",
                                    "price": Decimal("14.99"),
                                },
                                "order_items": (
                                    {
                                        "identifier": "order_item_1",
                                        "customer_order": 1002,
                                        "quantity": 4,
                                    },
                                    {
                                        "identifier": "order_item_2",
                                        "customer_order": 1004,
                                        "quantity": 4,
                                    },
                                ),
                                "inventory_records": (
                                    {
                                        # This exists as a way to associate between inventory entries.
                                        "identifier": "inventory_record_1",
                                        "when": datetime.datetime(2023, 12, 12, 12, 0, 0),
                                        "quantity": 6,
                                        "reason": ("received_inventory", True),
                                        "archived": True,
                                        "is_added": True,
                                        "cost": Decimal("7.56"),
                                    },
                                    {
                                        "when": datetime.datetime(2023, 12, 13, 13, 0, 0),
                                        "quantity": 4,
                                        "reason": ("order_fulfillment", False),
                                        "archived": True,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_1",
                                        "price": Decimal("14.99"),
                                        "margin": Decimal("7.43"),
                                    },
                                    {
                                        "identifier": "inventory_record_2",
                                        "when": datetime.datetime(2024, 2, 5, 11, 0, 0),
                                        "quantity": 6,
                                        "reason": ("received_inventory", True),
                                        "archived": False,
                                        "is_added": True,
                                        "cost": Decimal("7.56"),
                                    },
                                    {
                                        "when": datetime.datetime(2024, 3, 13, 16, 0, 0),
                                        "quantity": 2,
                                        "reason": ("order_fulfillment", False),
                                        "archived": False,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_1",
                                        "price": Decimal("14.99"),
                                        "margin": Decimal("7.43"),
                                    },
                                    {
                                        "when": datetime.datetime(2024, 3, 13, 16, 0, 0),
                                        "quantity": 2,
                                        "reason": ("order_fulfillment", False),
                                        "archived": False,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_2",
                                        "order_item": "order_item_2",
                                        "price": Decimal("14.99"),
                                        "margin": Decimal("7.43"),
                                    },
                                ),
                            },
                        ),
                    },
                    {
                        "product": {"name": "Shaped Cookies For Drapes", "order_between": [6, 12]},
                        "options": (
                            {
                                "option": {
                                    "option_type": "size",
                                    "name": "Explosive Dynamite",
                                    "sku": "10020",
                                    "gtin": "4481104569956",
                                    "price": Decimal("15.99"),
                                },
                                "order_items": (
                                    {
                                        "identifier": "order_item_1",
                                        "customer_order": 1002,
                                        "quantity": 8,
                                    },
                                    {
                                        "identifier": "order_item_2",
                                        "customer_order": 1003,
                                        "quantity": 4,
                                    },
                                    {
                                        "identifier": "order_item_3",
                                        "customer_order": 1004,
                                        "quantity": 6,
                                    },
                                ),
                                "inventory_records": (
                                    {
                                        "identifier": "inventory_record_1",
                                        "when": datetime.datetime(2023, 12, 12, 12, 0, 0),
                                        "quantity": 12,
                                        "reason": ("received_inventory", True),
                                        "archived": True,
                                        "is_added": True,
                                        "cost": Decimal("7.01"),
                                    },
                                    {
                                        "when": datetime.datetime(2023, 12, 13, 14, 0, 0),
                                        "quantity": 8,
                                        "reason": ("order_fulfillment", False),
                                        "archived": True,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_1",
                                        "price": Decimal("15.99"),
                                        "margin": Decimal("8.98"),
                                    },
                                    {
                                        "when": datetime.datetime(2024, 1, 7, 13, 0, 0),
                                        "quantity": 4,
                                        "reason": ("order_fulfillment", False),
                                        "archived": True,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_2",
                                        "price": Decimal("15.99"),
                                        "margin": Decimal("8.98"),
                                    },
                                    {
                                        "identifier": "inventory_record_2",
                                        "when": datetime.datetime(2024, 2, 1, 12, 0, 0),
                                        "quantity": 12,
                                        "reason": ("received_inventory", True),
                                        "archived": False,
                                        "is_added": True,
                                        "cost": Decimal("12.19"),
                                    },
                                    {
                                        "when": datetime.datetime(2024, 3, 13, 12, 0, 0),
                                        "quantity": 6,
                                        "reason": ("order_fulfillment", False),
                                        "archived": False,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_2",
                                        "order_item": "order_item_3",
                                        "price": Decimal("15.99"),
                                        "margin": Decimal("8.98"),
                                    },
                                ),
                            },
                        ),
                    },
                ),
            },
            {
                "distributor": "Vibrant Looks Inc.",
                "products": (
                    {
                        "product": {"name": "Spray Paint", "order_between": [1, 6]},
                        "options": (
                            {
                                "option": {
                                    "option_type": "colour",
                                    "name": "Red",
                                    "sku": "100021",
                                    "gtin": "00313235428144",
                                    "price": Decimal("39.99"),
                                },
                                "order_items": (
                                    {
                                        "identifier": "order_item_1",
                                        "customer_order": 1001,
                                        "quantity": 3,
                                    },
                                    {
                                        "identifier": "order_item_2",
                                        "customer_order": 1003,
                                        "quantity": 4,
                                    },
                                ),
                                "inventory_records": (
                                    {
                                        "identifier": "inventory_record_1",
                                        "when": datetime.datetime(2023, 12, 5, 12, 0, 0),
                                        "quantity": 15,
                                        "reason": ("received_inventory", True),
                                        "archived": False,
                                        "is_added": True,
                                        "cost": Decimal("25.00"),
                                    },
                                    {
                                        "when": datetime.datetime(2023, 12, 13, 13, 0, 0),
                                        "quantity": 3,
                                        "reason": ("order_fulfillment", False),
                                        "archived": False,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_1",
                                        "price": Decimal("39.99"),
                                        "margin": Decimal("14.99"),
                                    },
                                    {
                                        "when": datetime.datetime(2024, 1, 7, 13, 0, 0),
                                        "quantity": 4,
                                        "reason": ("order_fulfillment", False),
                                        "archived": False,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_2",
                                        "price": Decimal("39.99"),
                                        "margin": Decimal("14.99"),
                                    },
                                ),
                            },
                            {
                                "option": {
                                    "option_type": "colour",
                                    "name": "White",
                                    "sku": "100022",
                                    "gtin": "00315654222969",
                                    "price": Decimal("44.99"),
                                },
                                "order_items": (
                                    {
                                        "identifier": "order_item_1",
                                        "customer_order": 1003,
                                        "quantity": 2,
                                    },
                                    {
                                        "identifier": "order_item_2",
                                        "customer_order": 1005,
                                        "quantity": 3,
                                    },
                                ),
                                "inventory_records": (
                                    {
                                        "identifier": "inventory_record_1",
                                        "when": datetime.datetime(2023, 12, 5, 12, 0, 0),
                                        "quantity": 12,
                                        "reason": ("received_inventory", True),
                                        "archived": False,
                                        "is_added": True,
                                        "cost": Decimal("30.00"),
                                    },
                                    {
                                        "when": datetime.datetime(2024, 1, 7, 13, 0, 0),
                                        "quantity": 2,
                                        "reason": ("order_fulfillment", False),
                                        "archived": False,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_1",
                                        "price": Decimal("44.99"),
                                        "margin": Decimal("14.99"),
                                    },
                                    {
                                        "when": datetime.datetime(2024, 3, 13, 16, 0, 0),
                                        "quantity": 3,
                                        "reason": ("order_fulfillment", False),
                                        "archived": False,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_2",
                                        "price": Decimal("44.99"),
                                        "margin": Decimal(" 14.99"),
                                    },
                                ),
                            },
                        ),
                    },
                    {
                        "product": {"name": "Paint", "order_between": [1, 8]},
                        "options": (
                            {
                                "option": {
                                    "option_type": "colour",
                                    "name": "Pearl Whisper",
                                    "sku": "100123",
                                    "gtin": "00316462430690",
                                    "price": Decimal("49.99"),
                                },
                                "order_items": (
                                    {
                                        "identifier": "order_item_1",
                                        "customer_order": 1002,
                                        "quantity": 3,
                                    },
                                    {
                                        "identifier": "order_item_2",
                                        "customer_order": 1004,
                                        "quantity": 4,
                                    },
                                ),
                                "inventory_records": (
                                    {
                                        "identifier": "inventory_record_1",
                                        "when": datetime.datetime(2023, 12, 5, 12, 0, 0),
                                        "quantity": 8,
                                        "reason": ("received_inventory", True),
                                        "archived": False,
                                        "is_added": True,
                                        "cost": Decimal("30.00"),
                                    },
                                    {
                                        "when": datetime.datetime(2023, 12, 13, 14, 0, 0),
                                        "quantity": 3,
                                        "reason": ("order_fulfillment", False),
                                        "archived": False,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_1",
                                        "price": Decimal("49.99"),
                                        "margin": Decimal("19.99"),
                                    },
                                    {
                                        "when": datetime.datetime(2024, 3, 13, 12, 0, 0),
                                        "quantity": 4,
                                        "reason": ("order_fulfillment", False),
                                        "archived": False,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_2",
                                        "price": Decimal("49.99"),
                                        "margin": Decimal("19.99"),
                                    },
                                ),
                            },
                            {
                                "option": {
                                    "option_type": "colour",
                                    "name": "Royal Crimson",
                                    "sku": "100124",
                                    "gtin": "00368135511625",
                                    "price": Decimal("54.99"),
                                },
                                "order_items": (
                                    {
                                        "identifier": "order_item_1",
                                        "customer_order": 1002,
                                        "quantity": 4,
                                    },
                                    {
                                        "identifier": "order_item_2",
                                        "customer_order": 1004,
                                        "quantity": 3,
                                    },
                                ),
                                "inventory_records": (
                                    {
                                        "identifier": "inventory_record_1",
                                        "when": datetime.datetime(2023, 12, 5, 12, 0, 0),
                                        "quantity": 12,
                                        "reason": ("received_inventory", True),
                                        "archived": True,
                                        "is_added": False,
                                        "order_item": "order_item_1",
                                        "cost": Decimal("35.00"),
                                    },
                                    {
                                        "when": datetime.datetime(2023, 12, 13, 14, 0, 0),
                                        "quantity": 6,
                                        "reason": ("order_fulfillment", False),
                                        "archived": False,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "price": Decimal("54.99"),
                                        "margin": Decimal("19.99"),
                                    },
                                    {
                                        "when": datetime.datetime(2024, 3, 13, 12, 0, 0),
                                        "quantity": 3,
                                        "reason": ("order_fulfillment", False),
                                        "archived": True,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_2",
                                        "price": Decimal("54.99"),
                                        "margin": Decimal("19.99"),
                                    },
                                    {
                                        "when": datetime.datetime(2024, 3, 17, 10, 0, 0),
                                        "quantity": 3,
                                        "reason": ("returned_inventory", True),
                                        "archived": True,
                                        "is_added": True,
                                        "added_inventory_record": "inventory_record_1",
                                        "cost": Decimal("35.00"),
                                    },
                                ),
                            },
                        ),
                    },
                ),
            },
        ):
            distributor = distributors[data["distributor"]]
            for product_data in data["products"]:
                product_data["product"]["distributor"] = distributor
                product = Product.objects.create(**product_data["product"])
                products[product.name] = product
                for product_option_data in product_data["options"]:
                    product_option_data["option"]["product"] = product
                    product_option_data["option"]["option_type"] = option_types[
                        product_option_data["option"]["option_type"]
                    ]
                    product_option = ProductOption.objects.create(**product_option_data["option"])
                    product_options[product_option.name] = product_option
                    stored_order_items = {}
                    for order_item_data in product_option_data["order_items"]:
                        order_item_data["customer_order"] = customer_orders[order_item_data["customer_order"]]
                        order_item_data["product_option"] = product_option
                        stored_order_item = None
                        if "identifier" in order_item_data:
                            stored_order_item = order_item_data["identifier"]
                            del order_item_data["identifier"]
                        order_item = OrderItem.objects.create(**order_item_data)
                        order_items[order_item.quantity] = order_item
                        if stored_order_item:
                            stored_order_items[stored_order_item] = order_item
                    stored_inventory_records = {}
                    for inventory_record_data in product_option_data["inventory_records"]:
                        if "added_inventory_record" in inventory_record_data:
                            inventory_record_data["added_inventory_record"] = stored_inventory_records[
                                inventory_record_data["added_inventory_record"]
                            ]
                        if "order_item" in inventory_record_data:
                            inventory_record_data["order_item"] = stored_order_items[
                                inventory_record_data["order_item"]
                            ]
                        inventory_record_data["reason"] = inventory_record_reasons[inventory_record_data["reason"]]
                        inventory_record_data["product_option"] = product_option
                        stored_inventory_record = None
                        if "identifier" in inventory_record_data:
                            stored_inventory_record = inventory_record_data["identifier"]
                            del inventory_record_data["identifier"]
                        inventory_record = InventoryRecord.objects.create(**inventory_record_data)
                        inventory_records[inventory_record.pk] = inventory_record
                        if stored_inventory_record:
                            stored_inventory_records[stored_inventory_record] = inventory_record

        self.products = products
        self.product_options = product_options
        self.order_items = order_items
        self.inventory_records = inventory_records

        # Make a cart for one of the customers.
        cart = Cart.objects.create(customer=customers["test_customer_1@example.com"])
        self.carts = [cart]
        CartItem.objects.create(
            cart=cart,
            product_option=self.product_options["Medium"],
            quantity=1,
        )


def idfn(val):
    if isinstance(val, dict):
        return None
    return val


@pytest.mark.django_db
class TestModelInfoSerializer:
    @pytest.fixture
    def test_data(self):
        return TestData()

    @staticmethod
    def register_viewsets():
        info.registration.get_empty_registry()
        info.register(CustomerSerializer, CustomerViewSet)
        info.register(DistributorSerializer, DistributorViewSet)
        info.register(ProductSerializer, ProductViewSet)
        info.register(OptionTypeSerializer, OptionTypeViewSet)
        info.register(ProductOptionSerializer, ProductOptionViewSet)
        info.register(CartSerializer, CartViewSet)
        info.register(CartItemSerializer, CartItemViewSet)
        info.register(CustomerOrderSerializer, CustomerOrderViewSet)
        info.register(OrderItemSerializer, OrderItemViewSet)
        info.register(InventoryRecordReasonSerializer, InventoryRecordReasonViewSet)
        info.register(InventoryRecordSerializer, InventoryRecordViewSet)

    @staticmethod
    def get_default_action(name, app_label, model_name):
        # Define common default values
        methods_dict = defaultdict(lambda: ["get"])
        methods_dict.update(
            {
                "create": ["post"],
                "update": ["put"],
                "partial_update": ["patch"],
                "destroy": ["delete"],
                "create-order": ["post"],
                "bulk-delete": ["delete"],
            }
        )
        defaults = {
            "name": name,
            "description": f"{name} {app_label}.{model_name}",
            "method_names": methods_dict[name],
            "detail": False,
        }
        # Update with specific defaults for certain actions
        if name not in ["list", "create", "bulk-delete", "abandoned-carts-count"]:
            defaults["detail"] = True
            defaults["parameters"] = ["pk"]
        return defaults

    def check_model_actions_data(self, response_data, expected_actions, app_label, model_name):
        data = response_data.data["model_actions"]
        assert {x["name"] for x in data} == expected_actions

        expected_data = [self.get_default_action(name, app_label, model_name) for name in expected_actions]

        for model_action in data:
            for expected_model_action in expected_data:
                if model_action["name"] == expected_model_action["name"]:
                    assert frozenset(model_action) == frozenset(expected_model_action), str(model_action)
                    for key, value in model_action.items():
                        assert value == expected_model_action[key], str(model_action)

    def check_model_expands_data(self, response_data, expected_data):
        data = response_data.data["model_expands"]
        assert {x["name"] for x in data} == {x["name"] for x in expected_data}, 'expected_expands -> "name": _____'
        for model_expand in data:
            for expected_model_expand in expected_data:
                if model_expand["name"] == expected_model_expand["name"]:
                    assert frozenset(model_expand) == frozenset(
                        expected_model_expand
                    ), f'expected_expands -> "name": "{model_expand["name"]}" -> {{keys}}'
                    for key, value in model_expand.items():
                        if key == "content_type":  # We don't want to test the pk of the content type.
                            value = None
                        elif key == settings.REST_FLEX_FIELDS["FIELDS_PARAM"]:
                            self.check_model_fields(
                                value,
                                expected_model_expand[settings.REST_FLEX_FIELDS["FIELDS_PARAM"]],
                                f'expected_expands -> "name": "{model_expand["name"]}"',
                            )
                            continue
                        assert (
                            value == expected_model_expand[key]
                        ), f'expected_expands -> "name": "{model_expand["name"]}" -> {key}'

    def check_model_fields(self, data, expected_data, extra_key=None):
        if extra_key is not None:
            assert frozenset(data) == frozenset(expected_data), f"{extra_key} -> FIELDS_PARAM -> {{keys}}"
        else:
            assert frozenset(data) == frozenset(expected_data), "expected_fields -> {{keys}}"
        for field_name, field_data in data.items():
            if field_name == "pk":
                if extra_key is not None:
                    assert field_data == expected_data[field_name], f'{extra_key} -> FIELDS_PARAM -> "pk"'
                else:
                    assert field_data == expected_data[field_name], 'expected_fields -> "pk"'
            else:
                for expected_field_name, expected_field_data in expected_data.items():
                    if field_name == expected_field_name:
                        if extra_key is not None:
                            failure_msg = f"{extra_key} -> FIELDS_PARAM -> {field_name}"
                        else:
                            failure_msg = f"expected_fields -> {field_name}"
                        assert frozenset(field_data) == frozenset(expected_field_data), f"{failure_msg} -> {{keys}}"
                        for key, value in field_data.items():
                            assert value == expected_field_data[key], f"{failure_msg} -> {key}"

    def check_model_fields_data(self, response_data, expected_data):
        self.check_model_fields(response_data.data["model_fields"], expected_data)

    @staticmethod
    def check_model_filtering_data(response_data, expected_data):
        data = response_data.data["model_filtering"]
        assert {x["name"] for x in data} == {x["name"] for x in expected_data}
        for model_filter in data:
            for expected_model_filter in expected_data:
                if model_filter["name"] == expected_model_filter["name"]:
                    assert frozenset(model_filter) == frozenset(expected_model_filter), str(model_filter)
                    for key, value in model_filter.items():
                        assert value == expected_model_filter[key], str(model_filter)

    @staticmethod
    def check_model_ordering_data(response_data, expected_data):
        data = response_data.data["model_ordering"]
        assert {x["name"] for x in data} == {x["name"] for x in expected_data}
        for model_order in data:
            for expected_model_order in expected_data:
                if model_order["name"] == expected_model_order["name"]:
                    assert frozenset(model_order) == frozenset(expected_model_order), str(model_order)
                    for key, value in model_order.items():
                        assert value == expected_model_order[key], str(model_order)

    @staticmethod
    def check_model_permissions_data(response_data, expected_data):
        data = response_data.data["model_permissions"]
        assert {x["codename"] for x in data} == {x["codename"] for x in expected_data}
        for model_permission in data:
            for expected_model_permission in expected_data:
                if model_permission["codename"] == expected_model_permission["codename"]:
                    assert frozenset(model_permission) == frozenset(expected_model_permission), str(model_permission)
                    for key, value in model_permission.items():
                        assert value == expected_model_permission[key], str(model_permission)

    def test_info_list(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response = api_client.get(reverse("info.model_info-list"), format="json")

        assert response.status_code == 200, str(response.data)
        assert response.data["totalRecords"] == 11

    @pytest.mark.parametrize(
        "app_label, model_name, kwargs",
        DETAIL_PARAMETRIZE,  # pytest likes to dump the whole def, so we move the parameterize details elsewhere
    )
    def test_info_detail(
        self,
        test_data,
        api_client,
        app_label,
        model_name,
        kwargs,
    ):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response = api_client.get(
            reverse(
                "info.model_info-detail",
                args=(
                    app_label,
                    model_name,
                ),
            ),
            format="json",
            data={
                settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: [
                    "model_actions",
                    "model_expands",
                    "model_fields",
                    "model_filtering",
                    "model_ordering",
                    "model_permissions",
                ],
            },
        )

        assert response.status_code == 200, pformat(response.data)
        assert response.data["verbose_name"] == kwargs["verbose_name"]
        assert response.data["verbose_name_plural"] == kwargs["verbose_name_plural"]
        self.check_model_actions_data(response, kwargs["expected_actions"], app_label, model_name)
        self.check_model_expands_data(response, kwargs["expected_expands"])
        self.check_model_fields_data(response, kwargs["expected_fields"])
        self.check_model_filtering_data(response, kwargs["expected_filtering"])
        self.check_model_ordering_data(response, kwargs["expected_ordering"])
        self.check_model_permissions_data(response, kwargs["expected_permissions"])


@pytest.mark.django_db
class TestModelInfoChoicesSerializer:
    @pytest.fixture
    def test_data(self):
        return TestData()

    @staticmethod
    def register_viewsets():
        info.registration.get_empty_registry()
        info.register(CustomerSerializer, CustomerViewSet)
        info.register(DistributorSerializer, DistributorViewSet)
        info.register(ProductSerializer, ProductViewSet)
        info.register(OptionTypeSerializer, OptionTypeViewSet)
        info.register(ProductOptionSerializer, ProductOptionViewSet)
        info.register(CartSerializer, CartViewSet)
        info.register(CartItemSerializer, CartItemViewSet)
        info.register(CustomerOrderSerializer, CustomerOrderViewSet)
        info.register(OrderItemSerializer, OrderItemViewSet)
        info.register(InventoryRecordReasonSerializer, InventoryRecordReasonViewSet)
        info.register(InventoryRecordSerializer, InventoryRecordViewSet)

    @pytest.mark.parametrize(
        "app_label, model_name, field_name, kwargs",
        DETAIL_CHOICES_PARAMETRIZE,  # pytest likes to dump the whole def, so we move the parameterize details elsewhere
        ids=idfn,
    )
    def test_info_choices_list_customer(
        self,
        test_data,
        api_client,
        app_label,
        model_name,
        field_name,
        kwargs,
    ):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response = api_client.get(
            reverse(
                "info.model_info_choices-list",
                args=(
                    app_label,
                    model_name,
                    field_name,
                ),
            ),
            format="json",
        )

        # The customer is not able to list customer orders or inventory entries.
        match (app_label, model_name, field_name):
            case (
                ("store", "cart", "customer")
                | ("store", "cartitem", "cart")
                | ("store", "customerorder", "customer")
                | ("store", "inventoryrecord", "added_inventory_record")
                | ("store", "inventoryrecord", "reason")
                | ("store", "orderitem", "customer_order")
            ):
                assert response.status_code == 403, pformat(response.data)

            case _:
                assert response.status_code == 200, f"{(app_label, model_name, field_name)}\n\n{pformat(response.data)}"

                choices = kwargs["choices"]

                assert response.data["totalRecords"] == len(choices)
                assert frozenset(result["label"] for result in response.data["results"]) == frozenset(choices)

    @pytest.mark.parametrize(
        "app_label, model_name, field_name, kwargs",
        DETAIL_CHOICES_PARAMETRIZE,  # pytest likes to dump the whole def, so we move the parameterize details elsewhere
        ids=idfn,
    )
    def test_info_choices_list_admin(
        self,
        test_data,
        api_client,
        app_label,
        model_name,
        field_name,
        kwargs,
    ):
        user = test_data.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response = api_client.get(
            reverse(
                "info.model_info_choices-list",
                args=(
                    app_label,
                    model_name,
                    field_name,
                ),
            ),
            format="json",
        )

        assert response.status_code == 200, f"{(app_label, model_name, field_name)}\n\n{pformat(response.data)}"

        choices = kwargs["choices"]
        assert response.data["totalRecords"] == len(choices)

        match (app_label, model_name, field_name):
            case ("store", "inventoryrecord", "added_inventory_record"):
                # Remove the date from the label.  The date has 2
                # dashes and the 3rd is the separator after the date.
                assert frozenset(
                    "-".join(result["label"].split("-")[3:]).strip() for result in response.data["results"]
                ) == frozenset(choices)

            case _:
                assert frozenset(result["label"] for result in response.data["results"]) == frozenset(choices)

    def test_info_choices_list_invalid_field_on_model_with_choice_fields(self, test_data, api_client):
        user = test_data.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response = api_client.get(
            reverse(
                "info.model_info_choices-list",
                args=(
                    "store",
                    "product",
                    "name",
                ),
            ),
            format="json",
        )

        assert response.status_code == 400, pformat(response.data)
        assert response.data["non_field_errors"] == [
            "Invalid field. Valid fields with choices are distributor, tangible."
        ]

    def test_info_choices_list_invalid_field_on_model_with_no_choice_fields(self, test_data, api_client):
        user = test_data.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response = api_client.get(
            reverse(
                "info.model_info_choices-list",
                args=(
                    "store",
                    "distributor",
                    "name",
                ),
            ),
            format="json",
        )

        assert response.status_code == 400, pformat(response.data)
        assert response.data["non_field_errors"] == ["Invalid field. No choice fields found on store.Distributor."]


@pytest.mark.django_db
class TestModelInfoErrsSerializer:
    @pytest.fixture
    def test_data(self):
        return TestData()

    @staticmethod
    def register_viewsets():
        info.registration.get_empty_registry()
        info.register(NoExpandableFieldsDataSerializer, NoExpandableFieldsDataViewSet)

    def test_no_expandable_field_data(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        NoExpandableFieldsData.objects.create(name="Test")

        self.register_viewsets()

        response = api_client.get(
            reverse(
                "info.model_info-detail",
                args=(
                    "erring",
                    "noexpandablefieldsdata",
                ),
            ),
            format="json",
            data={
                settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: [
                    "model_expands",
                ],
            },
        )

        assert response.status_code == 500, response.status_code

        assert b"No expandable_fields_data specified for field." in response.content, response.content
        assert (
            b"tests.erring.serializers.NoExpandableFieldsDataSerializer.get_test_function" in response.content
        ), response.content
