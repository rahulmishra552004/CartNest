import { Link } from 'react-router';
import { formatCurrency } from '../../../utils/money.js';

export function VendorProductCard({ product }) {
  const productUrl = `/vendor/catalog/${encodeURIComponent(product.id)}`;

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

        <div className="vendor-product-actions">
          <Link className="vendor-update-button" to={productUrl} state={{ product }}>Update</Link>
          <button className="vendor-delete-button" type="button" aria-label={`Delete ${product.name}`}>
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}
