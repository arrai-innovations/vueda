# Models to use with info.

from django.contrib.auth import get_user_model
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.contrib.postgres import fields as postgres_fields
from django.core import validators
from django.core.validators import StepValueValidator
from django.db import models
from django.db.models import F
from django.db.models import Max
from django.db.models.functions import Cast

from vueda.core.models import Lookup
from vueda.core.models import VuedaModel
from vueda.workflow.models import HasWorkflowModelMixin


class Customer(VuedaModel):
    user = models.OneToOneField(get_user_model(), on_delete=models.PROTECT)

    formatted_name = None
    formatted_name_lookup_expression = "data__formatted_name"

    class Meta(VuedaModel.Meta):
        ordering = ["user__name"]


class CustomerData(models.Model):
    customer = models.OneToOneField(Customer, on_delete=models.DO_NOTHING, related_name="data")
    formatted_name = models.CharField()

    class Meta:
        managed = False
        db_table = "customer_data"


class Distributor(VuedaModel):
    name = models.CharField(max_length=255)
    description = models.CharField(max_length=1024)

    class Meta(VuedaModel.Meta):
        pass


class TangibleType(Lookup):
    pass


class SpecialCare(VuedaModel):
    code = models.CharField(max_length=255, unique=True, db_index=True)
    field_that_contains_the_name = models.CharField(max_length=255, blank=True)

    formatted_name = None
    formatted_name_lookup_expression = "field_that_contains_the_name"

    class Meta(VuedaModel.Meta):
        pass


class Product(VuedaModel):
    distributor = models.ForeignKey(Distributor, on_delete=models.PROTECT)
    name = models.CharField(max_length=255)
    disabled = models.BooleanField(db_default=False)
    tangible_type = models.ForeignKey(TangibleType, on_delete=models.PROTECT)
    special_care = models.ManyToManyField(SpecialCare, blank=True)
    order_between = postgres_fields.IntegerRangeField()
    last_ten_order_betweens = postgres_fields.ArrayField(postgres_fields.IntegerRangeField(), null=True)
    description = models.TextField(blank=True)
    current_sale_date = postgres_fields.DateRangeField(null=True)
    future_sale_dates = postgres_fields.ArrayField(postgres_fields.DateRangeField(), null=True)
    reviews = postgres_fields.ArrayField(models.CharField(max_length=2048), blank=True, default=list)
    internal_comments = postgres_fields.ArrayField(models.TextField(), blank=True, default=list)
    last_ordered = models.DateField(null=True)
    quantity = models.IntegerField(db_default=0)
    condition = models.CharField(
        max_length=20,
        choices=(
            ("new", "New"),
            ("like_new", "Like New"),
            ("refurbished", "Refurbished"),
            ("used", "Used"),
        ),
        blank=True,
    )

    class Meta(VuedaModel.Meta):
        ordering = ["name"]
        unique_together = [
            ["distributor", "name"],
        ]


class OptionType(Lookup):
    pass


class ProductOption(VuedaModel):
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    option_type = models.ForeignKey(OptionType, null=True, on_delete=models.PROTECT)
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=255, verbose_name="SKU")
    gtin = models.CharField(max_length=255, unique=True, verbose_name="GTIN")
    price = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    disabled = models.BooleanField(db_default=False)
    quantity_available = models.IntegerField(db_default=0)

    class Meta(VuedaModel.Meta):
        default_related_name = "product_options"


class Cart(VuedaModel):
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT)
    last_modified = models.DateTimeField(auto_now=True)
    reserved_delivery_time = models.DateTimeField(null=True)
    reserved_until = models.TimeField(null=True)
    expected_delivery_time = models.DurationField(null=True)

    formatted_name = None

    class Meta(VuedaModel.Meta):
        ordering = [F("expected_delivery_time").asc(nulls_first=True)]

    def get_formatted_name(self):
        if self.customer and self.customer.user:
            return self.customer.user.email


class CartItem(VuedaModel):
    cart = models.ForeignKey(Cart, on_delete=models.PROTECT)
    product_option = models.ForeignKey(ProductOption, on_delete=models.PROTECT)
    quantity = models.IntegerField(db_default=0)

    formatted_name = None
    formatted_name_lookup_expression = "data__formatted_name"

    class Meta(VuedaModel.Meta):
        default_related_name = "cart_items"


class CartItemData(models.Model):
    cart_item = models.OneToOneField(CartItem, on_delete=models.DO_NOTHING, related_name="data")
    formatted_name = models.CharField()

    class Meta:
        managed = False
        db_table = "cart_item_data"


class OrderState(Lookup):
    pass


