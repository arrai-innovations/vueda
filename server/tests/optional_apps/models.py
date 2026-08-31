"""Models for optional VUEDA app boundary tests."""

from django.db import models

from vueda.core.models import BaseModelMeta
from vueda.core.models import VuedaModel
from vueda.user.models import AbstractVUEDAUser


class User(AbstractVUEDAUser):
    class Meta(AbstractVUEDAUser.Meta):
        default_related_name = "users"


class Ticket(VuedaModel):
    name = models.CharField(max_length=255)

    class Meta(BaseModelMeta):
        default_related_name = "tickets"
