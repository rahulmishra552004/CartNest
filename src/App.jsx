import { HomePage } from './pages/HomePage.jsx';
import { CheckoutPage } from './pages/checkout/CheckoutPage.jsx';
import { OrdersPage } from './pages/OrdersPage.jsx';
import { TrackingPage } from './pages/TrackingPage.jsx';
import './App.css'
import { Routes, Route } from 'react-router';
import axios from 'axios';
import { useState, useEffect } from 'react';

function App() {
  const [cart, setCart] = useState([]);
  useEffect(() => {
    axios('/api/cart-items?expand=product')
    .then((response) => {
      setCart(response.data);
    })
  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage cart={cart} />} />
        <Route path="/checkout" element={<CheckoutPage cart={cart} />} />
        <Route path="/orders" element={<OrdersPage/ >} />
        <Route path="/tracking" element={<TrackingPage />} />
      </Routes>
    </>
  )
}

export default App