class CustomerOrder(HasWorkflowModelMixin, VuedaModel):
    order_number = models.DecimalField(max_digits=7, decimal_places=0)
    when = models.DateTimeField(auto_now_add=True, verbose_name="Date / Time", db_index=True)
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT)
    order_state = models.ForeignKey(OrderState, on_delete=models.PROTECT)
    shipping_method = models.CharField(
        max_length=255, choices=(("free", "Free"), ("regular", "Regular"), ("express", "Express")), blank=True
    )

    formatted_name = models.GeneratedField(
        expression=Cast(F("order_number"), output_field=models.CharField()),
        output_field=models.CharField(),
        db_persist=True,
    )

    class Meta(VuedaModel.Meta):
        permissions = [("fulfill_orders", "Can fulfill orders")]

    def get_transition_warnings(self, transition, user=None):
        # Express orders need a fulfillment double-check before any state change; exercised by
        # TestWorkflowViewSet's warning-confirmation tests.
        if self.shipping_method == "express":
            return {
                "non_field_errors": [
                    f"Order {self.order_number} ships express; {transition.name} needs a fulfillment double-check."
                ]
            }
        return {}

    @classmethod
    def get_next_order_number(cls):
        # This is a poor way to do this, but is sufficient for testing.
        customer_order_data = CustomerOrder.objects.aggregate(last_order_number=Max("order_number"))
        last_order_number = customer_order_data["last_order_number"]
        return last_order_number + 1


class OrderItem(VuedaModel):
    customer_order = models.ForeignKey(CustomerOrder, on_delete=models.PROTECT)
    product_option = models.ForeignKey(ProductOption, on_delete=models.PROTECT)
    quantity = models.IntegerField(
        db_default=0, validators=[validators.MinValueValidator(0), validators.MaxValueValidator(1000)]
    )

    formatted_name = None
    formatted_name_lookup_expression = "data__formatted_name"

    class Meta(VuedaModel.Meta):
        default_related_name = "order_items"
        verbose_name = "ORDER item"
        verbose_name_plural = "ORDER items"
        ordering = ["product_option__product__name"]


class OrderItemData(models.Model):
    order_item = models.OneToOneField(OrderItem, on_delete=models.DO_NOTHING, related_name="data")
    formatted_name = models.CharField()

    class Meta:
        managed = False
        db_table = "order_item_data"


class InventoryRecordReason(VuedaModel):
    name = models.CharField(max_length=255, verbose_name="Reason")
    code = models.CharField(max_length=255, db_index=True)
    is_added_reason = models.BooleanField(db_index=True)

    class Meta(VuedaModel.Meta):
        default_related_name = "inventory_record_reason"
        unique_together = ("code", "is_added_reason")
        verbose_name = "inventory entry reason"
        verbose_name_plural = "inventory entry reasons"


# No history on inventory, since we only add records.
class InventoryRecord(VuedaModel):
    product_option = models.ForeignKey(ProductOption, on_delete=models.PROTECT)
    when = models.DateTimeField(auto_now_add=True, verbose_name="Date / Time", db_index=True)
    quantity = models.IntegerField(db_default=0, validators=[StepValueValidator(6)])
    reason = models.ForeignKey(InventoryRecordReason, on_delete=models.PROTECT)
    # A flag, which is set via a management command, run nightly, to ignore records that are completely used.
    archived = models.BooleanField(db_default=False, db_index=True)

    # True for records that add inventory
    #   received purchase orders
    #   returned stock
    # False for records that subtract inventory
    #   customer orders
    #   damaged stock
    is_added = models.BooleanField(db_index=True)

    # For records that add inventory
    # ------------------------------------
    cost = models.DecimalField(max_digits=12, decimal_places=0, null=True)

    # For records that subtract inventory
    # ------------------------------------
    added_inventory_record = models.ForeignKey(
        "store.InventoryRecord", null=True, on_delete=models.PROTECT, verbose_name="Added Inventory Entry"
    )

    order_item = models.ForeignKey(OrderItem, null=True, db_index=True, on_delete=models.PROTECT)

    price = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    margin = models.DecimalField(max_digits=12, decimal_places=2, null=True)

    formatted_name = None
    formatted_name_lookup_expression = "data__formatted_name"

    class Meta(VuedaModel.Meta):
        verbose_name = "inventory entry"
        verbose_name_plural = "inventory entries"


class InventoryRecordData(models.Model):
    inventory_record = models.OneToOneField(InventoryRecord, on_delete=models.DO_NOTHING, related_name="data")
    formatted_name = models.CharField()

    class Meta:
        managed = False
        db_table = "inventory_record_data"


