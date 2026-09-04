from vueda.user.models import AbstractVUEDAUser


class User(AbstractVUEDAUser):
    class Vueda:
        class History:
            # Signing in writes last_login and nothing else, so tracking it turns every session
            # into a history entry. Drop this section to record them.
            exclude_fields = ("last_login",)

    class Meta(AbstractVUEDAUser.Meta):
        default_related_name = "users"
