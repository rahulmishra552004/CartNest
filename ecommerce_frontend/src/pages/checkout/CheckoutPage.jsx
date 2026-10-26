import './Checkout.css';
import './checkout-header.css';
import axios from 'axios';
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { OrderSummary } from './OrderSummary';
import { PaymentSummary } from './PaymentSummary';
import { BrandLogo } from '../../components/BrandLogo.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { accountError } from '../profile/accountErrors.js';

export function CheckoutPage({ cart, getCartData, getOrdersData, isLoading = false, error = '' }) {
  const [deliveryOptions, setDeliveryOptions] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(true);
  const [checkoutError, setCheckoutError] = useState('');
  const [retry, setRetry] = useState(0);

  let cartQuantity = 0;
  cart.forEach((cartItem) => {
    cartQuantity += cartItem.quantity;
  })

  const getPaymentSummary = useCallback(async () => {
    try {
      const response = await axios.get('/api/payment-summary/');
      setPaymentSummary(response.data);
    } catch (requestError) {
      setCheckoutError(accountError(requestError));
    }
  }, []);

  useEffect(() => {
    if (isLoading || error || cart.length === 0) return;
    const controller = new AbortController();
    async function loadCheckout() {
      setCheckoutLoading(true);
      setCheckoutError('');
      try {
        const [payment, delivery] = await Promise.all([
          axios.get('/api/payment-summary/', { signal: controller.signal }),
          axios.get('/api/delivery-options/?expand=estimatedDeliveryTime', { signal: controller.signal }),
        ]);
        if (controller.signal.aborted) return;
        setPaymentSummary(payment.data);
        setDeliveryOptions(delivery.data);
      } catch (requestError) {
        if (!controller.signal.aborted) setCheckoutError(accountError(requestError));
      } finally {
        if (!controller.signal.aborted) setCheckoutLoading(false);
      }
    }
    loadCheckout();
    return () => controller.abort();
  }, [cart, isLoading, error, retry]);

  const showState = isLoading || error || cart.length === 0 || checkoutLoading || checkoutError || !paymentSummary;

  return (
    <>
      <title>
        Checkout | CartNest
      </title>

      <div className="checkout-header">
        <div className="header-content">
          <div className="checkout-header-left-section">
            <Link to="/" aria-label="CartNest home">
              <BrandLogo className="logo" />
              <BrandLogo className="mobile-logo" iconOnly />
            </Link>
          </div>

          <div className="checkout-header-middle-section">
            Checkout (<a className="return-to-home-link"
              href="/"> {cartQuantity} items</a>)
          </div>

          <div className="checkout-header-right-section">
            <Link
              to="/logout"
              className="checkout-logout-link"
            >
              Logout
            </Link>
            <img src="/media/icons/checkout-lock-icon.png" alt="Secure checkout" />
          </div>
        </div>
      </div>

      <main className={`checkout-page-shell${showState ? ' checkout-page-shell-state' : ''}`}>
        <div className="checkout-page">
          <h1 className="page-title">{cart.length === 0 ? 'Your cart' : 'Review your order'}</h1>
          {isLoading ? (
            <EmptyState icon="cart" title="Getting your cart ready" description="Loading the items you’ve picked out…" role="status" />
          ) : error ? (
            <EmptyState icon="cart" title="We couldn’t load your cart" description={error} role="alert" primaryAction={{ label: 'Try again', onClick: () => getCartData().catch(() => {}) }} secondaryAction={{ label: 'Browse products', to: '/' }} />
          ) : cart.length === 0 ? (
            <EmptyState icon="cart" eyebrow="Make room for a new favorite" title="Your cart is empty" description="Add a few favorites from the shop, then come back when you’re ready to check out." primaryAction={{ label: 'Explore products', to: '/' }} secondaryAction={{ label: 'See what’s trending', to: '/trending' }} />
          ) : checkoutError ? (
            <EmptyState icon="cart" title="We couldn’t prepare checkout" description={checkoutError} role="alert" primaryAction={{ label: 'Try again', onClick: () => setRetry((value) => value + 1) }} />
          ) : checkoutLoading || !paymentSummary ? (
            <EmptyState icon="cart" title="Preparing your checkout" description="Checking delivery options and your order total…" role="status" />
          ) : (
            <div className="checkout-grid">
              <OrderSummary cart={cart} deliveryOptions={deliveryOptions} getCartData={getCartData} getPaymentSummary={getPaymentSummary} />
              <PaymentSummary paymentSummary={paymentSummary} getCartData={getCartData} getOrdersData={getOrdersData} />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
