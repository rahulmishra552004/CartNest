import { HomePage } from './pages/home/HomePage.jsx';
import { ProductDetailsPage } from './pages/home/ProductDetailsPage.jsx';
import { RecentlyViewedPage } from './pages/recently-viewed/RecentlyViewedPage.jsx';
import { TrendingProductsPage } from './pages/trending/TrendingProductsPage.jsx';
import { CheckoutPage } from './pages/checkout/CheckoutPage.jsx';
import { OrdersPage } from './pages/orders/OrdersPage.jsx';
import { TrackingPage } from './pages/tracking/TrackingPage.jsx';
import { LoginPage } from './pages/login/LoginPage.jsx';
import { LogoutPage } from './pages/logout/LogoutPage.jsx';
import { AboutPage } from './pages/about/AboutPage.jsx';
import { ProfilePage } from './pages/profile/ProfilePage.jsx';
import { UpdateProfilePage } from './pages/profile/UpdateProfilePage.jsx';
import { ChangePasswordPage } from './pages/profile/ChangePasswordPage.jsx';
import { VendorUpgradePage } from './pages/profile/VendorUpgradePage.jsx';
import { CustomerRegistrationPage } from './pages/registration/CustomerRegistrationPage.jsx';
import { VendorRegistrationPage } from './pages/registration/VendorRegistrationPage.jsx';
import './App.css'
import { Routes, Route, Navigate } from 'react-router';
import axios from 'axios';
import { useState, useEffect, useRef, useCallback } from 'react';
import { accountError } from './pages/profile/accountErrors.js';

function App() {
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [user, setUser] = useState(undefined);
  const [cartLoading, setCartLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [cartError, setCartError] = useState('');
  const [ordersError, setOrdersError] = useState('');

  const version = useRef(0);

  const getCartData = async () => {
    const currentVersion = version.current;
    setCartLoading(true);
    setCartError('');
    try {
      const response = await axios('/api/cart-items/?expand=product');
      if (currentVersion === version.current) setCart(response.data);
    } catch (requestError) {
      if (currentVersion === version.current) setCartError(accountError(requestError));
      throw requestError;
    } finally {
      if (currentVersion === version.current) setCartLoading(false);
    }
  }
  const getOrdersData = async () => {
    const currentVersion = version.current;
    setOrdersLoading(true);
    setOrdersError('');
    try {
      const response = await axios('/api/orders/?expand=products');
      if (currentVersion === version.current) setOrders(response.data);
    } catch (requestError) {
      if (currentVersion === version.current) setOrdersError(accountError(requestError));
      throw requestError;
    } finally {
      if (currentVersion === version.current) setOrdersLoading(false);
    }
  }
  const handleSessionExpired = useCallback(() => {
    version.current += 1;
    setUser(null);
    setCart([]);
    setOrders([]);
    setCartLoading(false);
    setOrdersLoading(false);
    setCartError('');
    setOrdersError('');
  }, []);
  const handleLogout = useCallback(async () => {
    await axios.post('/api/auth/logout/');
    handleSessionExpired();
  }, [handleSessionExpired]);
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
      getCartData().catch(() => {});
      getOrdersData().catch(() => {});
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
        <Route path="/" element={<HomePage cart={cart} getCartData={getCartData} user={user} />} />
        <Route path="/trending" element={<TrendingProductsPage cart={cart} user={user} getCartData={getCartData} />} />
        <Route
          path="/products/:productId"
          element={<ProductDetailsPage cart={cart} user={user} getCartData={getCartData} />}
        />
        <Route
          path="/recently-viewed"
          element={user
            ? <RecentlyViewedPage cart={cart} user={user} getCartData={getCartData} onSessionExpired={handleSessionExpired} />
            : <Navigate to="/login" replace />}
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
                isLoading={cartLoading}
                error={cartError}
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
              isLoading={ordersLoading}
              error={ordersError}
              onRetry={getOrdersData}
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
          path="/profile/edit"
          element={user
            ? <UpdateProfilePage cart={cart} user={user} onUserUpdated={setUser} onSessionExpired={handleSessionExpired} />
            : <Navigate to="/login" replace />}
        />
        <Route
          path="/profile/change-password"
          element={user
            ? <ChangePasswordPage cart={cart} user={user} onSessionExpired={handleSessionExpired} />
            : <Navigate to="/login" replace />}
        />
        <Route
          path="/profile/register-vendor"
          element={!user
            ? <Navigate to="/login" replace />
            : user.role === 'customer'
              ? <VendorUpgradePage cart={cart} user={user} onUserUpdated={setUser} onSessionExpired={handleSessionExpired} />
              : <Navigate to="/profile" replace />}
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
