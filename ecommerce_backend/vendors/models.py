from django.db import models
from django.conf import settings

class Vendor(models.Model):
    user = models.OneToOneField(
            settings.AUTH_USER_MODEL,
            on_delete = models.CASCADE,
            related_name = 'vendor'
            )

    store_name = models.CharField(max_length=100)

    is_verified = models.BooleanField(default=False)
