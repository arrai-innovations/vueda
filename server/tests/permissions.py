from rest_framework.permissions import IsAuthenticated


class IsAdminUser(IsAuthenticated):
    def has_permission(self, request, view):
        return request.user.groups.filter(name="Admin").exists()


class IsCartOrOrderCreator(IsAuthenticated):
    def has_object_permission(self, request, view, obj):
        return request.user == obj.customer.user
