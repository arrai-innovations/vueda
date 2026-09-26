"""OpenAPI schema descriptions for the sections of a vueda.info model info response.

The serializers here describe the JSON that ``ModelInfoSerializer`` builds for each expandable section.
They never serialize data; schema generation reads them, so each section becomes a named component.
"""

__all__ = (
    "CHOICES_TRUE_SCHEMA_DESCRIPTION",
    "MODEL_INFO_DETAIL_EXAMPLES",
    "ModelInfoActionSerializer",
    "ModelInfoChoiceSerializer",
    "ModelInfoColumnTotalsSerializer",
    "ModelInfoExpandSerializer",
    "ModelInfoFieldSerializer",
    "ModelInfoFilterSerializer",
    "ModelInfoFilterValidatorSerializer",
    "ModelInfoOrderingFieldSerializer",
    "ModelInfoOrderingSerializer",
    "ModelInfoPermissionSerializer",
)

from django.conf import settings
from rest_framework import serializers

from vueda.core.open_api import conditional_extend_schema_field_decorator


CHOICES_TRUE_SCHEMA_DESCRIPTION = (
    "If &quot;choices&quot; is true, this will be in the results, because you need it to get the choices "
    'with <a href="#tag/vueda.info/operation/vueda.info_model_info_choices_list">List field choices</a>.'
)

CHOICE_ITEM_SCHEMA = {
    "type": "object",
    "properties": {
        "label": {"type": "string", "description": "Displayed name for the choice."},
        "value": {"description": "Primary key or code for the choice."},
    },
    "required": ["label", "value"],
}


@conditional_extend_schema_field_decorator(
    {
        "oneOf": [
            {"type": "array", "items": CHOICE_ITEM_SCHEMA, "description": "The choices to choose from."},
            {
                "type": "boolean",
                "description": (
                    "True when the choices come from a model: fetch them from the choices endpoint named by "
                    "`app_label` and `model`. False when the field has no choices."
                ),
            },
        ]
    }
)
class ChoicesField(serializers.Field):
    """A list of choices, or a boolean that says whether model-backed choices exist."""


@conditional_extend_schema_field_decorator({"oneOf": [{"type": "number"}, {"type": "string"}]})
class LimitField(serializers.Field):
    """A limit value: a number, or a string for limits such as dates that JSON has no type for."""


class ModelInfoChoiceSerializer(serializers.Serializer):
    label = serializers.CharField(help_text="Displayed name for the choice.")
    value = serializers.JSONField(help_text="The stored value the label stands for.")


class ModelInfoPermissionSerializer(serializers.Serializer):
    codename = serializers.CharField(help_text="Permission codename, such as `create_customerorder`.")
    name = serializers.CharField(help_text="Permission name, such as `Can create customer order`.")


class ModelInfoActionSerializer(serializers.Serializer):
    name = serializers.CharField(help_text="Action name: a CRUDL action or the URL name of an extra action.")
    description = serializers.CharField()
    detail = serializers.BooleanField(help_text="Whether the action acts on one object.")
    bulk = serializers.BooleanField(help_text="Whether the action acts on several objects at once.")
    method_names = serializers.ListField(
        child=serializers.ChoiceField(choices=["get", "post", "put", "patch", "delete"]),
        help_text="HTTP methods the action accepts.",
    )
    parameters = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text="Additional parameters needed to call the action, such as `pk`.",
    )


