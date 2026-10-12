from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    class Role(models.TextChoices):
        CUSTOMER = 'customer', 'Customer'
        VENDOR = 'vendor', 'Vendor'

    role = models.CharField(
            max_length = 10,
            choices = Role.choices,
            default = Role.CUSTOMER,
            )


