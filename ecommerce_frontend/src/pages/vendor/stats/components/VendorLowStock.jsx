import { Link } from 'react-router';
import { formatCount } from '../formatStats.js';

export function VendorLowStock({ products, threshold }) {
  return (
    <section className="vendor-stats-card" aria-labelledby="vendor-low-stock-title">
      <header className="vendor-stats-card-header">
        <h2 id="vendor-low-stock-title">Low stock</h2>
        <p>Right now · products with {formatCount(threshold)} or fewer left</p>
      </header>

      {products.length === 0 ? (
        <p className="vendor-stats-empty">All your products are well stocked.</p>
      ) : (
        <ul className="vendor-low-stock-list">
          {products.map((product) => {
            const outOfStock = product.inventoryStock === 0;

            return (
              <li key={product.id}>
                <Link className="vendor-low-stock-item" to={`/vendor/catalog/${product.id}`}>
                  <img className="vendor-low-stock-image" src={product.imageUrl} alt="" />

                  <span className="vendor-low-stock-text">
                    <span className="vendor-low-stock-name">{product.name}</span>
                    <span className="vendor-stock-status">
                      <svg
                        className={`vendor-alert-icon ${outOfStock ? 'vendor-alert-icon-critical' : 'vendor-alert-icon-warning'}`}
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <circle cx="10" cy="10" r="9" />
                        <path d="M10 5.5v5.5M10 14.2v.3" />
                      </svg>
                      {outOfStock ? 'Out of stock' : `Low stock · ${formatCount(product.inventoryStock)} left`}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
