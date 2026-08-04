# Serializers to use with info.
import drf_writable_nested
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import serializers

from tests.fields import RangeField
from tests.store import models
from vueda.core.exceptions import VuedaValidationError
from vueda.core.serializers import GenericForeignKeySerializer
from vueda.core.serializers import VuedaHistorySerializer
from vueda.core.serializers import VuedaReadonlySerializer
from vueda.core.serializers import VuedaSerializer
from vueda.user.serializers import UserSerializer
from vueda.workflow.serializers import HasWorkflowSerializerMixin


class CustomerSerializer(VuedaHistorySerializer):
    user = serializers.PrimaryKeyRelatedField(
        queryset=get_user_model().objects.filter(is_system=False),
    )
    formatted_name = serializers.CharField(source="data.formatted_name", read_only=True)
    number_of_ordered_products = serializers.SerializerMethodField()

    class Meta(VuedaHistorySerializer.Meta):
        model = models.Customer
        fields = [
            "id",
            "user",
            "number_of_ordered_products",
        ] + VuedaHistorySerializer.Meta.fields
        expandable_fields = {
            "user": (
                UserSerializer,
                {
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: [
                        "id",
                        "email",
                        "name",
                        "groups",
                    ],
                },
            ),
            "dict_data": serializers.SerializerMethodField,
            "single_value": serializers.SerializerMethodField,
        }
        expandable_fields.update(VuedaHistorySerializer.Meta.expandable_fields)

    def get_number_of_ordered_products(self, obj):
        return 20

    def get_expandable_fields(self):
        expandable_fields = super().get_expandable_fields()

        for expandable_field in expandable_fields:
            match expandable_field["name"]:
                case "dict_data":
                    expandable_field["read_only"] = True
                    expandable_field[settings.REST_FLEX_FIELDS["FIELDS_PARAM"]] = {
                        "name": {
                            "label": "Name",
                            "type_db": None,
                            "type_model": None,
                            "type_serializer": "CharField",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "choices": False,
                        },
                    }
                case "single_value":
                    expandable_field["read_only"] = True
                    expandable_field["type_db"] = None
                    expandable_field["type_model"] = None
                    expandable_field["type_serializer"] = "CharField"

        return expandable_fields

    def get_schema_expandable_fields(self):  # pragma: no cover
        expandable_fields = super().get_schema_expandable_fields()

        expandable_fields.extend(
            (
                {
                    "name": "dict_data",
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
                },
            )
        )

        return expandable_fields

    def get_dict_data(self, instance):
        return {"name": "Test"}

    def get_single_value(self, instance):
        return "Test"


class CustomerDataSerializer(VuedaReadonlySerializer):
    class Meta(VuedaReadonlySerializer.Meta):
        model = models.CustomerData
        fields = ["id", "customer"] + VuedaSerializer.Meta.fields


class DistributorSerializer(VuedaHistorySerializer):
    class Meta(VuedaHistorySerializer.Meta):
        model = models.Distributor
        fields = [
            "id",
            "name",
            "description",
        ] + VuedaHistorySerializer.Meta.fields


class ProductSerializer(VuedaHistorySerializer):
    internal_comments = serializers.ListField(child=serializers.CharField(), required=False)
    current_sale_date = RangeField(required=False)  # This mimics the range field in integration, with no children.
    distributor = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta(VuedaHistorySerializer.Meta):
        model = models.Product
        fields = [
            "id",
            "distributor",
            "name",
            "description",
            "disabled",
            "tangible_type",
            "special_care",
            "order_between",
            "last_ten_order_betweens",
            "current_sale_date",
            "future_sale_dates",
            "reviews",
            "internal_comments",
            "last_ordered",
        ] + VuedaHistorySerializer.Meta.fields
        expandable_fields = {
            "distributor": (
                DistributorSerializer,
                {},
            )
        }
        expandable_fields.update(VuedaHistorySerializer.Meta.expandable_fields)

    def validate(self, data):
        data = super().validate(data)

        distributor_id = data["product"].distributor_id
        option_type_id = data["option_type_id"]
        name = data["name"]

        queryset = models.Product.object.filter(
            product__distributor_id=distributor_id, option_type_id=option_type_id, name=name
        )

        if self.instance:
            queryset = queryset.exclude(pk=self.pk)

        if queryset.exists():
            raise VuedaValidationError("A product with this distributor, option_type, and name already exists.")

        return data


class OptionTypeSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.OptionType
        fields = [
            "id",
            "code",
            "name",
        ] + VuedaSerializer.Meta.fields


