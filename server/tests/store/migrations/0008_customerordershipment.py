import django.db.models.deletion
from django.db import migrations
from django.db import models


class Migration(migrations.Migration):
    dependencies = [
        ("store", "0007_order_item_formatted_name"),
    ]

    operations = [
        migrations.CreateModel(
            name="CustomerOrderShipment",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("tracking_number", models.CharField(max_length=255)),
                (
                    "customer_order",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="shipment",
                        to="store.customerorder",
                    ),
                ),
            ],
        ),
    ]
