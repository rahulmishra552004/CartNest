from rest_framework.routers import DefaultRouter
from .views import VendorProductViewSet, VendorOrderViewSet

router = DefaultRouter()
router.register(r'vendor/products', VendorProductViewSet, basename='vendor-products')
router.register(r'vendor/orders', VendorOrderViewSet, basename='vendor-orders')

urlpatterns = router.urls
