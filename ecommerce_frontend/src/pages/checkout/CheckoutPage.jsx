import './Checkout.css';
import './checkout-header.css';
import axios from 'axios';
import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { OrderSummary } from './OrderSummary';
import { PaymentSummary } from './PaymentSummary';
import { BrandLogo } from '../../components/BrandLogo.jsx';

export function CheckoutPage({ cart, getCartData, getOrdersData }) {
  const [deliveryOptions, setDeliveryOptions] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState([]);

  let cartQuantity = 0;
  cart.forEach((cartItem) => {
    cartQuantity += cartItem.quantity;
  })

  const getPaymentSummary = async () => {
    const response = await axios('/api/payment-summary/');
    setPaymentSummary(response.data);
  }

  useEffect(() => {
    axios('/api/delivery-options/?expand=estimatedDeliveryTime')
      .then((response) => {
        setDeliveryOptions(response.data);
      })
  }, [])

  useEffect(() => {
    getPaymentSummary();
  }, [cart])

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
            <img src="/media/icons/checkout-lock-icon.png" />
          </div>
        </div>
      </div>

      <div className="checkout-page">
        <div className="page-title">Review your order</div>

        <div className="checkout-grid">

          <OrderSummary cart={cart} deliveryOptions={deliveryOptions} getCartData={getCartData} getPaymentSummary={getPaymentSummary}/>

          <PaymentSummary paymentSummary={paymentSummary} getCartData={getCartData} getOrdersData={getOrdersData} />

        </div>
      </div>
    </>
  );
}
