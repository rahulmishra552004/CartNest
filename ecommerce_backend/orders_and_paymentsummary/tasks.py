import logging
from datetime import timedelta
from kombu.exceptions import OperationalError
from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.core.mail import send_mail
from .models import Order
from smtplib import SMTPServerDisconnected

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
            confirmation_email_attempts__lt=MAX_CONFIRMATION_ATTEMPTS
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
