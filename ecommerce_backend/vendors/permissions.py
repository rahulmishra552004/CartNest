from rest_framework.permissions import BasePermission

class IsVendorProductOwner(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == 'vendor'
            and hasattr(request.user, 'vendor')
        )

    def has_object_permission(self, request, view, obj):
        return obj.vendor_id == request.user.vendor.id
