import { formatCurrency } from '../../utils/money.js';
import axios from 'axios';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { getIdempotencyKey, resetIdempotencyKey } from '../../utils/checkoutIdempotency.js';
import { payForOrder } from '../../utils/razorpayCheckout.js';

const CART_ALREADY_EMPTY_NOTICE =
  'Your cart was already empty, so your order may have been placed. Check your orders below.';
const PAYMENT_NOT_FINISHED_NOTICE = 
  'Your order is saved, but it has not been paid yet. You can pay for it from your orders.';
const PAYMENT_UNCONFIRMED_NOTICE = 
  'We could not confirm your payment. Check your orders before you pay again.';

//the server's cart is already empty. Most likely an earlier attempt placed the order but its
//response never arrived; otherwise the cart was emptied in another tab. Either way checkout can't continue
function isCartAlreadyEmptyError(error) {
  return axios.isAxiosError(error)
    && error.response?.status === 400
    && error.response.data?.code === 'cart_empty';
}

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
      //e.g. { addressId: 'delivery address not found' } when the address was deleted in another tab
      if (data?.addressId) {
        return 'We couldn’t find your delivery address. Choose another address and try again.';
      }

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

export function PaymentSummary({ 
  cart,
  paymentSummary,
  getCartData,
  getOrdersData,
  selectedAddressId,
}) {
  const navigate = useNavigate();
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [placeOrderError, setPlaceOrderError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('online');

  //shared by a placed order and a cart that turned out to be empty already
  async function goToOrders(notice) {
    resetIdempotencyKey();

    await Promise.allSettled([
      getCartData(),
      getOrdersData(),
    ]);

    navigate('/orders', notice ? { state: { notice } } : undefined);
  }

  async function placeOrder() {
    if (isPlacingOrder) return;
    
    if (paymentMethod === 'online' && !window.Razorpay) {
      setPlaceOrderError('The payment window could not load. Refresh the page, or choose cash on delivery.');
      return
    }

    setIsPlacingOrder(true);
    setPlaceOrderError('');

    try {
      const idempotencyKey = getIdempotencyKey(cart, selectedAddressId, paymentMethod);
      const response = await axios.post(
        '/api/orders/',
        { 
          addressId: selectedAddressId,
          paymentMethod: paymentMethod,
        },
        {
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
        }
      );

      if (response.status !== 201) {
        throw new Error(`Unexpected checkout status: ${response.status}`);
      }

      if (paymentMethod === 'cod') {
        await goToOrders();
      } else {
        try {
          const result = await payForOrder(response.data.id);
          if (result) {
            await goToOrders();
          } else {
            await goToOrders(PAYMENT_NOT_FINISHED_NOTICE);
          }
        } catch {
          await goToOrders(PAYMENT_UNCONFIRMED_NOTICE);
        }
      }

    } catch (error) {
      if (isCartAlreadyEmptyError(error)) {
        await goToOrders(CART_ALREADY_EMPTY_NOTICE);
        return;
      }

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

      <div className="payment-methods">
        <div className="payment-methods-title">Payment method</div>

        <label className="delivery-option">
          <input
            type="radio"
            name="payment-method"
            value="online"
            className="delivery-option-input"
            checked={paymentMethod === 'online'}
            onChange={() => setPaymentMethod('online')}
            disabled={isPlacingOrder}
          />
          <div className="delivery-option-date">Pay online</div>
        </label>

        <label className="delivery-option">
          <input
            type="radio"
            name="payment-method"
            value="cod"
            className="delivery-option-input"
            checked={paymentMethod === 'cod'}
            onChange={() => setPaymentMethod('cod')}
            disabled={isPlacingOrder}
          />
          <div className="delivery-option-date">Cash on delivery</div>
        </label>
      </div>

      {placeOrderError && (
        <p className="checkout-error" role="alert">
          {placeOrderError}
        </p>
      )}

      {!selectedAddressId && (
        <p className="place-order-hint" id="place-order-hint">
          Choose a delivery address to place your order.
        </p>
      )}

      <button
        type="button"
        onClick={placeOrder}
        disabled={isPlacingOrder || !selectedAddressId}
        aria-busy={isPlacingOrder}
        aria-describedby={!selectedAddressId ? 'place-order-hint' : undefined}
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
