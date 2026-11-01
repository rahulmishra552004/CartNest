import { VendorHeader } from '../../header/VendorHeader.jsx';
import { VendorCatalogNavigation } from '../catalog/VendorCatalogNavigation.jsx';
import { VendorOrderCard } from './components/VendorOrderCard.jsx';
import { VendorOrdersHeading } from './components/VendorOrdersHeading.jsx';
import { EmptyState } from '../../../components/EmptyState.jsx';
import './VendorOrdersPage.css';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { getRequestErrorMessage } from '../../../utils/addressErrors.js';

const LOAD_ERROR_MESSAGE = "We couldn't load your orders. Please try again.";

//outside the component: it only uses its argument, so useEffect doesn't need it as a dependency
function getPendingOrders(orders) {
  let pendingOrders = 0;
  orders?.forEach((order) => {
    if (order.deliveryStatus !== 'delivered') {
      pendingOrders++;
    }
  })
  return pendingOrders;
}

export function VendorOrdersPage({ user }) {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);
  const [pendingOrders, setPendingOrders] = useState();

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const response = await axios.get('/api/vendor/orders/');
        setOrders(response.data);
        setPendingOrders(getPendingOrders(response.data));
      } catch (requestError) {
        setError(getRequestErrorMessage(requestError, LOAD_ERROR_MESSAGE));
      }
    }
    loadOrders();
  }, []);

  return (
    <>
      <title>Vendor orders | CartNest</title>
      <VendorHeader user={user} />

      <main className="vendor-orders-page">
        <div className="vendor-orders-page-content">
          <VendorCatalogNavigation />

          <section className="vendor-orders" aria-labelledby="vendor-orders-title">
            <VendorOrdersHeading pendingOrders={pendingOrders}/>

            {error ? (
              <section className="vendor-orders-error" role="alert">
                <div className="vendor-orders-error-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 8v5" />
                    <path d="M12 17h.01" />
                    <path d="M10.3 3.7 2.5 17.2A2 2 0 0 0 4.2 20h15.6a2 2 0 0 0 1.7-2.8L13.7 3.7a2 2 0 0 0-3.4 0Z" />
                  </svg>
                </div>
                <div className="vendor-orders-error-copy">
                  <h2>We couldn’t load your orders</h2>
                  <p>{error}</p>
                </div>
              </section>
            ) : orders?.length === 0 ? (
              <EmptyState
                icon="orders"
                eyebrow="No orders yet"
                title="Your orders will show up here"
                description="When customers buy your products, each order appears here so you can update its delivery status."
                primaryAction={{ label: 'View your catalog', to: '/vendor/catalog' }}
              />
            ) : (
              <div className="vendor-orders-list">
                {orders && orders.map((order) => (
                  <VendorOrderCard key={order.id} order={order} setPendingOrders={setPendingOrders}/>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
