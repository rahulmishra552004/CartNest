from django.db import models
from products.models import Product
from deliveryoptions.models import DeliveryOption
import uuid
from django.conf import settings
from django.core.validators import MinValueValidator

class CartItem(models.Model):
    id = models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)
    user = models.ForeignKey(
            settings.AUTH_USER_MODEL,
            on_delete = models.CASCADE,
            related_name = 'cart_items'
            )
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='cart_items')
    quantity = models.IntegerField(
            validators = [MinValueValidator(1)],
            default=1,
            )
    delivery_option = models.ForeignKey(DeliveryOption, on_delete=models.PROTECT, related_name='cart_items', default='1')

    class Meta:
        constraints = [
                models.UniqueConstraint(
                    fields = ['user', 'product'],
                    name = 'unique product in a user cart'
                    )
                ]
