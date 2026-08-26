import { HomePage } from './pages/home/HomePage.jsx';
import { CheckoutPage } from './pages/checkout/CheckoutPage.jsx';
import { OrdersPage } from './pages/orders/OrdersPage.jsx';
import { TrackingPage } from './pages/tracking/TrackingPage.jsx';
import './App.css'
import { Routes, Route } from 'react-router';
import axios from 'axios';
import { useState, useEffect } from 'react';

function App() {
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const getCartData = async () => {
      const response = await axios('/api/cart-items?expand=product')
      setCart(response.data);
    }

    const getOrdersData = async () => {
      const response = await axios('/api/orders?expand=products')
      setOrders(response.data);
    }

    getCartData();
    getOrdersData();

  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage cart={cart} />} />
        <Route path="/checkout" element={<CheckoutPage cart={cart} />} />
        <Route path="/orders" element={<OrdersPage cart={cart} orders={orders} />} />
        <Route path="/tracking" element={<TrackingPage cart={cart} orders={orders} />}/>
      </Routes>
    </>
  )
}

export default App
