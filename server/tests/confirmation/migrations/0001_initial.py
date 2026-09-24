from django.db import migrations
from django.db import models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Thing",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=255)),
                ("count", models.IntegerField(default=0)),
            ],
            options={
                "verbose_name": "Thing",
                "verbose_name_plural": "Things",
            },
        ),
        migrations.CreateModel(
            name="Gadget",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("is_active", models.BooleanField(default=True, verbose_name="active")),
                ("name", models.CharField(max_length=255)),
            ],
            options={
                "verbose_name": "Gadget",
                "verbose_name_plural": "Gadgets",
            },
        ),
    ]
