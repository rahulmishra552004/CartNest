import { formatCurrency } from '../../utils/money.js';
import { Fragment } from 'react';
import dayjs from 'dayjs';
import { DeliveryOptions } from './DeliveryOptions.jsx';
import axios from 'axios';

export function OrderSummary({ cart, deliveryOptions, getCartData, getPaymentSummary }) {
  return (
    <div className="order-summary">
      {deliveryOptions.length > 0 && cart.map((cartItem) => {
        async function deleteItemFromCart() {
          await axios.delete(`/api/cart-items/${cartItem.productId}`)
          getCartData();
        }
        let matchingDelivereyOption =
          deliveryOptions.find((deliveryOption) => {
            if (deliveryOption.id === cartItem.deliveryOptionId)
              return true;
          })
        return (
          <Fragment key={cartItem.productId}>
            <div className="cart-item-container">
              <div className="delivery-date">
                Delivery date: {dayjs(matchingDelivereyOption.estimatedDeliveryTimeMs).format('dddd, MMMM D')}
              </div>

              <div className="cart-item-details-grid">
                <img className="product-image"
                  src={cartItem.product.image} />

                <div className="cart-item-details">
                  <div className="product-name">
                    {cartItem.product.name}
                  </div>
                  <div className="product-price">
                    ${formatCurrency(cartItem.product.priceCents)}
                  </div>
                  <div className="product-quantity">
                    <span>
                      Quantity: <span className="quantity-label">{cartItem.quantity}</span>
                    </span>
                    <span className="update-quantity-link link-primary">
                      Update
                    </span>
                    <span className="delete-quantity-link link-primary"
                      onClick={deleteItemFromCart}
                    >
                      Delete
                    </span>
                  </div>
                </div>

                <DeliveryOptions deliveryOptions={deliveryOptions} cartItem={cartItem} getCartData={getCartData} getPaymentSummary={getPaymentSummary} />

              </div>
            </div>
          </Fragment>
        )
      })}
    </div>
  );
}