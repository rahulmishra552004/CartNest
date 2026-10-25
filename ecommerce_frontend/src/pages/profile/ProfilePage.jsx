import { Link, useLocation } from 'react-router';
import dayjs from 'dayjs';
import { Header } from '../Header.jsx';
import { OrderDetailsGrid } from '../orders/OrderDetailsGrid.jsx';
import { formatCurrency } from '../../utils/money.js';
import '../orders/OrdersPage.css';
import './ProfilePage.css';

export function ProfilePage({ cart, orders, user, getCartData }) {
  const { state } = useLocation();
  const accountType = user.role === 'vendor' ? 'Vendor' : 'Customer';
  const cartQuantity = cart.reduce((quantity, item) => quantity + item.quantity, 0);
  const latestOrder = [...orders].sort((a, b) => b.orderTimeMs - a.orderTimeMs)[0];

  return (
    <>
      <title>My profile | CartNest</title>
      <Header cart={cart} user={user} />

      <main className="profile-page">
        <div className="profile-content">
          <nav className="profile-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">My profile</span>
          </nav>

          <div className="profile-heading">
            <h1>My profile</h1>
            <p>Your account and latest order, in one place.</p>
          </div>

          {typeof state?.profileMessage === 'string' && (
            <div className="profile-success-message" role="status">{state.profileMessage}</div>
          )}

          <div className="profile-layout">
            <section className="profile-card profile-summary" aria-labelledby="profile-name">
              <img
                className="profile-avatar"
                src="/avatars/default-avatar.jpg"
                alt="Default profile avatar"
                width="112"
                height="112"
              />
              <h2 id="profile-name">{user.username}</h2>
              <span className="profile-role">{accountType}</span>

              <div className="profile-stats">
                <Link to="/orders" className="profile-stat">
                  <strong>{orders.length}</strong>
                  <span>Orders</span>
                </Link>
                <Link to="/checkout" className="profile-stat">
                  <strong>{cartQuantity}</strong>
                  <span>Items in cart</span>
                </Link>
              </div>
            </section>

            <section className="profile-card profile-details" aria-labelledby="profile-details-title">
              <h2 id="profile-details-title">Account details</h2>
              <p className="profile-section-description">The details associated with your account.</p>

              <dl className="profile-details-list">
                <div>
                  <dt>Username</dt>
                  <dd>{user.username}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{user.email || 'Not provided'}</dd>
                </div>
                <div>
                  <dt>Account type</dt>
                  <dd>{accountType}</dd>
                </div>
                {user.role === 'vendor' && (
                  <div>
                    <dt>Store name</dt>
                    <dd>{user.store_name || 'Not provided'}</dd>
                  </div>
                )}
              </dl>

              <div className="profile-actions">
                <Link to="/profile/edit" className="button-primary profile-action-link">
                  Update profile
                </Link>
                <Link to="/profile/change-password" className="button-secondary profile-action-link">Change password</Link>
                <Link to="/about" className="profile-contact-link">Contact us</Link>
              </div>
            </section>
          </div>

          <section className="profile-orders orders-page" aria-labelledby="profile-orders-title">
            <div className="profile-orders-heading">
              <h2 id="profile-orders-title">Latest order</h2>
              {orders.length > 0 && <Link to="/orders">View all orders</Link>}
            </div>

            {latestOrder ? (
              <div className="profile-order-container">
                <div className="order-header">
                  <div className="order-header-left-section">
                    <div className="order-date">
                      <div className="order-header-label">Order placed</div>
                      <div>{dayjs(latestOrder.orderTimeMs).format('MMMM D, YYYY')}</div>
                    </div>
                    <div className="order-total">
                      <div className="order-header-label">Total</div>
                      <div>${formatCurrency(latestOrder.totalCostCents)}</div>
                    </div>
                  </div>
                  <div className="order-header-right-section">
                    <div className="order-header-label">Order ID</div>
                    <div>{latestOrder.id}</div>
                  </div>
                </div>
                <OrderDetailsGrid order={latestOrder} getCartData={getCartData} />
              </div>
            ) : (
              <div className="profile-card profile-empty-orders">
                <h3>No orders yet</h3>
                <p>Once you place an order, you’ll find it here.</p>
                <Link to="/" className="profile-contact-link">Explore products</Link>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  )
}
