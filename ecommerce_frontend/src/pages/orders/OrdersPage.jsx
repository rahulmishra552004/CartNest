import { CustomerHeader } from '../header/CustomerHeader.jsx';
import './OrdersPage.css';
import { formatCurrency } from '../../utils/money.js';
import dayjs from 'dayjs';
import { OrderDetailsGrid } from './OrderDetailsGrid.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';

function formatDeliveryAddress(order) {
  const cityLine = [
    order.deliveryCity,
    order.deliveryState,
    order.deliveryPostalCode,
  ].filter(Boolean).join(' ');

  const structuredAddress = [
    order.deliveryRecipientName,
    order.deliveryAddressLine1,
    order.deliveryAddressLine2,
    cityLine,
    order.deliveryCountryCode,
  ].filter(Boolean).join(', ');

  return structuredAddress;
}

export function OrdersPage({ cart, orders, getCartData, user, isLoading = false, error = '', onRetry }) {
  const showState = error || (!isLoading && orders.length === 0);

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

          {error ? (
            <EmptyState icon="orders" title="We couldn’t load your orders" description={error} role="alert" primaryAction={{ label: 'Try again', onClick: () => onRetry().catch(() => {}) }} secondaryAction={{ label: 'Browse products', to: '/' }} />
          ) : !isLoading && orders.length === 0 ? (
            <EmptyState icon="orders" eyebrow="No orders yet" title="Your first order starts here" description="Once you place an order, you can follow its journey and find all the details right here." primaryAction={{ label: 'Start shopping', to: '/' }} secondaryAction={{ label: 'Discover trending products', to: '/trending' }} />
          ) : orders.length > 0 ? (
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
                        <address>{formatDeliveryAddress(order) || 'Address unavailable'}</address>
                      </div>
                    </div>
                  </div>

                  <OrderDetailsGrid order={order} getCartData={getCartData} />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </main>
    </>
  );
}
