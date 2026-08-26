import dayjs from 'dayjs';
import { Fragment } from 'react';

export function OrderDetailsGrid({ order }) {
  return (
    <div className="order-details-grid">
      {
        order.products.map((orderedProduct) => {
          return (
            <Fragment key={orderedProduct.productId}>
              <div className="product-image-container">
                <img src={orderedProduct.product.image} />
              </div>

              <div className="product-details">
                <div className="product-name">
                  {orderedProduct.product.name}
                </div>
                <div className="product-delivery-date">
                  Arriving on: {dayjs(orderedProduct.estimatedDeliveryTimeMs).format('dddd, MMMM D')}
                </div>
                <div className="product-quantity">
                  Quantity: {orderedProduct.quantity}
                </div>
                <button className="buy-again-button button-primary">
                  <img className="buy-again-icon" src="images/icons/buy-again.png" />
                  <span className="buy-again-message">Add to Cart</span>
                </button>
              </div>

              <div className="product-actions">
                <a href={`/tracking?orderId=${order.id}&productId=${orderedProduct.productId}`}>
                  <button className="track-package-button button-secondary">
                    Track package
                  </button>
                </a>
              </div>
            </Fragment>
          )
        })
      }
    </div>
  );
}