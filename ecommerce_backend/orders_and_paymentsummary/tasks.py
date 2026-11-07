import logging
from collections import Counter
from datetime import timedelta
from kombu.exceptions import OperationalError
from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.db.models import Q, F
from django.utils import timezone
from django.core.mail import send_mail
from smtplib import SMTPServerDisconnected
from .models import Order
from .payments import get_razorpay_client, RAZORPAY_ERRORS
from products.models import Product
from products.cache_invalidation import invalidate_products

UNPAID_ORDER_TIMEOUT = timedelta(minutes=30)

logger = logging.getLogger(__name__)

MAX_CONFIRMATION_ATTEMPTS = 5
@shared_task(
    ignore_result = True,
    autoretry_for = (
        SMTPServerDisconnected,
        ConnectionError,
        TimeoutError,
    ),
    retry_backoff = 5,
    retry_jitter = False,
    max_retries = 3,
)
def send_order_confirmation(order_id):
    with transaction.atomic():
        send_error = None
        order = (
            Order.objects
            .select_related('user')
            .select_for_update(of=('self',))
            .get(pk=order_id)
        )

        if order.confirmation_email_sent_at is not None:
            logger.info('confirmation email already sent for order: %s', order.pk)
            return

        if not order.user.email:
            logger.warning('order %s: confirmation skipped because user has no email', order.pk)
            return

        if order.confirmation_email_attempts >= MAX_CONFIRMATION_ATTEMPTS:
            logger.warning('confirmation attempt limit reached for order: %s', order.pk)
            return

        order.confirmation_email_attempts += 1
        order.confirmation_email_last_attempt_at = timezone.now()
        order.save(update_fields=['confirmation_email_attempts', 'confirmation_email_last_attempt_at'])

        try:
            sent_count = send_mail(
                subject = f"order confirmation: {order_id}",
                message = (
                    f"Hello {order.user.username},\n\n"
                    f"We have received your order {order_id}.\n"
                    f"Thank you for shopping with us!"
                ),
                from_email = settings.DEFAULT_FROM_EMAIL,
                recipient_list = [order.user.email],
            )
        except Exception as exc:
            send_error = exc
        else:
            if sent_count != 1:
                logger.warning('confirmation email could not be sent for order: %s', order.pk)
                return

            order.confirmation_email_sent_at = timezone.now()
            order.save(update_fields=['confirmation_email_sent_at'])

    if send_error is not None:
        raise send_error

@shared_task(ignore_result=True)
def recover_order_confirmation():
    cutoff = timezone.now() - timedelta(minutes=5)
    order_ids = (
        Order.objects
        .filter(
            confirmation_email_sent_at__isnull=True,
            confirmation_email_attempts__lt=MAX_CONFIRMATION_ATTEMPTS,
            status = Order.STATUS.CONFIRMED,
        )
        .exclude(user__email='')
        .filter(
            Q(confirmation_email_last_attempt_at__isnull=True) |
            Q(confirmation_email_last_attempt_at__lte=cutoff)
        )
        .values_list('pk', flat=True)
    )
    for order_id in order_ids.iterator(chunk_size = 100):
        try:
            send_order_confirmation.delay(str(order_id))
        except OperationalError:
            logger.warning('could not queue confirmation recovery for order: %s', order_id)
            break

@shared_task(ignore_result=True)
def cancel_unpaid_orders():
    cutoff_ms = int((timezone.now() - UNPAID_ORDER_TIMEOUT).timestamp() * 1000)
    order_ids = list(
        Order.objects
        .filter(
            order_time_ms__lte = cutoff_ms,
            status=Order.STATUS.AWAITING_PAYMENT
        )
        .values_list('pk', flat=True)[:200]
    )
    for order_id in order_ids:
        handle_unpaid_order(order_id)

def handle_unpaid_order(order_id):
    order = Order.objects.get(pk=order_id)
    if order.razorpay_order_id:
        try:
            payments = get_razorpay_client().order.payments(order.razorpay_order_id, timeout=10)['items']
        except RAZORPAY_ERRORS:
            logger.warning('could not check razorpay for order %s, will try again later next time', order_id)
            return

        captured = [payment for payment in payments if payment['status'] == 'captured']
        if captured:
            confirm_paid_order(order_id, captured[0]['id'])
            return

        if any(payment['status'] == 'authorized' for payment in payments):
            return

    cancel_order(order_id)

def confirm_paid_order(order_id, payment_id):
    updated = Order.objects.filter(
        pk = order_id,
        status = Order.STATUS.AWAITING_PAYMENT,
    ).update(
        status = Order.STATUS.CONFIRMED,
        razorpay_payment_id = payment_id,
        paid_at = timezone.now(),
    )

    if updated:
        logger.info('order %s was paid but never verified, confirmed it', order_id)
        try:
            send_order_confirmation.delay(str(order_id))
        except OperationalError:
            logger.warning('email conformation for order %s could not be queued', order_id)

def cancel_order(order_id):
    with transaction.atomic():
        order = Order.objects.select_for_update().filter(
            pk = order_id,
            status = Order.STATUS.AWAITING_PAYMENT,
        ).first()
        if order is None:
            return

        order.status = Order.STATUS.CANCELLED
        order.save(update_fields=['status'])

        quantities = Counter()
        for item in order.order_items.all():
            product_id = item.product.get('id')
            if product_id:
                quantities[product_id] += item.quantity

        for product_id in sorted(quantities):
            Product.objects.filter(pk=product_id).update(
                inventory_stock=F('inventory_stock')+quantities[product_id]
            )

        product_ids = list(quantities)
        transaction.on_commit(lambda: invalidate_products(*product_ids))

    logger.info('cancelled unpaid order %s', order_id)
