from django.urls import path
from .views import DeliveryOptionListView

urlpatterns = [
        path('delivery-options/', DeliveryOptionListView.as_view(), name='delivery-options'),
        ]
