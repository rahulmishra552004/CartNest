import { formatCount, formatDollars } from '../formatStats.js';
import { getStatsRange } from '../statsRanges.js';

export function VendorTopProducts({ products, range }) {
  const { label: rangeLabel } = getStatsRange(range);
  const maxRevenue = Math.max(0, ...products.map((product) => product.totalRevenueCents));

  return (
    <section className="vendor-stats-card" aria-labelledby="vendor-top-products-title">
      <header className="vendor-stats-card-header">
        <h2 id="vendor-top-products-title">Top products</h2>
        <p>By revenue · {rangeLabel}</p>
      </header>

      {products.length === 0 ? (
        <p className="vendor-stats-empty">No sales in this period yet.</p>
      ) : (
        <ol className="vendor-top-products">
          {products.map((product, index) => (
            <li key={product.productId} className="vendor-top-product">
              <span className="vendor-top-product-rank">{index + 1}</span>
              <img className="vendor-top-product-image" src={product.image} alt="" />

              <div className="vendor-top-product-body">
                <div className="vendor-top-product-heading">
                  <p className="vendor-top-product-name">{product.name}</p>
                  <p className="vendor-top-product-units">{formatCount(product.unitsSold)} sold</p>
                </div>

                <div
                  className="vendor-top-product-bar-row"
                  style={{ '--share': maxRevenue === 0 ? 0 : product.totalRevenueCents / maxRevenue }}
                >
                  <span className="vendor-top-product-bar" />
                  <span className="vendor-top-product-revenue">{formatDollars(product.totalRevenueCents)}</span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
