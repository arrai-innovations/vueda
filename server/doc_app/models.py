from vueda.user.models import AbstractVUEDAUser


class User(AbstractVUEDAUser):
    class Meta(AbstractVUEDAUser.Meta):
        default_related_name = "users"
