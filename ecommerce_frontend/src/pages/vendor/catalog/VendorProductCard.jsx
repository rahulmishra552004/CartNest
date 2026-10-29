import { Link } from 'react-router';
import { useState } from 'react';
import axios from 'axios';
import { formatCurrency } from '../../../utils/money.js';
import { accountError } from '../../profile/accountErrors.js';

export function VendorProductCard({ product, onDeleted }) {
  const productUrl = `/vendor/catalog/${encodeURIComponent(product.id)}`;
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(`Delete "${product.name}"? This action cannot be undone.`);
    if (!confirmed) return;

    setDeleteError('');
    setIsDeleting(true);

    try {
      await axios.delete(`/api/vendor/products/${product.id}/`);
      onDeleted(product.id);
    } catch (requestError) {
      setDeleteError(accountError(requestError));
      setIsDeleting(false);
    }
  }

  return (
    <article className="vendor-product-card">
      <Link
        className="vendor-product-image-link"
        to={productUrl}
        state={{ product }}
        aria-label={`View ${product.name}`}
      >
        <img className="vendor-product-image" src={product.image} alt={product.name} />
      </Link>

      <div className="vendor-product-card-body">
        <Link className="vendor-product-name limit-text-to-2-lines" to={productUrl} state={{ product }}>
          {product.name}
        </Link>

        <div className="vendor-product-rating">
          <img
            src={`/media/ratings/rating-${product.rating.stars * 10}.png`}
            alt={`${product.rating.stars} out of 5 stars`}
          />
          <span>{product.rating.count}</span>
        </div>

        <div className="vendor-product-price">${formatCurrency(product.priceCents)}</div>

        <div className="vendor-product-spacer" />

        {deleteError && (
          <p className="vendor-product-card-error" role="alert">
            {deleteError}
          </p>
        )}

        <div className="vendor-product-actions">
          <Link className="vendor-update-button" to={productUrl} state={{ product }}>Update</Link>
          <button
            className="vendor-delete-button"
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label={`Delete ${product.name}`}
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </article>
  );
}