class PackingBox(VuedaModel):
    name = models.CharField(max_length=255)

    depth = models.DecimalField(max_digits=12, decimal_places=4)
    height = models.DecimalField(max_digits=12, decimal_places=4)
    width = models.DecimalField(max_digits=12, decimal_places=4)
    carrying_weight = models.DecimalField(max_digits=12, decimal_places=4)
    in_stock = models.BooleanField(db_default=False)
    number_in_stock = models.IntegerField(db_default=0)

    formatted_name = None
    formatted_name_lookup_expression = "name"

    class Meta(VuedaModel.Meta):
        verbose_name = "Packing Box"
        verbose_name_plural = "Packing Boxes"


class Invoice(VuedaModel):
    name = models.CharField(max_length=255)

    class Meta(VuedaModel.Meta):
        pass


class InvoiceLine(VuedaModel):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="invoice_lines")
    name = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta(VuedaModel.Meta):
        pass


class ProductCompositePK(VuedaModel):
    name = models.CharField(max_length=255)

    class Meta(VuedaModel.Meta):
        ordering = ["name"]


class OrderCompositePK(VuedaModel):
    order_number = models.DecimalField(max_digits=7, decimal_places=0)
    order_date = models.DateTimeField(auto_now_add=True, db_index=True)

    formatted_name = models.GeneratedField(
        expression=Cast(F("order_number"), output_field=models.CharField()),
        output_field=models.CharField(),
        db_persist=True,
    )

    class Meta(VuedaModel.Meta):
        ordering = ["order_number"]


class OrderItemCompositePK(VuedaModel):
    pk = models.CompositePrimaryKey("order_id", "product_id")
    order = models.ForeignKey(OrderCompositePK, on_delete=models.PROTECT)
    product = models.ForeignKey(ProductCompositePK, on_delete=models.PROTECT)
    quantity = models.IntegerField(
        db_default=0, validators=[validators.MinValueValidator(0), validators.MaxValueValidator(1000)]
    )

    formatted_name = None
    formatted_name_lookup_expression = "product__formatted_name"

    class Vueda:
        class History:
            enabled = False
            reason = "pghistory cannot track a composite primary key."

    class Meta(VuedaModel.Meta):
        default_related_name = "order_items_composite_pks"
        verbose_name = "Order Items Composite PK"
        verbose_name_plural = "Order Items Composite PKs"


class OrderItemAltCompositePK(VuedaModel):
    pk = models.CompositePrimaryKey("order_id", "product_id")
    order = models.ForeignKey(OrderCompositePK, on_delete=models.PROTECT)
    product = models.ForeignKey(ProductCompositePK, on_delete=models.PROTECT)
    quantity = models.IntegerField(
        db_default=0, validators=[validators.MinValueValidator(0), validators.MaxValueValidator(1000)]
    )

    formatted_name = None
    formatted_name_lookup_expression = "product__formatted_name"

    class Vueda:
        class History:
            enabled = False
            reason = "pghistory cannot track a composite primary key."

    class Meta(VuedaModel.Meta):
        default_related_name = "order_items_alt_composite_pks"
        ordering = ["order", "product", "quantity"]
        verbose_name = "Order Items Alt Composite PK"
        verbose_name_plural = "Order Items Alt Composite PKs"


class OrderItemPKOrderedCompositePK(VuedaModel):
    """Declares the "pk" alias as the model's own `Meta.ordering` on a `CompositePrimaryKey` model,
    the model-level counterpart of OrderItemCompositePKOrderingPKViewSet: the alias names no single
    column, so it has to expand to every field the key is built from."""

    pk = models.CompositePrimaryKey("order_id", "product_id")
    order = models.ForeignKey(OrderCompositePK, on_delete=models.PROTECT)
    product = models.ForeignKey(ProductCompositePK, on_delete=models.PROTECT)
    quantity = models.IntegerField(db_default=0)

    formatted_name = None
    formatted_name_lookup_expression = "product__formatted_name"

    class Vueda:
        class History:
            enabled = False
            reason = "pghistory cannot track a composite primary key."

    class Meta(VuedaModel.Meta):
        default_related_name = "order_items_pk_ordered_composite_pks"
        ordering = ["pk"]
        verbose_name = "Order Items PK Ordered Composite PK"
        verbose_name_plural = "Order Items PK Ordered Composite PKs"


class DistributorProxy(Distributor):
    class Meta(Distributor.Meta):
        proxy = True
        verbose_name = "distributor proxy"
        verbose_name_plural = "distributor proxies"


class Note(VuedaModel):
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey("content_type", "object_id")
    text = models.TextField()

    formatted_name = None
    formatted_name_lookup_expression = "text"
