from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import mixins, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError

from .models import Address, MAX_ADDRESS_PER_USER
from .serializers import AddressSerializer

class AddressViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete']

    def _lock_user(self):
        get_user_model().objects.select_for_update().get(pk=self.request.user.pk)

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user).order_by('-is_default', '-created_at')

    def create(self, request, *args, **kwargs):
        with transaction.atomic():
            self._lock_user()
            return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        with transaction.atomic():
            self._lock_user()
            return super().update(request, *args, **kwargs)


    def perform_create(self, serializer):
        address_count = Address.objects.filter(user=self.request.user).count()
        if address_count >= MAX_ADDRESS_PER_USER:
            raise ValidationError({
                'detail': 'maximum address limit per user reached. remove a address to add a new one'
            })

        is_default = serializer.validated_data.get('is_default') or address_count == 0

        if is_default:
            Address.objects.filter(
                user = self.request.user,
                is_default = True,
            ).update(is_default = False)

        serializer.save(
            user = self.request.user,
            is_default = is_default,
        )

    def perform_update(self, serializer):
        if serializer.validated_data.get('is_default'):
            Address.objects.filter(
                user = self.request.user,
                is_default = True,
            ).update(is_default = False)

        serializer.save()
