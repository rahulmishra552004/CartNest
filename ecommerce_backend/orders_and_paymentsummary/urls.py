from django.urls import path
from rest_framework import routers
from .views import OrderViewSet, payment_summary_view

router = routers.DefaultRouter()
router.register(r'orders', OrderViewSet, basename='orders')

urlpatterns = [
        path('payment-summary/', payment_summary_view, name='payment_summary')]

urlpatterns += router.urls
