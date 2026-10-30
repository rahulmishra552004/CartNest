import dayjs from 'dayjs';
import axios from 'axios';
import { Link } from 'react-router';

export function OrderDetailsGrid({ order, getCartData }) {
  return (
    <div className="order-details-grid">
      {
        order.products.map((orderedProduct) => {
          async function addToCart() {
            await axios.post('/api/cart-items/', {
              'productId': orderedProduct.productId,
              'quantity': 1
            })
            await getCartData();
          }
          return (
            <div className="order-product-row" key={orderedProduct.productId}>
              <div className="product-image-container">
                <img
                  src={orderedProduct.product.image}
                  alt={orderedProduct.product.name}
                  loading="lazy"
                />
              </div>

              <div className="product-details">
                <div className="product-name">
                  {orderedProduct.product.name}
                </div>
                <div className="product-delivery-date">
                  Arriving on {dayjs(orderedProduct.estimatedDeliveryTimeMs).format('dddd, MMMM D')}
                </div>
                <div className="product-quantity">
                  Quantity: {orderedProduct.quantity}
                </div>
              </div>

              <div className="product-actions">
                <button
                  type="button"
                  onClick={addToCart}
                  className="buy-again-button button-primary">
                  <img className="buy-again-icon" src="/media/icons/buy-again.png" alt="" />
                  <span className="buy-again-message">Add to Cart</span>
                </button>
                <Link
                  className="track-package-button button-secondary"
                  to={`/orders/${order.id}/products/${orderedProduct.productId}/tracking`}>
                  Track package
                </Link>
              </div>
            </div>
          )
        })
      }
    </div>
  );
}