class ProductOptionSerializer(VuedaHistorySerializer):
    class Meta(VuedaHistorySerializer.Meta):
        model = models.ProductOption
        fields = [
            "id",
            "product",
            "option_type",
            "name",
            "sku",
            "gtin",
            "price",
            "disabled",
            "quantity_available",
        ] + VuedaHistorySerializer.Meta.fields
        expandable_fields = {
            "option_type": (
                OptionTypeSerializer,
                {
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: [
                        "id",
                        "code",
                        "name",
                    ],
                },
            ),
            "product": (
                ProductSerializer,
                {
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: [
                        "id",
                        "distributor",
                        "name",
                        "disabled",
                        "tangible_type",
                    ],
                },
            ),
        }
        expandable_fields.update(VuedaHistorySerializer.Meta.expandable_fields)


class CartSerializer(VuedaSerializer):
    formatted_name = serializers.CharField(source="data.formatted_name", read_only=True)
    cart_items = serializers.PrimaryKeyRelatedField(queryset=models.CartItem.objects.all(), many=True)

    class Meta(VuedaSerializer.Meta):
        model = models.Cart
        fields = [
            "id",
            "customer",
            "last_modified",
            "cart_items",
        ] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "customer": (
                CustomerSerializer,
                {
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: [
                        "id",
                        "user",
                    ],
                },
            ),
            "cart_items": (
                "tests.store.serializers.CartItemSerializer",
                {
                    "many": True,
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: [
                        "id",
                        "product_option",
                        "quantity",
                    ],
                },
            ),
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)


class CartItemSerializer(VuedaSerializer):
    formatted_name = serializers.CharField(source="data.formatted_name", read_only=True)

    class Meta(VuedaSerializer.Meta):
        model = models.CartItem
        fields = [
            "id",
            "cart",
            "product_option",
            "quantity",
        ] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "cart": (
                CartSerializer,
                {
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: [
                        "id",
                        "customer",
                    ],
                },
            ),
            "product_option": (
                ProductOptionSerializer,
                {
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: [
                        "id",
                        "product",
                        "option_type",
                        "name",
                        "sku",
                        "gtin",
                        "price",
                        "disabled",
                    ],
                },
            ),
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)


class OrderStateSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.OrderState
        fields = [
            "id",
            "code",
            "name",
        ] + VuedaSerializer.Meta.fields


class OrderItemSerializer(VuedaSerializer):
    formatted_name = serializers.CharField(source="data.formatted_name", read_only=True)

    class Meta(VuedaSerializer.Meta):
        model = models.OrderItem
        fields = [
            "id",
            "customer_order",
            "product_option",
            "quantity",
        ] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "customer_order": (
                "tests.store.serializers.CustomerOrderSerializer",
                {
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: [
                        "id",
                        "order_number",
                        "when",
                        "customer",
                        "order_state",
                    ],
                },
            ),
            "product_option": (
                ProductOptionSerializer,
                {
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: [
                        "id",
                        "product",
                        "option_type",
                        "name",
                        "sku",
                        "gtin",
                        "price",
                        "disabled",
                    ],
                },
            ),
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)


class CustomerOrderSerializer(HasWorkflowSerializerMixin, VuedaHistorySerializer):
    class Meta(VuedaHistorySerializer.Meta):
        model = models.CustomerOrder
        fields = (
            [
                "id",
                "order_number",
                "when",
                "customer",
                "order_items",
                "order_state",
                "shipping_method",
            ]
            + VuedaHistorySerializer.Meta.fields
            + HasWorkflowSerializerMixin.Meta.fields
        )
        expandable_fields = {
            "customer": (
                CustomerSerializer,
                {
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: [
                        "id",
                        "user",
                    ],
                },
            ),
            "order_state": (
                OrderStateSerializer,
                {
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: [
                        "id",
                        "code",
                        "name",
                    ]
                },
            ),
            "order_items": (
                OrderItemSerializer,
                {
                    "many": True,
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: [
                        "id",
                        "product_option",
                        "quantity",
                    ],
                },
            ),
        }
        expandable_fields.update(VuedaHistorySerializer.Meta.expandable_fields)


class InventoryRecordReasonSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.InventoryRecordReason
        fields = [
            "id",
            "name",
            "code",
            "is_added_reason",
        ] + VuedaSerializer.Meta.fields


class InventoryRecordSerializer(VuedaSerializer):
    formatted_name = serializers.CharField(source="data.formatted_name", read_only=True)

    class Meta(VuedaSerializer.Meta):
        model = models.InventoryRecord
        fields = [
            "id",
            "product_option",
            "when",
            "quantity",
            "reason",
            "archived",
            "is_added",
            "cost",
            "added_inventory_record",
            "order_item",
            "price",
            "margin",
        ] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "product_option": (
                ProductOptionSerializer,
                {
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: [
                        "id",
                        "product",
                        "option_type",
                        "name",
                        "sku",
                        "gtin",
                        "price",
                        "disabled",
                    ],
                },
            ),
            "reason": (
                InventoryRecordReasonSerializer,
                {
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: [
                        "id",
                        "name",
                        "code",
                        "is_added_reason",
                    ],
                },
            ),
            "added_inventory_record": (
                "tests.store.serializers.InventoryRecordSerializer",
                {
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: [
                        "id",
                        "product",
                        "when",
                        "quantity",
                        "reason",
                        "archived",
                        "is_added",
                        "cost",
                        "added_inventory_record",
                        "order_item",
                        "price",
                        "margin",
                    ],
                },
            ),
            "order_item": (
                OrderItemSerializer,
                {
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: [
                        "id",
                        "order",
                        "product_option",
                        "quantity",
                    ],
                },
            ),
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)


