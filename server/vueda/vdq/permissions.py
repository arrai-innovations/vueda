"""Object-level permission classes for VDQ queue item actions."""

__all__ = ("QueueItemObjectPermission",)

from vueda.core.permissions import ObjectPermissions


class QueueItemObjectPermission(ObjectPermissions):
    def has_object_permission(self, request, view, obj):
        view_action = getattr(view, "name", None)
        if view_action == "Resend":
            return request.user.has_perm("vueda_vdq.can_resend")
        return super().has_object_permission(request, view, obj)

    def has_permission(self, request, view):
        view_action = getattr(view, "name", None)
        if view_action == "Resend":
            return request.user.has_perm("vueda_vdq.can_resend")
        return super().has_permission(request, view)
