import { HomePage } from './pages/home/HomePage.jsx';
import { CheckoutPage } from './pages/checkout/CheckoutPage.jsx';
import { OrdersPage } from './pages/orders/OrdersPage.jsx';
import { TrackingPage } from './pages/tracking/TrackingPage.jsx';
import { LoginPage } from './pages/login/LoginPage.jsx';
import { LogoutPage } from './pages/logout/LogoutPage.jsx';
import { AboutPage } from './pages/about/AboutPage.jsx';
import { ProfilePage } from './pages/profile/ProfilePage.jsx';
import { CustomerRegistrationPage } from './pages/registration/CustomerRegistrationPage.jsx';
import { VendorRegistrationPage } from './pages/registration/VendorRegistrationPage.jsx';
import './App.css'
import { Routes, Route, Navigate } from 'react-router';
import axios from 'axios';
import { useState, useEffect, useRef } from 'react';

function App() {
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [user, setUser] = useState(undefined);

  const version = useRef(0);

  const getCartData = async () => {
    const currentVersion = version.current;
    const response = await axios('/api/cart-items/?expand=product')
    if(currentVersion === version.current){
      setCart(response.data);
    }
  }
  const getOrdersData = async () => {
    const currentVersion = version.current;
    const response = await axios('/api/orders/?expand=products')
    if(currentVersion === version.current){
      setOrders(response.data);
    }
  }
  const handleLogout = async () => {
    await axios.post('/api/auth/logout/');
    version.current += 1;
    setUser(null);
    setCart([]);
    setOrders([]);
  }
  const getCurrentUser = async () => {
    try {
      const response = await axios('/api/auth/me/');
      setUser(response.data);
    } catch {
      setUser(null);
    }
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
          path="/about"
          element={<AboutPage cart={cart} user={user} />}
        />
        <Route
          path="/login"
          element={
            user
            ? <Navigate to="/" replace />
            : <LoginPage onLogin={setUser} />
          }
        />
        <Route
          path="/logout"
          element={
            <LogoutPage onLogout={handleLogout}/>
          }
        />
        <Route
          path="/customer_registration"
          element={
            user 
            ? <Navigate to="/" replace />
            : <CustomerRegistrationPage/>
          }
        />
        <Route
          path="/vendor_registration"
          element={
            user
            ? <Navigate to="/" replace />
            : <VendorRegistrationPage />
          }
        />
        <Route
          path="/"
          element={<HomePage
            cart={cart}
            getCartData={getCartData}
            user={user}
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
            />
            )
            : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/profile"
          element={
            user
            ? (
                <ProfilePage
                  cart={cart}
                  orders={orders}
                  user={user}
                  getCartData={getCartData}
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
