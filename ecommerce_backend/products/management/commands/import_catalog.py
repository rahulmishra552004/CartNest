import json
from pathlib import Path
from shutil import copy2

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from deliveryoptions.models import DeliveryOption
from products.models import Product


class Command(BaseCommand):
    help = 'Import the bundled products, images, and delivery options.'

    def handle(self, *args, **options):
        source = settings.BASE_DIR / 'ecommerce-backend'
        data_dir = source / 'backend'
        try:
            products = json.loads(
                (data_dir / 'products.json').read_text(encoding='utf-8')
            )
            delivery_options = json.loads(
                (data_dir / 'deliveryOptions.json').read_text(encoding='utf-8')
            )
        except (OSError, ValueError) as exc:
            raise CommandError(f'Cannot read catalog: {exc}') from exc

        for item in products:
            if not (source / item['image']).is_file():
                raise CommandError(f"Missing image: {item['image']}")

        image_dir = Path(settings.MEDIA_ROOT) / 'products'
        image_dir.mkdir(parents=True, exist_ok=True)

        with transaction.atomic():
            for item in delivery_options:
                DeliveryOption.objects.update_or_create(
                    id=item['id'],
                    defaults={
                        'delivery_days': item['deliveryDays'],
                        'price_cents': item['priceCents'],
                        # The current order calculation expects a duration.
                        'estimated_delivery_time_ms': (
                            item['deliveryDays'] * 24 * 60 * 60 * 1000
                        ),
                    },
                )

            for item in products:
                image_source = source / item['image']
                filename = image_source.name
                copy2(image_source, image_dir / filename)
                Product.objects.update_or_create(
                    id=item['id'],
                    defaults={
                        'image': f'products/{filename}',
                        'name': item['name'],
                        'rating_stars': item['rating']['stars'],
                        'rating_count': item['rating']['count'],
                        'price_cents': item['priceCents'],
                        'keywords': item['keywords'],
                    },
                )

        self.stdout.write(self.style.SUCCESS(
            f'Imported {len(products)} products and '
            f'{len(delivery_options)} delivery options.'
        ))
