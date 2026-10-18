import json
from pathlib import Path
from shutil import copy2

from django.conf import settings
from django.core.cache import cache
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from redis.exceptions import RedisError

from deliveryoptions.models import DeliveryOption
from products.models import Product
from products.identifiers import normalize_product_id
from vendors.models import Vendor


class Command(BaseCommand):
    help = 'Import the bundled products, images, and delivery options.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--vendor-id',
            type=int,
            required=True,
            help='Existing vendor profile ID assigned to newly created products.',
        )
        parser.add_argument(
            '--initial-stock',
            type=int,
            default=0,
            help='Stock for newly created products (default: 0). Existing stock is preserved.',
        )
        parser.add_argument(
            '--catalog-dir',
            type=Path,
            default=settings.BASE_DIR.parent / 'ecommerce_frontend' / 'starting-code' / 'backend',
            help='Directory containing products.json and deliveryOptions.json.',
        )
        parser.add_argument(
            '--image-root',
            type=Path,
            default=settings.BASE_DIR.parent / 'ecommerce_frontend' / 'public',
            help='Directory relative to which catalog image paths are resolved.',
        )

    def handle(self, *args, **options):
        initial_stock = options['initial_stock']
        if initial_stock < 0:
            raise CommandError('--initial-stock must be zero or greater.')

        try:
            vendor = Vendor.objects.get(pk=options['vendor_id'])
        except Vendor.DoesNotExist as exc:
            raise CommandError(
                f"Vendor profile {options['vendor_id']} does not exist."
            ) from exc

        data_dir = options['catalog_dir']
        image_root = options['image_root']
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
            if not (image_root / item['image']).is_file():
                raise CommandError(f"Missing image: {item['image']}")

        image_dir = Path(settings.MEDIA_ROOT) / 'products'
        image_dir.mkdir(parents=True, exist_ok=True)
        product_ids = []

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
                image_source = image_root / item['image']
                filename = image_source.name
                copy2(image_source, image_dir / filename)
                product_defaults = {
                    'image': f'products/{filename}',
                    'name': item['name'],
                    'rating_stars': item['rating']['stars'],
                    'rating_count': item['rating']['count'],
                    'price_cents': item['priceCents'],
                    'keywords': item['keywords'],
                }
                product, _ = Product.objects.update_or_create(
                    id=item['id'],
                    defaults=product_defaults,
                    create_defaults={
                        **product_defaults,
                        'vendor': vendor,
                        'inventory_stock': initial_stock,
                    },
                )
                product_ids.append(normalize_product_id(product.pk))

            transaction.on_commit(lambda: self._invalidate_cache(product_ids))

        self.stdout.write(self.style.SUCCESS(
            f'Imported {len(products)} products and '
            f'{len(delivery_options)} delivery options.'
        ))

    def _invalidate_cache(self, product_ids):
        keys = [
            'products:list',
            'delivery-options:v1:expanded:0',
            'delivery-options:v1:expanded:1',
            *(f'products:{product_id}' for product_id in product_ids),
        ]
        try:
            cache.delete_many(keys)
        except RedisError as exc:
            self.stderr.write(self.style.WARNING(
                f'Catalog import committed, but cache invalidation failed: {exc}'
            ))
