import { VendorHeader } from '../../header/VendorHeader.jsx';
import { VendorCatalogNavigation } from '../catalog/VendorCatalogNavigation.jsx';
import './VendorOrdersPage.css';

export function VendorOrdersPage({ user }) {
  return (
    <>
      <title>Vendor orders | CartNest</title>
      <VendorHeader user={user} />

      <main className="vendor-orders-page">
        <div className="vendor-orders-page-content">
          <VendorCatalogNavigation />

          <section className="vendor-orders" aria-labelledby="vendor-orders-title">
            <header className="vendor-orders-heading">
              <div>
                <p className="vendor-orders-eyebrow">Vendor dashboard</p>
                <h1 id="vendor-orders-title">Orders</h1>
                <p>Review the orders placed for your products and update each delivery status.</p>
              </div>

              <div className="vendor-orders-total" aria-label="3 sample orders">
                <span>3</span>
                <small>Sample orders</small>
              </div>
            </header>

            <div className="vendor-orders-summary" aria-label="Order summary">
              <article>
                <span className="vendor-summary-icon vendor-summary-icon-new" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 8v4l2.5 1.5" />
                    <circle cx="12" cy="12" r="8.5" />
                  </svg>
                </span>
                <div>
                  <strong>1</strong>
                  <p>Processing</p>
                </div>
              </article>

              <article>
                <span className="vendor-summary-icon vendor-summary-icon-shipped" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h11v11H3zM14 10h3l4 4v3h-7z" />
                    <circle cx="7" cy="18" r="2" />
                    <circle cx="18" cy="18" r="2" />
                  </svg>
                </span>
                <div>
                  <strong>1</strong>
                  <p>Shipped</p>
                </div>
              </article>

              <article>
                <span className="vendor-summary-icon vendor-summary-icon-delivered" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="8.5" />
                    <path d="m8 12 2.5 2.5L16.5 9" />
                  </svg>
                </span>
                <div>
                  <strong>1</strong>
                  <p>Delivered</p>
                </div>
              </article>
            </div>

            <div className="vendor-orders-list">
              <article className="vendor-order-card">
                <header className="vendor-order-card-header">
                  <div>
                    <p className="vendor-order-label">Order ID</p>
                    <h2>#8f4d2a91</h2>
                  </div>
                  <span className="vendor-order-status vendor-order-status-processing">Processing</span>
                </header>

                <div className="vendor-order-details">
                  <div className="vendor-order-product">
                    <div className="vendor-order-product-image">
                      <img src="/media/products/men-cozy-fleece-hoodie-light-teal.jpg" alt="Men's cozy fleece hoodie in light teal" />
                    </div>
                    <div>
                      <p className="vendor-order-label">Product</p>
                      <h3>Men's Fleece Hoodie - Light Teal</h3>
                      <p className="vendor-order-product-id">Product ID: bc2847e9</p>
                    </div>
                  </div>

                  <dl className="vendor-order-facts">
                    <div>
                      <dt>Order placed</dt>
                      <dd>October 28, 2026</dd>
                    </div>
                    <div>
                      <dt>Quantity</dt>
                      <dd>2</dd>
                    </div>
                    <div>
                      <dt>Order total</dt>
                      <dd>$83.60</dd>
                    </div>
                    <div>
                      <dt>Estimated delivery</dt>
                      <dd>October 31, 2026</dd>
                    </div>
                  </dl>

                  <div className="vendor-order-update">
                    <label htmlFor="status-8f4d2a91">Delivery status</label>
                    <div>
                      <select id="status-8f4d2a91" defaultValue="processing">
                        <option value="processing">Processing</option>
                        <option value="packed">Packed</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                      </select>
                      <button type="button">Update status</button>
                    </div>
                    <p>Static control — connect this to your API when the delivery status field is ready.</p>
                  </div>
                </div>
              </article>

              <article className="vendor-order-card">
                <header className="vendor-order-card-header">
                  <div>
                    <p className="vendor-order-label">Order ID</p>
                    <h2>#27b6c845</h2>
                  </div>
                  <span className="vendor-order-status vendor-order-status-shipped">Shipped</span>
                </header>

                <div className="vendor-order-details">
                  <div className="vendor-order-product">
                    <div className="vendor-order-product-image">
                      <img src="/media/products/2-slot-toaster-white.jpg" alt="White two-slot toaster" />
                    </div>
                    <div>
                      <p className="vendor-order-label">Product</p>
                      <h3>2 Slot Toaster - White</h3>
                      <p className="vendor-order-product-id">Product ID: 54e0eccd</p>
                    </div>
                  </div>

                  <dl className="vendor-order-facts">
                    <div>
                      <dt>Order placed</dt>
                      <dd>October 26, 2026</dd>
                    </div>
                    <div>
                      <dt>Quantity</dt>
                      <dd>1</dd>
                    </div>
                    <div>
                      <dt>Order total</dt>
                      <dd>$20.89</dd>
                    </div>
                    <div>
                      <dt>Estimated delivery</dt>
                      <dd>October 30, 2026</dd>
                    </div>
                  </dl>

                  <div className="vendor-order-update">
                    <label htmlFor="status-27b6c845">Delivery status</label>
                    <div>
                      <select id="status-27b6c845" defaultValue="shipped">
                        <option value="processing">Processing</option>
                        <option value="packed">Packed</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                      </select>
                      <button type="button">Update status</button>
                    </div>
                    <p>Static control — connect this to your API when the delivery status field is ready.</p>
                  </div>
                </div>
              </article>

              <article className="vendor-order-card">
                <header className="vendor-order-card-header">
                  <div>
                    <p className="vendor-order-label">Order ID</p>
                    <h2>#b19a73e0</h2>
                  </div>
                  <span className="vendor-order-status vendor-order-status-delivered">Delivered</span>
                </header>

                <div className="vendor-order-details">
                  <div className="vendor-order-product">
                    <div className="vendor-order-product-image">
                      <img src="/media/products/sky-leaf-branch-earrings.jpg" alt="Sky blue leaf branch earrings" />
                    </div>
                    <div>
                      <p className="vendor-order-label">Product</p>
                      <h3>Sterling Silver Leaf Branch Earrings</h3>
                      <p className="vendor-order-product-id">Product ID: e4f64a65</p>
                    </div>
                  </div>

                  <dl className="vendor-order-facts">
                    <div>
                      <dt>Order placed</dt>
                      <dd>October 20, 2026</dd>
                    </div>
                    <div>
                      <dt>Quantity</dt>
                      <dd>1</dd>
                    </div>
                    <div>
                      <dt>Order total</dt>
                      <dd>$74.79</dd>
                    </div>
                    <div>
                      <dt>Estimated delivery</dt>
                      <dd>October 24, 2026</dd>
                    </div>
                  </dl>

                  <div className="vendor-order-update">
                    <label htmlFor="status-b19a73e0">Delivery status</label>
                    <div>
                      <select id="status-b19a73e0" defaultValue="delivered">
                        <option value="processing">Processing</option>
                        <option value="packed">Packed</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                      </select>
                      <button type="button">Update status</button>
                    </div>
                    <p>Static control — connect this to your API when the delivery status field is ready.</p>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
