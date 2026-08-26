import { formatCurrency } from '../../utils/money.js';
import { Fragment } from 'react';

export function OrderSummary({ cart, deliveryOptions }){
  return (
    <div className="order-summary">
            {cart.map((cartItem) => {
              return (
                <Fragment key={cartItem.productId}>
                  <div className="cart-item-container">
                    <div className="delivery-date">
                      Delivery date: Tuesday, June 21
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
                          <span className="delete-quantity-link link-primary">
                            Delete
                          </span>
                        </div>
                      </div>

                      <div className="delivery-options">
                        <div className="delivery-options-title">
                          Choose a delivery option:
                        </div>
                        {deliveryOptions.map((deliveryOption) => {
                          return (
                            <div 
                            key={deliveryOption.id}
                            className="delivery-option">
                              <input type="radio"
                                checked={deliveryOption.id === cartItem.deliveryOptionId} 
                                className="delivery-option-input"
                                name={`delivery-option-${cartItem.productId}`} />
                              <div>
                                <div className="delivery-option-date">
                                  {(deliveryOption.estimatedDeliveryTimeMs)}
                                </div>
                                <div className="delivery-option-price">
                                  {
                                    deliveryOption.priceCents === 0 ? 
                                    "FREE Shipping" : 
                                    `$${formatCurrency(deliveryOption.priceCents)}`
                                  }
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </Fragment>
              )
            })}
          </div>
  );
}