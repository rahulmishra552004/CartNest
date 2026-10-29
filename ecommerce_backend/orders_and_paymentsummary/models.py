from deliveryoptions.models import DeliveryOption
from vendors.models import Vendor
from django.db import models
from cart.models import CartItem
from django.utils import timezone
import uuid
from django.conf import settings

def current_time_ms():
    return int(timezone.now().timestamp()*1000)

# Kept because migration 0001_initial references this function.
def get_total_cost_cents():
    return 0

def get_products(cart_items):
    products_list = []
    for cart_item in cart_items:
        product_dict = {}
        product_dict['productId'] = str(cart_item.product_id)
        product_dict['quantity'] = cart_item.quantity
        product_dict['estimatedDeliveryTimeMs'] = current_time_ms()+cart_item.delivery_option.estimated_delivery_time_ms

        product_dict['product'] = get_product(cart_item.product)

        products_list.append(product_dict)

    return products_list

def get_product(product):
    product_dict = {}
    product_dict['id'] = str(product.id)
    product_dict['image'] = product.image.url if product.image else None
    product_dict['name'] = product.name
    product_dict['rating'] = {}
    product_dict['rating']['stars'] = float(product.rating_stars)
    product_dict['rating']['count'] = product.rating_count
    product_dict['priceCents'] = product.price_cents
    product_dict['keywords'] = product.keywords
    return product_dict


def get_payment_summary(cart_items):
    payment_summary = {
            'total_items' : 0,
            'product_cost_cents' : 0,
            'shipping_cost_cents' : 0,
            'total_cost_before_tax_cents' : 0,
            'tax_cents' : 0,
            'total_cost_cents' : 0
            }

    for cart_item in cart_items:
        payment_summary['total_items'] += cart_item.quantity
        payment_summary['product_cost_cents'] += cart_item.quantity * cart_item.product.price_cents
        payment_summary['shipping_cost_cents'] += cart_item.delivery_option.price_cents


    payment_summary['total_cost_before_tax_cents'] = payment_summary['product_cost_cents'] + payment_summary['shipping_cost_cents']
    payment_summary['tax_cents'] = round(0.1 * payment_summary['total_cost_before_tax_cents'])
    payment_summary['total_cost_cents'] = payment_summary['total_cost_before_tax_cents'] + payment_summary['tax_cents']

    return payment_summary

class Order(models.Model):
    id = models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)
    user = models.ForeignKey(
            settings.AUTH_USER_MODEL,
            on_delete = models.PROTECT,
            related_name = 'orders'
            )
    order_time_ms = models.BigIntegerField(default=current_time_ms)
    total_cost_cents = models.PositiveIntegerField(default=0)
    products = models.JSONField(default=list)
    confirmation_email_sent_at = models.DateTimeField(
        null = True,
        blank = True,
        editable = False,
    )
    confirmation_email_attempts = models.PositiveIntegerField(
        default=0,
        editable=False
    )
    confirmation_email_last_attempt_at = models.DateTimeField(
        null=True,
        blank=True,
        editable=False
    )
    delivery_address = models.CharField(
        max_length = 256,
    )

class OrderItem(models.Model):
    class DeliveryStatus(models.TextChoices):
        PREPARING = 'preparing', 'Preparing'
        SHIPPING = 'shipping', 'Shipping'
        DELIVERED = 'delivered', 'Delivered'

    id = models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)
    user = models.ForeignKey(
            settings.AUTH_USER_MODEL,
            related_name='order_items',
            on_delete=models.PROTECT
            )
    vendor = models.ForeignKey(
            Vendor,
            related_name='order_items',
            on_delete=models.PROTECT
            )
    order = models.ForeignKey(
            Order,
            related_name='order_items',
            on_delete=models.PROTECT
            )
    delivery_option = models.ForeignKey(
            DeliveryOption,
            related_name='order_items',
            on_delete=models.PROTECT
            )
    delivery_status = models.CharField(
        max_length = 10,
        choices = DeliveryStatus.choices,
        default = DeliveryStatus.PREPARING,
    )
    product = models.JSONField(default=dict)
    quantity = models.PositiveIntegerField()

class CheckoutRequest(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete = models.PROTECT,
    )
    key = models.CharField(max_length=128)
    order = models.OneToOneField(
        'Order',
        on_delete = models.PROTECT,
        null = True,
        blank = True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields = ['user', 'key'],
                name = 'unique checkout per key user'
            ),
        ]
