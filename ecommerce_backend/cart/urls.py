from rest_framework import routers
from .views import CartItemViewSet

router = routers.DefaultRouter()
router.register(r'cart-items', CartItemViewSet, basename='cart-item')

urlpatterns=router.urls
