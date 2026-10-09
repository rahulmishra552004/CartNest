from rest_framework import viewsets
from .serializers import CartItemSerializer
from .models import CartItem
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.contrib.auth import get_user_model

class CartItemViewSet(viewsets.ModelViewSet):
    serializer_class = CartItemSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'product_id'
    lookup_url_kwarg = 'productId'

    def _lock_cart_user(self):
        get_user_model().objects.select_for_update().get(pk=self.request.user.pk)

    def get_queryset(self):
        return CartItem.objects.filter(user=self.request.user).select_related('product')

    def create(self, request, *args, **kwargs):
        with transaction.atomic():
            self._lock_cart_user()
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(user=request.user)
            return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        with transaction.atomic():
            self._lock_cart_user()
            kwargs['partial'] = True
            return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        with transaction.atomic():
            self._lock_cart_user()
            return super().destroy(request, *args, **kwargs)


