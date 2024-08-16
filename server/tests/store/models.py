# Models to use with info.

from django.contrib.auth import get_user_model
from django.contrib.postgres import fields as postgres_fields
from django.core import validators
from django.core.validators import StepValueValidator
from django.db import models
from django.db.models import F
from django.db.models import Max
from django.db.models import Value
from django.db.models.functions import Cast
from django.db.models.functions import Concat

from vueda.core.models import BaseModelMeta
from vueda.core.models import Lookup
from vueda.core.models import VuedaBaseModel
from vueda.history.models import SimpleHistoryModelMixin
from vueda.workflow.models import HasWorkflowModelMixin


class Customer(HasWorkflowModelMixin, SimpleHistoryModelMixin, VuedaBaseModel):
    user = models.OneToOneField(get_user_model(), on_delete=models.PROTECT)

    formatted_name = None  # noqa T101 - TODO: Setup generated field as F('user__email')

    class Meta(BaseModelMeta):
        pass

    def __str__(self):
        return self.user.email


class Distributor(SimpleHistoryModelMixin, VuedaBaseModel):
    name = models.CharField(max_length=255)

    class Meta(BaseModelMeta):
        pass

    def __str__(self):
        return self.name


class TangibleType(Lookup):
    class Meta(BaseModelMeta):
        pass

    def __str__(self):
        return self.name


class SpecialCare(VuedaBaseModel):
    code = models.CharField(max_length=255, unique=True, db_index=True)
    field_that_contains_the_name = models.CharField(max_length=255, blank=True)

    formatted_name = models.GeneratedField(
        expression=F("field_that_contains_the_name"),
        output_field=models.CharField(),
        db_persist=True,
    )

    class Meta(BaseModelMeta):
        pass

    def __str__(self):
        return self.field_that_contains_the_name


class Product(SimpleHistoryModelMixin, VuedaBaseModel):
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

    class Meta(BaseModelMeta):
        unique_together = [
            ["distributor", "name"],
        ]

    def __str__(self):
        return self.name


class OptionType(Lookup):
    class Meta(BaseModelMeta):
        pass

    def __str__(self):
        return self.name


class ProductOption(SimpleHistoryModelMixin, VuedaBaseModel):
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    option_type = models.ForeignKey(OptionType, null=True, on_delete=models.PROTECT)
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=255, verbose_name="SKU")
    gtin = models.CharField(max_length=255, unique=True, verbose_name="GTIN")
    price = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    disabled = models.BooleanField(db_default=False)
    quantity_available = models.IntegerField(db_default=0)

    class Meta(BaseModelMeta):
        default_related_name = "product_options"

    def __str__(self):
        return self.name


class Cart(VuedaBaseModel):
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT)
    last_modified = models.DateTimeField(auto_now=True)
    reserved_delivery_time = models.DateTimeField(null=True)
    reserved_until = models.TimeField(null=True)
    expected_delivery_time = models.DurationField(null=True)

    formatted_name = None  # noqa T101 - TODO: Setup generated field as F('customer__user__email')

    class Meta(BaseModelMeta):
        pass

    def __str__(self):
        return self.customer.user.email


class CartItem(VuedaBaseModel):
    cart = models.ForeignKey(Cart, on_delete=models.PROTECT)
    product_option = models.ForeignKey(ProductOption, on_delete=models.PROTECT)
    quantity = models.IntegerField(db_default=0)

    # noqa T101 - TODO: Add at the end of the generated field F('product_option__name')
    formatted_name = models.GeneratedField(
        expression=Concat(Cast(F("quantity"), output_field=models.CharField()), Value("x ")),
        output_field=models.CharField(),
        db_persist=True,
    )

    class Meta(BaseModelMeta):
        default_related_name = "cart_items"

    def __str__(self):
        return f"{self.quantity}x {self.product_option.name}"


class OrderState(Lookup):
    class Meta(BaseModelMeta):
        pass

    def __str__(self):
        return self.name


class CustomerOrder(HasWorkflowModelMixin, SimpleHistoryModelMixin, VuedaBaseModel):
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

    class Meta(BaseModelMeta):
        permissions = [("fulfill_orders", "Can fulfill orders")]

    def __str__(self):
        return str(self.order_number)

    @classmethod
    def get_next_order_number(cls):
        # This is a poor way to do this, but is sufficient for testing.
        customer_order_data = CustomerOrder.objects.aggregate(last_order_number=Max("order_number"))
        last_order_number = customer_order_data["last_order_number"]
        return last_order_number + 1


class OrderItem(VuedaBaseModel):
    customer_order = models.ForeignKey(CustomerOrder, on_delete=models.PROTECT)
    product_option = models.ForeignKey(ProductOption, on_delete=models.PROTECT)
    quantity = models.IntegerField(
        db_default=0, validators=[validators.MinValueValidator(0), validators.MaxValueValidator(1000)]
    )

    # noqa T101 - TODO: Add at the beginning of the generated field Cast(F('customer_order__order_number'), output_field=models.CharField())
    # noqa T101 - TODO: Add at the end of the generated field F('product_option__name')
    formatted_name = models.GeneratedField(
        expression=Concat(Value(" - "), Cast(F("quantity"), output_field=models.CharField()), Value("x ")),
        output_field=models.CharField(),
        db_persist=True,
    )

    class Meta(BaseModelMeta):
        verbose_name = "ORDER item"
        verbose_name_plural = "ORDER items"

    def __str__(self):
        return f"{self.customer_order.order_number} - {self.quantity}x {self.product_option.name}"


class InventoryRecordReason(VuedaBaseModel):
    name = models.CharField(max_length=255, verbose_name="Reason")
    code = models.CharField(max_length=255, db_index=True)
    is_added_reason = models.BooleanField(db_index=True)

    class Meta(BaseModelMeta):
        default_related_name = "inventory_record_reason"
        unique_together = ("code", "is_added_reason")
        verbose_name = "inventory entry reason"
        verbose_name_plural = "inventory entry reasons"

    def __str__(self):
        return self.name


# No history on inventory, since we only add records.
class InventoryRecord(VuedaBaseModel):
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

    # noqa T101 - TODO: Add at the beginning of the generated field, after I figure out how to get dates to work. Cast(F("when"), models.CharField())
    # noqa T101 - TODO: Add at the middle of the generated field F('reason__name')
    # noqa T101 - TODO: Add at the end of the generated field F('product_option__name')
    formatted_name = models.GeneratedField(
        expression=Concat(
            Value(" - "),
            Value(" "),
            Cast(F("quantity"), output_field=models.CharField()),
            Value("x "),
        ),
        output_field=models.CharField(),
        db_persist=True,
    )

    class Meta(BaseModelMeta):
        verbose_name = "inventory entry"
        verbose_name_plural = "inventory entries"

    def __str__(self):
        return f"{self.when} - {self.reason.name} {self.quantity}x {self.product_option.name}"
