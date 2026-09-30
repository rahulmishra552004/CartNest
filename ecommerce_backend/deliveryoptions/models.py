from django.db import models

class DeliveryOption(models.Model):
    id = models.CharField(max_length=10, primary_key=True)
    delivery_days = models.PositiveIntegerField()
    price_cents = models.PositiveIntegerField()
    estimated_delivery_time_ms = models.PositiveIntegerField()

