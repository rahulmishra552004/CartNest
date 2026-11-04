import { VendorHeader } from '../../header/VendorHeader.jsx';
import { VendorCatalogNavigation } from '../catalog/VendorCatalogNavigation.jsx';
import { VendorOrderCard } from './components/VendorOrderCard.jsx';
import { VendorOrdersHeading } from './components/VendorOrdersHeading.jsx';
import { EmptyState } from '../../../components/EmptyState.jsx';
import { Pagination } from '../../../components/Pagination.jsx';
import './VendorOrdersPage.css';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import axios from 'axios';
import { getRequestErrorMessage } from '../../../utils/addressErrors.js';
import { getPage, withPage, isMissingPage } from '../../../utils/pagination.js';

const LOAD_ERROR_MESSAGE = "We couldn't load your orders. Please try again.";

export function VendorOrdersPage({ user }) {
  const [orders, setOrders] = useState(null);
  //how many order items there are across every page, for "Page X of Y"
  const [count, setCount] = useState(0);
  const [error, setError] = useState(null);
  const [pendingOrders, setPendingOrders] = useState();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = getPage(searchParams);

  useEffect(() => {
    //a newer page cancels this request, so an older answer can't replace the newer list
    const controller = new AbortController();
    const loadOrders = async () => {
      try {
        const response = await axios.get('/api/vendor/orders/', {
          signal: controller.signal,
          params: page === 1 ? {} : { page },
        });
        if (controller.signal.aborted) return;
        setOrders(response.data.results);
        setCount(response.data.count);
        //counted by the backend across every page, not only the orders on this one
        setPendingOrders(response.data.pending_count);
        setError(null);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        //?page= past the last page (an old link): go back to page 1
        if (isMissingPage(requestError, page)) {
          setSearchParams((params) => withPage(params, 1), { replace: true });
          return;
        }
        setError(getRequestErrorMessage(requestError, LOAD_ERROR_MESSAGE));
      }
    }
    loadOrders();
    return () => controller.abort();
  }, [page, setSearchParams]);

  function goToPage(nextPage) {
    setSearchParams(withPage(searchParams, nextPage));
    //start the new page at the top, not where the old one was scrolled to
    window.scrollTo(0, 0);
  }

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
              <>
                <div className="vendor-orders-list">
                  {orders && orders.map((order) => (
                    <VendorOrderCard key={order.id} order={order} setPendingOrders={setPendingOrders}/>
                  ))}
                </div>
                <Pagination page={page} count={count} onPageChange={goToPage} label="Order pages" />
              </>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
