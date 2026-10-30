import { formatCurrency } from '../../utils/money.js';
import axios from 'axios';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { getIdempotencyKey, resetIdempotencyKey } from '../../utils/checkoutIdempotency.js';

const DUMMY_DELIVERY_ADDRESS = {
  deliveryRecipientName: 'Demo Customer',
  deliveryAddressLine1: '123 Demo Street',
  deliveryAddressLine2: '',
  deliveryCity: 'Test City',
  deliveryState: 'Test State',
  deliveryPostalCode: '110001',
  deliveryCountryCode: 'IN',
};

function responseMessage(value) {
  if (Array.isArray(value)) {
    return value.join(' ');
  }

  return typeof value === 'string' ? value : '';
}

function getCheckoutErrorMessage(error) {
  if (!axios.isAxiosError(error)) {
    return 'The browser could not complete checkout. Check your orders before trying again.';
  }

  if (!error.response) {
    return 'We could not confirm whether your order was placed. Retry safely using the same request.';
  }

  const status = error.response.status;
  const data = error.response.data;
  const detail = responseMessage(data?.detail);

  switch (status) {
    case 400:
      return (
        detail
        || responseMessage(data?.['Idempotency-Key'])
        || 'Your order could not be placed. Check your cart and try again.'
      );
    case 401:
      return 'Your session has expired. Please sign in again.';
    case 403:
      return detail || 'The security check failed. Refresh the page and try again.';
    case 409:
      return detail || 'Your order is still being processed. Wait a moment and retry.';
    case 429:
      return 'Too many attempts. Wait a moment before trying again.';
    default:
      if (status >= 500) {
        return 'The server could not confirm your order. Please retry using the same request.';
      }

      return detail || 'Unable to place your order right now.';
  }
}

export function PaymentSummary({ cart, paymentSummary, getCartData, getOrdersData }) {
  const navigate = useNavigate();
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [placeOrderError, setPlaceOrderError] = useState('');

  async function placeOrder() {
    if (isPlacingOrder) return;

    setIsPlacingOrder(true);
    setPlaceOrderError('');

    try {
      const idempotencyKey = getIdempotencyKey(cart);
      const response = await axios.post(
        '/api/orders/',
        DUMMY_DELIVERY_ADDRESS,
        {
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
        }
      );

      if (response.status !== 201) {
        throw new Error(`Unexpected checkout status: ${response.status}`);
      }

      resetIdempotencyKey();

      await Promise.allSettled([
        getCartData(),
        getOrdersData(),
      ]);

      navigate('/orders');
    } catch (error) {
      setPlaceOrderError(getCheckoutErrorMessage(error));
    } finally {
      setIsPlacingOrder(false);
    }
  }
  return (
    <div className="payment-summary">
      <div className="payment-summary-title">
        Payment Summary
      </div>

      <div className="payment-summary-row">
        <div>Items ({paymentSummary.totalItems}):</div>
        <div className="payment-summary-money">${formatCurrency(paymentSummary.productCostCents)}</div>
      </div>

      <div className="payment-summary-row">
        <div>Shipping &amp; handling:</div>
        <div className="payment-summary-money">${formatCurrency(paymentSummary.shippingCostCents)}</div>
      </div>

      <div className="payment-summary-row subtotal-row">
        <div>Total before tax:</div>
        <div className="payment-summary-money">${formatCurrency(paymentSummary.totalCostBeforeTaxCents)}</div>
      </div>

      <div className="payment-summary-row">
        <div>Estimated tax (10%):</div>
        <div className="payment-summary-money">${formatCurrency(paymentSummary.taxCents)}</div>
      </div>

      <div className="payment-summary-row total-row">
        <div>Order total:</div>
        <div className="payment-summary-money">${formatCurrency(paymentSummary.totalCostCents)}</div>
      </div>

      {placeOrderError && (
        <p className="checkout-error" role="alert">
          {placeOrderError}
        </p>
      )}

      <button
        type="button"
        onClick={placeOrder}
        disabled={isPlacingOrder}
        aria-busy={isPlacingOrder}
        className="place-order-button button-primary"
      >
        {isPlacingOrder
          ? 'Placing your order…'
          : placeOrderError
            ? 'Retry placing order'
            : 'Place your order'}
      </button>
    </div>
  );
}
