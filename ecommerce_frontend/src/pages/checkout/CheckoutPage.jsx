import './Checkout.css';
import './checkout-header.css';
import axios from 'axios';
import { useState, useEffect, Fragment } from 'react';
import { OrderSummary } from './OrderSummary';
import { PaymentSummary } from './PaymentSummary';

export function CheckoutPage({ cart, getCartData, getOrdersData }) {
  const [deliveryOptions, setDeliveryOptions] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState([]);
  
  let cartQuantity = 0;
  cart.forEach((cartItem) => {
    cartQuantity += cartItem.quantity;
  })

  const getPaymentSummary = async () => {
    axios('api/payment-summary')
      .then((response) => {
        setPaymentSummary(response.data);
      })
  }

  useEffect(() => {
    axios('/api/delivery-options?expand=estimatedDeliveryTime')
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
        Checkout
      </title>
      
      <div className="checkout-header">
        <div className="header-content">
          <div className="checkout-header-left-section">
            <a href="/">
              <img className="logo" src="/media/logo.png" />
              <img className="mobile-logo" src="/media/mobile-logo.png" />
            </a>
          </div>

          <div className="checkout-header-middle-section">
            Checkout (<a className="return-to-home-link"
              href="/"> {cartQuantity} items</a>)
          </div>

          <div className="checkout-header-right-section">
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