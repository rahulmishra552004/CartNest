import { formatCurrency } from '../../utils/money.js';
import dayjs from 'dayjs';
import axios from 'axios';

export function DeliveryOptions({ cartItem, deliveryOptions, getCartData, getPaymentSummary }) {
  return (
    <div className="delivery-options">
      <div className="delivery-options-title">
        Choose a delivery option:
      </div>
      {deliveryOptions.map((deliveryOption) => {
        async function changeDeliveryOption() {
          axios.put(`/api/cart-items/${cartItem.productId}`, {
            'deliveryOptionId' : deliveryOption.id
          })
          getCartData();
          getPaymentSummary();
        }

        return (
          <div
            key={deliveryOption.id}
            className="delivery-option"
            onChange={changeDeliveryOption}
          >
            <input type="radio"
              onChange={() => {}}
              checked={deliveryOption.id === cartItem.deliveryOptionId} 
              className="delivery-option-input"
              name={`delivery-option-${cartItem.productId}`} />
            <div>
              <div className="delivery-option-date">
                {dayjs(deliveryOption.estimatedDeliveryTimeMs).format('dddd, MMMM D')}
              </div>
              <div className="delivery-option-price">
                {
                  deliveryOption.priceCents === 0 ?
                    "FREE Shipping" :
                    `$${formatCurrency(deliveryOption.priceCents)} - Shipping`
                }
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}