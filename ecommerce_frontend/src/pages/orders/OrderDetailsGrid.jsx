import dayjs from 'dayjs';
import { Fragment } from 'react';
import axios from 'axios';

export function OrderDetailsGrid({ order, getCartData }) {
  return (
    <div className="order-details-grid">
      {
        order.products.map((orderedProduct) => {
          async function addToCart() {
            axios.post('/api/cart-items', {
              'productId': orderedProduct.productId,
              'quantity': 1
            })
            getCartData();
          }
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
                <button 
                onClick={addToCart}
                className="buy-again-button button-primary">
                  <img className="buy-again-icon" src="/media/icons/buy-again.png" />
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