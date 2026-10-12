from rest_framework.permissions import BasePermission, SAFE_METHODS
from users.models import User

class IsVendorOwnerOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True

        return (
                request.user.is_authenticated and
                request.user.role == User.Role.VENDOR and
                hasattr(request.user, 'vendor')
                )

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True

        return obj.vendor == request.user.vendor