class ModelInfoFieldSerializer(serializers.Serializer):
    label = serializers.CharField(help_text="Displayed name of the field.")
    type_db = serializers.CharField(allow_null=True, help_text="Database field type, or null without a column.")
    type_model = serializers.CharField(
        allow_null=True, help_text="Django model field type, or null without a model field."
    )
    type_serializer = serializers.CharField(help_text="Django REST framework serializer field class name.")
    many = serializers.BooleanField(help_text="Whether the value is a list.")
    read_only = serializers.BooleanField()
    required = serializers.BooleanField(help_text="Whether a value is required on submit.")
    hidden = serializers.BooleanField(help_text="Whether the serializer field sets `style={'hidden': True}`.")
    choices = ChoicesField()
    app_label = serializers.CharField(required=False, help_text=CHOICES_TRUE_SCHEMA_DESCRIPTION)
    model = serializers.CharField(required=False, help_text=CHOICES_TRUE_SCHEMA_DESCRIPTION)
    list_default = serializers.BooleanField(
        required=False, help_text="Present when the serializer field sets `style={'list_default': ...}`."
    )
    pk = serializers.BooleanField(required=False, help_text="Present, and true, on the primary key field.")
    help_text = serializers.CharField(required=False)
    max_value = LimitField(required=False)
    min_value = LimitField(required=False)
    max_length = serializers.IntegerField(required=False)
    min_length = serializers.IntegerField(required=False)
    max_digits = serializers.IntegerField(required=False)
    decimal_places = serializers.IntegerField(required=False)
    display_choices = ModelInfoChoiceSerializer(
        many=True, required=False, help_text="Labels for read-only display, from `field_display_choices`."
    )


class ModelInfoExpandSerializer(serializers.Serializer):
    name = serializers.CharField(help_text="Expandable field name, as sent in the `e` query parameter.")
    read_only = serializers.BooleanField()
    many = serializers.BooleanField(help_text="Whether the expanded value is a list.")
    app_label = serializers.CharField(required=False, help_text="Present when the expand has a related model.")
    model = serializers.CharField(required=False, help_text="Present when the expand has a related model.")
    type_db = serializers.CharField(required=False, allow_null=True)
    type_model = serializers.CharField(required=False, allow_null=True)
    type_serializer = serializers.CharField(required=False, allow_null=True)

    def get_fields(self):
        # The nested field metadata sits under the flex-fields fields parameter name, which is a setting.
        fields = super().get_fields()
        fields[settings.REST_FLEX_FIELDS["FIELDS_PARAM"]] = serializers.DictField(
            child=ModelInfoFieldSerializer(),
            required=False,
            help_text="Field metadata of the related serializer, keyed by field name.",
        )
        return fields


class ModelInfoOrderingFieldSerializer(serializers.Serializer):
    name = serializers.CharField(help_text="Name to send in the ordering query parameter.")
    type = serializers.ChoiceField(choices=["alpha", "boolean", "date", "datetime", "numeric", "time"])
    ascending = serializers.BooleanField(
        required=False, help_text="Present on default ordering terms: the direction the term sorts in."
    )


class ModelInfoOrderingSerializer(serializers.Serializer):
    default = serializers.ListField(
        child=serializers.CharField(), help_text="Names applied when a request sends no ordering."
    )

    def get_fields(self):
        # Declared here because a class attribute named `fields` would shadow `Serializer.fields`.
        fields = super().get_fields()
        fields["fields"] = ModelInfoOrderingFieldSerializer(many=True, help_text="The fields a client may order by.")
        return fields


class ModelInfoFilterValidatorSerializer(serializers.Serializer):
    code = serializers.CharField(required=False)
    message = serializers.CharField(required=False)


