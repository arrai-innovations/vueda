# Models to use with info.

from django.contrib.auth import get_user_model
from django.db import models

from vueda.core.models import BaseModelMeta
from vueda.core.models import Lookup
from vueda.history.models import SimpleHistoryModelMixin


class Customer(models.Model):
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

    # Size
    # Colour
    # Flavour


class ProductOption(SimpleHistoryModelMixin, models.Model):
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    option_type = models.ForeignKey(OptionType, on_delete=models.PROTECT)
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=255)
    gtin = models.CharField(max_length=255, unique=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    disabled = models.BooleanField(db_default=False)

    class Meta(BaseModelMeta):
        unique_together = [
            ["product__distributor_id", "option_type_id", "option_name"],
        ]


class Cart(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT)

    class Meta(BaseModelMeta):
        pass


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.PROTECT)
    product_option = models.ForeignKey(ProductOption, on_delete=models.PROTECT)
    quantity = models.DecimalField(db_default=0, max_digits=7)

    class Meta(BaseModelMeta):
        pass


class Order(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT)

    class Meta(BaseModelMeta):
        pass


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.PROTECT)
    product_option = models.ForeignKey(ProductOption, on_delete=models.PROTECT)
    quantity = models.DecimalField(db_default=0, max_digits=7)

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
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    date_and_time = models.DateTimeField(auto_now_add=True, verbose_name="Date / Time", db_index=True)
    quantity = models.DecimalField(db_default=0, max_digits=7)
    reason = models.ForeignKey(InventoryRecordReason)

    # True for records that add inventory
    #   received purchase orders
    #   returned stock
    # False for records that subtract inventory
    #   customer orders
    #   damaged stock
    is_added = models.BooleanField(db_index=True)

    # For records that add inventory
    # ------------------------------------
    cost = models.DecimalField(max_digits=12, null=True)

    # For records that subtract inventory
    # ------------------------------------
    added_inventory_record = models.ForeignKey("tests.store.InventoryRecord", null=True, on_delete=models.PROTECT)

    order_item = models.ForeignKey(OrderItem, null=True, db_index=True)

    price = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    margin = models.DecimalField(max_digits=12, decimal_places=2, null=True)
