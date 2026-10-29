import { VendorOrderStatusUpdate } from './VendorOrderStatusUpdate.jsx';

export function VendorOrderCard({
  orderId,
  status,
  statusValue,
  productImage,
  productImageAlt,
  productName,
  productId,
  orderDate,
  quantity,
  orderTotal,
  estimatedDelivery,
}) {
  return (
    <article className="vendor-order-card">
      <header className="vendor-order-card-header">
        <div>
          <p className="vendor-order-label">Order ID</p>
          <h2>#{orderId}</h2>
        </div>
        <span className={`vendor-order-status vendor-order-status-${statusValue}`}>{status}</span>
      </header>

      <div className="vendor-order-details">
        <div className="vendor-order-product">
          <div className="vendor-order-product-image">
            <img src={productImage} alt={productImageAlt} />
          </div>
          <div>
            <p className="vendor-order-label">Product</p>
            <h3>{productName}</h3>
            <p className="vendor-order-product-id">Product ID: {productId}</p>
          </div>
        </div>

        <dl className="vendor-order-facts">
          <div>
            <dt>Order placed</dt>
            <dd>{orderDate}</dd>
          </div>
          <div>
            <dt>Quantity</dt>
            <dd>{quantity}</dd>
          </div>
          <div>
            <dt>Order total</dt>
            <dd>{orderTotal}</dd>
          </div>
          <div>
            <dt>Estimated delivery</dt>
            <dd>{estimatedDelivery}</dd>
          </div>
        </dl>

        <VendorOrderStatusUpdate orderId={orderId} statusValue={statusValue} />
      </div>
    </article>
  );
}
