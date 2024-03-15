# Models to use with info.

from django.contrib.auth import get_user_model
from django.db import models

from vueda.core.models import BaseModelMeta
from vueda.core.models import Lookup
from vueda.history.models import SimpleHistoryModelMixin


class Customer(SimpleHistoryModelMixin, models.Model):
    user = models.OneToOneField(get_user_model(), on_delete=models.PROTECT)

    class Meta(BaseModelMeta):
        pass


class Distributor(SimpleHistoryModelMixin, models.Model):
    name = models.CharField(max_length=255)


class Product(SimpleHistoryModelMixin, models.Model):
    distributor = models.ForeignKey(Distributor, on_delete=models.PROTECT)
    name = models.CharField(max_length=255)
    disabled = models.BooleanField(db_default=False)

    class Meta(BaseModelMeta):
        unique_together = [
            ["distributor", "name"],
        ]


class OptionType(Lookup):
    class Meta(BaseModelMeta):
        pass


class ProductOption(SimpleHistoryModelMixin, models.Model):
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    option_type = models.ForeignKey(OptionType, null=True, on_delete=models.PROTECT)
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=255)
    gtin = models.CharField(max_length=255, unique=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    disabled = models.BooleanField(db_default=False)

    class Meta(BaseModelMeta):
        pass


class Cart(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT)

    class Meta(BaseModelMeta):
        pass


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.PROTECT)
    product_option = models.ForeignKey(ProductOption, on_delete=models.PROTECT)
    quantity = models.IntegerField(db_default=0)

    class Meta(BaseModelMeta):
        pass


class OrderState(Lookup):
    class Meta(BaseModelMeta):
        pass


class CustomerOrder(SimpleHistoryModelMixin, models.Model):
    order_number = models.DecimalField(max_digits=7, decimal_places=0)
    when = models.DateTimeField(auto_now_add=True, verbose_name="Date / Time", db_index=True)
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT)
    order_state = models.ForeignKey(OrderState, on_delete=models.PROTECT)

    class Meta(BaseModelMeta):
        pass


class OrderItem(models.Model):
    customer_order = models.ForeignKey(CustomerOrder, on_delete=models.PROTECT)
    product_option = models.ForeignKey(ProductOption, on_delete=models.PROTECT)
    quantity = models.IntegerField(db_default=0)

    class Meta(BaseModelMeta):
        pass


class InventoryRecordReason(models.Model):
    name = models.CharField(max_length=255, verbose_name="Reason")
    code = models.CharField(max_length=255, db_index=True)
    is_added_reason = models.BooleanField(db_index=True)

    class Meta:
        default_related_name = "inventory_record_reason"
        unique_together = ("code", "is_added_reason")

    def __str__(self):
        return self.code


# No history on inventory, since we only add records.
class InventoryRecord(models.Model):
    product_option = models.ForeignKey(ProductOption, on_delete=models.PROTECT)
    when = models.DateTimeField(auto_now_add=True, verbose_name="Date / Time", db_index=True)
    quantity = models.IntegerField(db_default=0)
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
    added_inventory_record = models.ForeignKey("store.InventoryRecord", null=True, on_delete=models.PROTECT)

    order_item = models.ForeignKey(OrderItem, null=True, db_index=True, on_delete=models.PROTECT)

    price = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    margin = models.DecimalField(max_digits=12, decimal_places=2, null=True)