class PackingBoxSerializer(VuedaSerializer):
    name = serializers.CharField(read_only=True)
    depth = serializers.DecimalField(12, 4, read_only=True)
    height = serializers.DecimalField(12, 4, read_only=True)
    width = serializers.DecimalField(12, 4, read_only=True)
    carrying_weight = serializers.DecimalField(12, 4, read_only=True)
    in_stock = serializers.BooleanField(read_only=True)
    number_in_stock = serializers.IntegerField(read_only=True)

    class Meta(VuedaSerializer.Meta):
        model = models.PackingBox
        fields = [
            "id",
            "name",
            "depth",
            "height",
            "width",
            "carrying_weight",
            "in_stock",
            "number_in_stock",
        ] + VuedaSerializer.Meta.fields


class InvoiceLineSerializer(VuedaHistorySerializer):
    class Meta(VuedaHistorySerializer.Meta):
        model = models.InvoiceLine
        fields = ["id", "name", "amount"] + VuedaHistorySerializer.Meta.fields


class InvoiceSerializer(VuedaSerializer):
    invoice_lines = InvoiceLineSerializer(many=True, required=False)

    class Meta(VuedaSerializer.Meta):
        model = models.Invoice
        fields = ["id", "name", "invoice_lines"] + VuedaSerializer.Meta.fields


# Plain drf_writable_nested serializers (no vueda fixes) — used to detect if
# drf-writable-nested ever fixes the create-before-delete ordering bug itself.
class InvoiceLineBaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.InvoiceLine
        fields = ["id", "name", "amount"]


class InvoiceBaseSerializer(
    drf_writable_nested.NestedUpdateMixin,
    drf_writable_nested.NestedCreateMixin,
    serializers.ModelSerializer,
):
    invoice_lines = InvoiceLineBaseSerializer(many=True, required=False)

    class Meta:
        model = models.Invoice
        fields = ["id", "name", "invoice_lines"]


class OrderCompositePKSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.OrderCompositePK
        fields = [
            "id",
            "order_number",
            "order_date",
            "order_items_composite_pks",
        ] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "order_items_composite_pks": (
                "tests.store.serializers.OrderItemCompositePKSerializer",
                {
                    "many": True,
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: [
                        "pk",
                        "order",
                        "product",
                        "quantity",
                    ],
                },
            ),
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)


class ProductCompositePKSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.ProductCompositePK
        fields = [
            "id",
            "name",
        ] + VuedaSerializer.Meta.fields


class OrderItemCompositePKSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.OrderItemCompositePK
        fields = [
            "pk",
            "order",
            "product",
            "quantity",
        ] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "order": (
                OrderCompositePKSerializer,
                {
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: [
                        "id",
                        "order_number",
                        "order_date",
                    ],
                },
            ),
            "product": (
                ProductCompositePKSerializer,
                {
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: [
                        "id",
                        "name",
                    ],
                },
            ),
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)


class OrderItemAltCompositePKSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.OrderItemAltCompositePK
        fields = [
            "pk",
            "order",
            "product",
            "quantity",
        ] + VuedaSerializer.Meta.fields


class DistributorProxySerializer(VuedaHistorySerializer):
    class Meta(VuedaHistorySerializer.Meta):
        model = models.DistributorProxy
        fields = [
            "id",
            "name",
            "description",
        ] + VuedaHistorySerializer.Meta.fields


class NoteSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.Note
        fields = ["id", "content_type", "object_id", "text"] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "content_object": (
                GenericForeignKeySerializer,
                {
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: [
                        # Model targetted specifiers.
                        "_store__distributor__*",
                        "_store__product__description",
                        "_store__product__id",
                        "_store__product__name",
                        # quantity isn't defined on ProductSerializer, so adding it here won't cause it to be returned.
                        "_store__product__quantity",
                    ],
                    settings.REST_FLEX_FIELDS["OMIT_PARAM"]: [
                        "_store__distributor__description",
                    ],
                },
            ),
        }


class AnotherNoteSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.Note
        fields = ["id", "content_type", "object_id", "text"] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "content_object": GenericForeignKeySerializer,
        }


class NoteStaticOmitSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.Note
        fields = ["id", "content_type", "object_id", "text"] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "content_object": (
                GenericForeignKeySerializer,
                {
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: ["id", "name"],
                    settings.REST_FLEX_FIELDS["OMIT_PARAM"]: ["available_actions"],
                },
            ),
        }
