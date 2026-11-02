from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import VendorProductViewSet, VendorOrderViewSet, get_stats_view

router = DefaultRouter()
router.register(r'vendor/products', VendorProductViewSet, basename='vendor-products')
router.register(r'vendor/orders', VendorOrderViewSet, basename='vendor-orders')

urlpatterns = router.urls
urlpatterns += [path('vendor/stats/', get_stats_view, name='vendor-stats')]