class ModelInfoFilterSerializer(serializers.Serializer):
    label = serializers.CharField(help_text="Displayed name of the filter.")
    type_db = serializers.CharField(allow_null=True)
    type_model = serializers.CharField(allow_null=True)
    type_filter = serializers.CharField(help_text="The form field class of the django-filter filter.")
    lookup_exprs = serializers.ListField(child=serializers.CharField())
    required = serializers.BooleanField()
    hidden = serializers.BooleanField(help_text="Whether the filter's widget is hidden.")
    choices = ChoicesField()
    app_label = serializers.CharField(required=False, help_text=CHOICES_TRUE_SCHEMA_DESCRIPTION)
    model = serializers.CharField(required=False, help_text=CHOICES_TRUE_SCHEMA_DESCRIPTION)
    filterset_name = serializers.CharField(required=False, help_text="Filterset class that serves the choices.")
    help_text = serializers.CharField(required=False)
    max_value = LimitField(required=False)
    min_value = LimitField(required=False)
    max_length = serializers.IntegerField(required=False)
    min_length = serializers.IntegerField(required=False)
    max_digits = serializers.IntegerField(required=False)
    decimal_places = serializers.IntegerField(required=False)
    step = LimitField(required=False)
    empty_label = serializers.CharField(required=False, allow_null=True)
    empty_value = serializers.JSONField(required=False)
    null_label = serializers.CharField(required=False, allow_null=True)
    null_value = serializers.JSONField(required=False)
    error_messages = serializers.DictField(
        child=serializers.CharField(), required=False, help_text="Error messages keyed by code."
    )
    input_formats = serializers.ListField(child=serializers.CharField(), required=False)
    input_type = serializers.CharField(required=False, help_text="HTML input type of the filter's widget.")
    suffixes = serializers.ListField(
        child=serializers.CharField(), required=False, help_text="Suffixes appended to the filter name."
    )
    validators = ModelInfoFilterValidatorSerializer(many=True, required=False)


class ModelInfoColumnTotalsSerializer(serializers.Serializer):
    def get_fields(self):
        # Declared here because a class attribute named `fields` would shadow `Serializer.fields`.
        fields = super().get_fields()
        fields["fields"] = serializers.ListField(
            child=serializers.CharField(), help_text="Column total names a list request may ask for."
        )
        return fields


