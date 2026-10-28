from rest_framework.routers import DefaultRouter
from .views import VendorProductViewSet

router = DefaultRouter()
router.register(r'vendor/products', VendorProductViewSet, basename='vendor-products')

urlpatterns = router.urls
