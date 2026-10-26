import { Header } from '../Header.jsx';
import './OrdersPage.css';
import { formatCurrency } from '../../utils/money.js';
import dayjs from 'dayjs';
import { OrderDetailsGrid } from './OrderDetailsGrid.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';

export function OrdersPage({ cart, orders, getCartData, user, isLoading = false, error = '', onRetry }) {
  const showState = isLoading || error || orders.length === 0;
  return (
    <>
      <title>
        Orders | CartNest
      </title>

      <Header cart={cart} user={user} />

      <main className={showState ? 'orders-empty-page' : 'orders-page'}>
        <div className={showState ? 'orders-empty-content' : undefined}>
          <h1 className="page-title">Your orders</h1>
          {isLoading ? (
            <EmptyState icon="orders" title="Finding your orders" description="Loading your order history…" role="status" />
          ) : error ? (
            <EmptyState icon="orders" title="We couldn’t load your orders" description={error} role="alert" primaryAction={{ label: 'Try again', onClick: () => onRetry().catch(() => {}) }} secondaryAction={{ label: 'Browse products', to: '/' }} />
          ) : orders.length === 0 ? (
            <EmptyState icon="orders" eyebrow="No orders yet" title="Your first order starts here" description="Once you place an order, you can follow its journey and find all the details right here." primaryAction={{ label: 'Start shopping', to: '/' }} secondaryAction={{ label: 'Discover trending products', to: '/trending' }} />
          ) : (
            <div className="orders-grid">
              {orders.map((order) => (
                <div key={order.id} className="order-container">
                  <div className="order-header">
                    <div className="order-header-left-section">
                      <div className="order-date">
                        <div className="order-header-label">Order Placed:</div>
                        <div>{dayjs(order.orderTimeMs).format('dddd, MMMM D')}</div>
                      </div>
                      <div className="order-total">
                        <div className="order-header-label">Total:</div>
                        <div>${formatCurrency(order.totalCostCents)}</div>
                      </div>
                    </div>

                    <div className="order-header-right-section">
                      <div className="order-header-label">Order ID:</div>
                      <div>{order.id}</div>
                    </div>
                  </div>

                  <OrderDetailsGrid order={order} getCartData={getCartData} />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
