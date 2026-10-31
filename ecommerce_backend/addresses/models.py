import uuid
from django.db import models
from django.conf import settings

MAX_ADDRESS_PER_USER = 10

class Address(models.Model):
    id = models.UUIDField(
        default = uuid.uuid4,
        primary_key = True,
        editable = False,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete = models.CASCADE,
        related_name = 'addresses',
    )
    is_default = models.BooleanField(
        default = False,
    )
    label = models.CharField(
        max_length = 50,
        blank = True,
    )
    recipient_name = models.CharField(
        max_length = 150,
    )
    phone_number = models.CharField(
        max_length = 20,
    )
    line1 = models.CharField(
        max_length = 200,
    )
    line2 = models.CharField(
        max_length = 200,
        blank = True,
    )
    city = models.CharField(
        max_length = 100,
    )
    state = models.CharField(
        max_length = 100,
    )
    postal_code = models.CharField(
        max_length = 20,
    )
    country_code = models.CharField(
        max_length = 2,
    )
    created_at = models.DateTimeField(
        auto_now_add = True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields = ['user'],
                condition = models.Q(is_default = True),
                name = 'max one default address per user',
            )
        ]
    def __str__(self):
        if self.label:
            return f'{self.label}: {self.recipient_name}, {self.line1}, {self.city}'
        return f'{self.recipient_name}, {self.line1}, {self.city}'
