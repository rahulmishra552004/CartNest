"""Canonical product UUIDs for database and Redis identifiers."""

from uuid import UUID


def normalize_product_id(product_id):
    return str(UUID(str(product_id)))
