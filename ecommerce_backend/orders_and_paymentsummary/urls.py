from django.urls import path
from rest_framework import routers
from .views import (
    OrderViewSet,
    payment_summary_view,
    OrderItemRetrieveView,
)

router = routers.DefaultRouter()
router.register(r'orders', OrderViewSet, basename='orders')

urlpatterns = [
        path('payment-summary/', payment_summary_view, name='payment_summary'),
        path(
            'orders/<uuid:order_id>/products/<uuid:product_id>/tracking/',
            OrderItemRetrieveView.as_view(),
            name='order-item-tracking',
        ),
    ]

urlpatterns += router.urls
