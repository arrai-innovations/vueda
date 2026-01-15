from vueda.user.models import AbstractVUEDAUserWithHistory


class User(AbstractVUEDAUserWithHistory):
    class Meta(AbstractVUEDAUserWithHistory.Meta):
        default_related_name = "users"