# Examples for the model info detail endpoint, one per expandable section. The model info tests check each
# example against the published schema.
MODEL_INFO_DETAIL_EXAMPLES = {
    "GetModelInfoNotExpandedExample": {
        "summary": "Expanded - Nothing",
        "description": "uri: /routes/vueda.info/model_info/store/distributor/",
        "value": {
            "id": 1,
            "app_label": "store",
            "model": "distributor",
            "verbose_name": "distributor",
            "verbose_name_plural": "distributors",
            "workflow_enabled": False,
        },
    },
    "GetModelInfoActionsExpandedExample": {
        "summary": "Expanded - model_actions",
        "description": "uri: /routes/vueda.info/model_info&ZeroWidthSpace;/store/customer/<br>data: e='model_actions'",
        "value": {
            "id": 6,
            "app_label": "store",
            "model": "customer",
            "verbose_name": "customer",
            "verbose_name_plural": "customers",
            "workflow_enabled": False,
            "model_actions": [
                {
                    "name": "list",
                    "description": "list store.customer",
                    "detail": False,
                    "bulk": False,
                    "method_names": [
                        "get",
                    ],
                },
                {
                    "name": "retrieve",
                    "description": "retrieve store.customer",
                    "detail": True,
                    "bulk": False,
                    "method_names": [
                        "get",
                    ],
                    "parameters": [
                        "pk",
                    ],
                },
                {
                    "name": "create",
                    "description": "create store.customer",
                    "detail": False,
                    "bulk": False,
                    "method_names": [
                        "post",
                    ],
                },
                {
                    "name": "update",
                    "description": "update store.customer",
                    "detail": True,
                    "bulk": False,
                    "method_names": [
                        "put",
                    ],
                    "parameters": [
                        "pk",
                    ],
                },
                {
                    "name": "partial_update",
                    "description": "partial_update store.customer",
                    "detail": True,
                    "bulk": False,
                    "method_names": [
                        "patch",
                    ],
                    "parameters": [
                        "pk",
                    ],
                },
                {
                    "name": "destroy",
                    "description": "destroy store.customer",
                    "detail": True,
                    "bulk": True,
                    "method_names": [
                        "delete",
                    ],
                    "parameters": [
                        "pk",
                    ],
                },
                {
                    "name": "history-list",
                    "description": "history-list store.customer",
                    "detail": True,
                    "bulk": False,
                    "method_names": [
                        "get",
                    ],
                    "parameters": [
                        "args",
                        "kwargs",
                    ],
                },
            ],
        },
    },
    "GetModelInfoExpandsExpandedExample": {
        "summary": "Expanded - model_expands",
        "description": "uri: /routes/vueda.info/model_info/store/product/<br>data: e='model_expands'",
        "value": {
            "id": 13,
            "app_label": "store",
            "model": "product",
            "verbose_name": "product",
            "verbose_name_plural": "products",
            "workflow_enabled": False,
            "model_expands": [
                {
                    "name": "distributor",
                    "read_only": False,
                    "many": False,
                    "app_label": "store",
                    "model": "distributor",
                    "f": {
                        "id": {
                            "choices": False,
                            "label": "ID",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "hidden": False,
                            "type_db": "AutoField",
                            "type_model": "AutoField",
                            "type_serializer": "IntegerField",
                            "max_value": 2147483647,
                            "min_value": -2147483648,
                            "pk": True,
                        },
                        "name": {
                            "choices": False,
                            "label": "Name",
                            "many": False,
                            "read_only": False,
                            "required": True,
                            "hidden": False,
                            "type_db": "CharField",
                            "type_model": "CharField",
                            "type_serializer": "CharField",
                            "max_length": 255,
                        },
                        "formatted_name": {
                            "choices": False,
                            "label": "Formatted Name",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "hidden": False,
                            "type_db": "CharField",
                            "type_model": "GeneratedField",
                            "type_serializer": "ModelField",
                        },
                        "object_revision": {
                            "choices": False,
                            "label": "Object Revision",
                            "many": False,
                            "read_only": True,
                            "required": False,
                            "hidden": False,
                            "type_db": None,
                            "type_model": None,
                            "type_serializer": "ObjectRevisionField",
                        },
                    },
                },
            ],
        },
    },
    "GetModelInfoFieldsExpandedExample": {
        "summary": "Expanded - model_fields",
        "description": "uri: /routes/vueda.info/model_info/store/customerorder/<br>data: e='model_fields'",
        "value": {
            "id": 8,
            "app_label": "store",
            "model": "customerorder",
            "verbose_name": "customer order",
            "verbose_name_plural": "customer orders",
            "workflow_enabled": False,
            "model_fields": {
                "id": {
                    "choices": False,
                    "label": "ID",
                    "many": False,
                    "read_only": True,
                    "required": False,
                    "hidden": False,
                    "type_db": "AutoField",
                    "type_model": "AutoField",
                    "type_serializer": "IntegerField",
                    "max_value": 2147483647,
                    "min_value": -2147483648,
                    "pk": True,
                },
                "order_number": {
                    "choices": False,
                    "label": "Order Number",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "hidden": False,
                    "type_db": "DecimalField",
                    "type_model": "DecimalField",
                    "type_serializer": "DecimalField",
                    "max_digits": 7,
                    "decimal_places": 0,
                },
                "when": {
                    "choices": False,
                    "label": "Date / Time",
                    "many": False,
                    "read_only": True,
                    "required": False,
                    "hidden": False,
                    "type_db": "DateTimeField",
                    "type_model": "DateTimeField",
                    "type_serializer": "DateTimeField",
                },
                "customer": {
                    "choices": True,
                    "label": "Customer",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "hidden": False,
                    "type_db": "ForeignKey",
                    "type_model": "ForeignKey",
                    "type_serializer": "PrimaryKeyRelatedField",
                    "app_label": "store",
                    "model": "customer",
                },
                "order_state": {
                    "choices": True,
                    "label": "Order State",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "hidden": False,
                    "type_db": "ForeignKey",
                    "type_model": "ForeignKey",
                    "type_serializer": "PrimaryKeyRelatedField",
                    "app_label": "store",
                    "model": "orderstate",
                },
                "shipping_method": {
                    "choices": [
                        {
                            "label": "Free",
                            "value": "free",
                        },
                        {
                            "label": "Regular",
                            "value": "regular",
                        },
                        {
                            "label": "Express",
                            "value": "express",
                        },
                    ],
                    "label": "Shipping Method",
                    "many": False,
                    "read_only": False,
                    "required": False,
                    "hidden": False,
                    "type_db": "CharField",
                    "type_model": "CharField",
                    "type_serializer": "ChoiceField",
                },
                "formatted_name": {
                    "choices": False,
                    "label": "Formatted Name",
                    "many": False,
                    "read_only": True,
                    "required": False,
                    "hidden": False,
                    "type_db": "CharField",
                    "type_model": "GeneratedField",
                    "type_serializer": "ModelField",
                },
                "object_revision": {
                    "choices": False,
                    "label": "Object Revision",
                    "many": False,
                    "read_only": True,
                    "required": False,
                    "hidden": False,
                    "type_db": None,
                    "type_model": None,
                    "type_serializer": "ObjectRevisionField",
                },
            },
        },
    },
    "GetModelInfoFilteringExpandedExample": {
        "summary": "Expanded - model_filtering",
        "description": "uri: /routes/vueda.info/model_info/store/cart/<br>data: e='model_filtering'",
        "value": {
            "id": 7,
            "app_label": "store",
            "model": "cart",
            "verbose_name": "cart",
            "verbose_name_plural": "carts",
            "workflow_enabled": False,
            "model_filtering": {
                "last_modified": {
                    "hidden": False,
                    "label": "Last modified",
                    "lookup_exprs": [],
                    "required": False,
                    "type_db": "DateTimeField",
                    "type_model": "DateTimeField",
                    "type_filter": "DateTimeRangeField",
                    "choices": False,
                    "error_messages": {
                        "invalid": "Enter a list of values.",
                        "incomplete": "Enter a complete value.",
                    },
                    "input_type": "text",
                    "suffixes": [
                        "after",
                        "before",
                    ],
                },
                "id": {
                    "hidden": True,
                    "label": "Id Is In",
                    "lookup_exprs": [
                        "in",
                    ],
                    "required": False,
                    "type_db": "AutoField",
                    "type_model": "AutoField",
                    "type_filter": "DecimalInField",
                    "choices": False,
                    "error_messages": {
                        "invalid": "Enter a number.",
                    },
                    "help_text": "Multiple values may be separated by commas.",
                    "input_type": "hidden",
                    "max_value": 2147483647,
                    "min_value": -2147483648,
                },
                "reserved_delivery_time": {
                    "hidden": False,
                    "label": "Reserved Delivery Time",
                    "lookup_exprs": [
                        "exact",
                    ],
                    "required": False,
                    "type_db": "DateTimeField",
                    "type_model": "DateTimeField",
                    "type_filter": "DateTimeField",
                    "choices": False,
                    "error_messages": {
                        "invalid": "Enter a valid date/time.",
                    },
                    "input_formats": [
                        "%Y-%m-%d %H:%M:%S",
                        "%Y-%m-%d %H:%M:%S.%f",
                        "%Y-%m-%d %H:%M",
                        "%m/%d/%Y %H:%M:%S",
                        "%m/%d/%Y %H:%M:%S.%f",
                        "%m/%d/%Y %H:%M",
                        "%m/%d/%y %H:%M:%S",
                        "%m/%d/%y %H:%M:%S.%f",
                        "%m/%d/%y %H:%M",
                        "%Y-%m-%d",
                        "%Y-%m-%d",
                        "%m/%d/%Y",
                        "%m/%d/%y",
                        "%b %d %Y",
                        "%b %d, %Y",
                        "%d %b %Y",
                        "%d %b, %Y",
                        "%B %d %Y",
                        "%B %d, %Y",
                        "%d %B %Y",
                        "%d %B, %Y",
                    ],
                    "input_type": "text",
                },
                "reserved_until": {
                    "hidden": False,
                    "label": "Reserved Until",
                    "lookup_exprs": [
                        "exact",
                    ],
                    "required": False,
                    "type_db": "TimeField",
                    "type_model": "TimeField",
                    "type_filter": "TimeField",
                    "choices": False,
                    "error_messages": {
                        "invalid": "Enter a valid time.",
                    },
                    "input_formats": [
                        "%H:%M:%S",
                        "%H:%M:%S.%f",
                        "%H:%M",
                    ],
                    "input_type": "text",
                },
                "expected_delivery_time": {
                    "hidden": False,
                    "label": "Expected Delivery Time",
                    "lookup_exprs": [
                        "exact",
                    ],
                    "required": False,
                    "type_db": "DurationField",
                    "type_model": "DurationField",
                    "type_filter": "DurationField",
                    "choices": False,
                    "error_messages": {
                        "invalid": "Enter a valid duration.",
                        "overflow": "The number of days must be between -999999999 and 999999999.",
                    },
                    "input_type": "text",
                },
                "product_name": {
                    "hidden": False,
                    "label": "Product name",
                    "lookup_exprs": [
                        "exact",
                    ],
                    "required": False,
                    "type_db": "CharField",
                    "type_model": "CharField",
                    "type_filter": "MultipleChoiceField",
                    "choices": True,
                    "app_label": "store",
                    "model": "cart",
                    "filterset_name": "CartFilterSet",
                    "empty_label": None,
                    "error_messages": {
                        "invalid_choice": "Select a valid choice. %(value)s is not one of the available choices.",
                        "invalid_list": "Enter a list of values.",
                    },
                    "input_type": "select",
                    "null_label": None,
                    "null_value": "null",
                },
                "product_quantity": {
                    "hidden": False,
                    "label": "Product quantity",
                    "lookup_exprs": [
                        "exact",
                    ],
                    "required": False,
                    "type_db": "IntegerField",
                    "type_model": "IntegerField",
                    "type_filter": "MultipleChoiceField",
                    "choices": True,
                    "app_label": "store",
                    "model": "cart",
                    "filterset_name": "CartFilterSet",
                    "empty_label": None,
                    "error_messages": {
                        "invalid_choice": "Select a valid choice. %(value)s is not one of the available choices.",
                        "invalid_list": "Enter a list of values.",
                    },
                    "input_type": "select",
                    "null_label": None,
                    "null_value": "null",
                },
            },
        },
    },
    "GetModelInfoOrderingExpandedExample": {
        "summary": "Expanded - model_ordering",
        "description": "uri: /routes/vueda.info/model_info/store/customerorder/<br>data: e='model_ordering'",
        "value": {
            "id": 8,
            "app_label": "store",
            "model": "customerorder",
            "verbose_name": "customer order",
            "verbose_name_plural": "customer orders",
            "workflow_enabled": False,
            "model_ordering": {
                "default": [],
                "fields": [
                    {
                        "name": "order_number",
                        "type": "numeric",
                    },
                    {
                        "name": "customer.user.email",
                        "type": "alpha",
                    },
                    {
                        "name": "when",
                        "type": "datetime",
                    },
                    {
                        "name": "order_state",
                        "type": "alpha",
                    },
                ],
            },
        },
    },
    "GetModelInfoPermissionsExpandedExample": {
        "summary": "Expanded - model_permissions",
        "description": "uri: /routes/vueda.info/model_info/store/customerorder/<br>data: e='model_permissions'",
        "value": {
            "id": 8,
            "app_label": "store",
            "model": "customerorder",
            "verbose_name": "customer order",
            "verbose_name_plural": "customer orders",
            "workflow_enabled": False,
            "model_permissions": [
                {
                    "codename": "create_customerorder",
                    "name": "Can create customer order",
                },
                {
                    "codename": "delete_customerorder",
                    "name": "Can delete customer order",
                },
                {
                    "codename": "fulfill_orders",
                    "name": "Can fulfill orders",
                },
                {
                    "codename": "list_customerorder",
                    "name": "Can list customer order",
                },
                {
                    "codename": "manage_customerorder",
                    "name": "Can manage customer order",
                },
                {
                    "codename": "pack_order",
                    "name": "Can pack order customer order",
                },
                {
                    "codename": "read_customerorder",
                    "name": "Can read customer order",
                },
                {
                    "codename": "update_customerorder",
                    "name": "Can update customer order",
                },
            ],
        },
    },
}
