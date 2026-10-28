import { Link, useLocation } from 'react-router';
import { CustomerHeader } from '../header/CustomerHeader.jsx';
import { VendorHeader } from '../header/VendorHeader.jsx';
import './ProfilePage.css';

export function ProfilePage({ cart, orders, user, headerVariant = 'customer' }) {
  const { state } = useLocation();
  const accountType = user.role === 'vendor' ? 'Vendor' : 'Customer';
  const cartQuantity = cart.reduce((quantity, item) => quantity + item.quantity, 0);
  const aboutPath = headerVariant === 'vendor' ? '/vendor/about' : '/about';

  return (
    <>
      <title>My profile | CartNest</title>
      {headerVariant === 'vendor'
        ? <VendorHeader user={user} />
        : <CustomerHeader cart={cart} user={user} />}

      <main className="profile-page">
        <div className="profile-content">
          <nav className="profile-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">My profile</span>
          </nav>

          <div className="profile-heading">
            <h1>My profile</h1>
            <p>Your account details and settings, in one place.</p>
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
                <Link to={aboutPath} className="profile-contact-link">Contact us</Link>
              </div>
            </section>
          </div>

        </div>
      </main>
    </>
  )
}
