from django.db import models
import uuid
from vendors.models import Vendor

class Product(models.Model):
    id = models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)
    image = models.ImageField(upload_to='products/')
    name = models.CharField(max_length=255)
    rating_stars = models.DecimalField(
            max_digits = 2,
            decimal_places = 1,
            default = 0
            )
    rating_count = models.PositiveIntegerField(default=0)
    price_cents = models.PositiveIntegerField()
    keywords = models.JSONField(default=list)
    vendor = models.ForeignKey(
            Vendor,
            on_delete=models.CASCADE,
            related_name='products'
            )
    inventory_stock = models.PositiveIntegerField()
