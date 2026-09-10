from django.db import models
from django.db.models import F
from django.db.models.functions import Cast

from vueda.core.models import VuedaModel
from vueda.user.models import AbstractVUEDAUser


class User(AbstractVUEDAUser):
    class Meta(AbstractVUEDAUser.Meta):
        default_related_name = "users"


class Employee(VuedaModel):
    user = models.ForeignKey("User", on_delete=models.CASCADE)
    employee_number = models.CharField(max_length=255)

    formatted_name = models.GeneratedField(
        expression=Cast(F("employee_number"), output_field=models.CharField()),
        output_field=models.CharField(),
        db_persist=True,
    )

    class Meta(VuedaModel.Meta):
        default_related_name = "employees"
