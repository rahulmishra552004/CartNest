import { HomePage } from './pages/home/HomePage.jsx';
import { CheckoutPage } from './pages/checkout/CheckoutPage.jsx';
import { OrdersPage } from './pages/orders/OrdersPage.jsx';
import { TrackingPage } from './pages/tracking/TrackingPage.jsx';
import { LoginPage } from './pages/login/LoginPage.jsx';
import './App.css'
import { Routes, Route, Navigate } from 'react-router';
import axios from 'axios';
import { useState, useEffect } from 'react';

function App() {
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [user, setUser] = useState(undefined);

  const getCartData = async () => {
    const response = await axios('/api/cart-items/?expand=product')
    setCart(response.data);
  }
  const getOrdersData = async () => {
    const response = await axios('/api/orders/?expand=products')
    setOrders(response.data);
  }
  const getCurrentUser = async () => {
    try {
      const response = await axios('/api/auth/me/');
      setUser(response.data);
    } catch {
      setUser(null);
    }
  }

  const handleLogout = async () => {
    await axios.post('/api/auth/logout/');
    setUser(null);
    setCart([]);
    setOrders([]);
  }

  useEffect(() => {
    getCurrentUser()
  }, []);

  useEffect(() => {
    if(user){
      getCartData();
      getOrdersData();
    }
  }, [user]);

  if (user === undefined){
    return <p> Loading... </p>;
  }

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={
            user
            ? <Navigate to="/" replace />
            : <LoginPage onLogin={setUser} />
          }
        />
        <Route
          path="/"
          element={<HomePage
            cart={cart}
            getCartData={getCartData}
            user={user}
            onLogout={handleLogout}
          />}
        />
        <Route
          path="/checkout"
          element={
            user
            ? (
                <CheckoutPage
                cart={cart}
                getCartData={getCartData}
                getOrdersData={getOrdersData}
                onLogout={handleLogout}
                />
            )
            : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/orders"
          element={
            user
            ? (
              <OrdersPage
              cart={cart}
              orders={orders}
              getCartData={getCartData}
              user={user}
              onLogout={handleLogout}
            />
            )
            : <Navigate to="/login" replace />
          }
          />
        <Route
          path="/tracking"
          element={
            user ?
            (
              <TrackingPage
              cart={cart}
              orders={orders}
              user={user}
              onLogout={handleLogout}
            />
            )
            : <Navigate to="/login" replace />
          }
        />
      </Routes>
    </>
  )
}

export default App
