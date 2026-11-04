import { CustomerHeader } from '../header/CustomerHeader.jsx';
import './OrdersPage.css';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { formatCurrency } from '../../utils/money.js';
import dayjs from 'dayjs';
import { OrderDetailsGrid } from './OrderDetailsGrid.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { Pagination } from '../../components/Pagination.jsx';
import { getPage, withPage, isMissingPage } from '../../utils/pagination.js';

function formatDeliveryAddress(order) {
  const cityLine = [
    order.deliveryCity,
    order.deliveryState,
    order.deliveryPostalCode,
  ].filter(Boolean).join(' ');

  //the recipient's name is shown on its own line, above the address
  const structuredAddress = [
    order.deliveryAddressLine1,
    order.deliveryAddressLine2,
    cityLine,
    order.deliveryCountryCode,
  ].filter(Boolean).join(', ');

  return structuredAddress;
}

//orders and ordersCount live in App.jsx; this page picks which page of them loadOrders fetches
export function OrdersPage({ cart, orders, ordersCount, getCartData, user, isLoading = false, error = '', loadOrders }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = getPage(searchParams);
  //a one-time message passed by checkout, e.g. when the cart turned out to be empty already
  const [notice] = useState(location.state?.notice ?? '');
  const showState = error || (!isLoading && orders.length === 0);

  //loads the page in the URL whenever it changes
  useEffect(() => {
    loadOrders(page).catch((requestError) => {
      //?page= past the last page (an old link): go back to page 1
      if (isMissingPage(requestError, page)) {
        setSearchParams((params) => withPage(params, 1), { replace: true });
      }
    });
  }, [page, loadOrders, setSearchParams]);

  function goToPage(nextPage) {
    setSearchParams(withPage(searchParams, nextPage));
    //start the new page at the top, not where the old one was scrolled to
    window.scrollTo(0, 0);
  }

  //drop the message from the browser history entry, so reloading the page doesn't show it again.
  //the page stays mounted, so the copy in `notice` stays on screen
  useEffect(() => {
    if (location.state?.notice) {
      navigate(
        { pathname: location.pathname, search: location.search },
        { replace: true, state: null },
      );
    }
  }, [location, navigate]);

  return (
    <>
      <title>
        Orders | CartNest
      </title>

      <CustomerHeader cart={cart} user={user} />

      <main className={showState ? 'orders-empty-page' : 'orders-page'}>
        <div className={showState ? 'orders-empty-content' : 'orders-content'}>
          <header className="orders-page-heading">
            <p className="orders-eyebrow">Purchase history</p>
            <h1 className="page-title">Your orders</h1>
            {!showState && (
              <p>Review your purchases, delivery details, and package tracking in one place.</p>
            )}
          </header>

          {notice && (
            <div className="orders-notice" role="status">
              <span className="orders-notice-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 11v5.5M12 7.5h.01" />
                </svg>
              </span>
              <p>{notice}</p>
            </div>
          )}

          {error ? (
            <EmptyState icon="orders" title="We couldn’t load your orders" description={error} role="alert" primaryAction={{ label: 'Try again', onClick: () => loadOrders(page).catch(() => {}) }} secondaryAction={{ label: 'Browse products', to: '/' }} />
          ) : !isLoading && orders.length === 0 ? (
            <EmptyState icon="orders" eyebrow="No orders yet" title="Your first order starts here" description="Once you place an order, you can follow its journey and find all the details right here." primaryAction={{ label: 'Start shopping', to: '/' }} secondaryAction={{ label: 'Discover trending products', to: '/trending' }} />
          ) : orders.length > 0 ? (
            <>
              <div className="orders-grid">
                {orders.map((order) => (
                  <div key={order.id} className="order-container">
                    <div className="order-header">
                      <div className="order-header-summary">
                        <div className="order-header-left-section">
                          <div className="order-date">
                            <div className="order-header-label">Order Placed:</div>
                            <div className="order-header-value">{dayjs(order.orderTimeMs).format('dddd, MMMM D')}</div>
                          </div>
                          <div className="order-total">
                            <div className="order-header-label">Total:</div>
                            <div className="order-header-value">${formatCurrency(order.totalCostCents)}</div>
                          </div>
                        </div>
  
                        <div className="order-header-right-section">
                          <div className="order-header-label">Order ID:</div>
                          <div className="order-id-value" title={order.id}>{order.id}</div>
                        </div>
                      </div>
  
                      <div className="order-delivery-address">
                        <span className="order-address-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                            <circle cx="12" cy="10" r="2.5" />
                          </svg>
                        </span>
                        <div className="order-address-copy">
                          <div className="order-header-label">Delivery address</div>
                          <address>
                            {/* label and phone are blank on orders placed before they were saved */}
                            <div className="order-address-recipient">
                              {order.deliveryRecipientName && (
                                <span className="order-address-name">{order.deliveryRecipientName}</span>
                              )}
                              {order.deliveryLabel && (
                                <span className="order-address-tag">{order.deliveryLabel}</span>
                              )}
                              {order.deliveryPhoneNumber && (
                                <span className="order-address-phone">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
                                  </svg>
                                  <span className="orders-visually-hidden">Phone: </span>
                                  {order.deliveryPhoneNumber}
                                </span>
                              )}
                            </div>
                            <div className="order-address-lines">
                              {formatDeliveryAddress(order) || 'Address unavailable'}
                            </div>
                          </address>
                        </div>
                      </div>
                    </div>
  
                    <OrderDetailsGrid order={order} getCartData={getCartData} />
                  </div>
                ))}
              </div>
              <Pagination page={page} count={ordersCount} onPageChange={goToPage} label="Order pages" />
            </>
          ) : null}
        </div>
      </main>
    </>
  );
}
