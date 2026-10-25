import './Header.css';
import { useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router';
import { BrandLogo } from '../components/BrandLogo.jsx';

function AccountIcon({ name, className = '' }) {
  const paths = {
    profile: <><circle cx="12" cy="8" r="3" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></>,
    orders: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h3" /></>,
    recent: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    about: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>,
    logout: <><path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M9 12h12M17 8l4 4-4 4" /></>,
    chevron: <path d="m6 9 6 6 6-6" />,
  };

  return (
    <svg className={`account-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {paths[name]}
    </svg>
  );
}

export function Header({ cart, user }) {
  const accountMenuRef = useRef(null);

  useEffect(() => {
    function handleOutsideInteraction(event) {
      const menu = accountMenuRef.current;
      if (menu && event.target instanceof Node && !menu.contains(event.target)) {
        menu.open = false;
      }
    }

    // Track the focused element; blur.relatedTarget can be a non-Node value.
    document.addEventListener('pointerdown', handleOutsideInteraction);
    document.addEventListener('focusin', handleOutsideInteraction);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideInteraction);
      document.removeEventListener('focusin', handleOutsideInteraction);
    };
  }, []);

  function closeAccountMenu() {
    if (accountMenuRef.current) accountMenuRef.current.open = false;
  }

  function handleAccountKeyDown(event) {
    if (event.key === 'Escape' && accountMenuRef.current?.open) {
      event.preventDefault();
      closeAccountMenu();
      accountMenuRef.current.querySelector('summary').focus();
    }
  }

  const accountInitial = user?.username?.trim().charAt(0).toUpperCase() || 'C';
  const accountType = user?.role === 'vendor' ? 'Vendor' : 'Customer';
  const accountLinkClass = ({ isActive }) => `account-dropdown-menu-link${isActive ? ' account-link-active' : ''}`;

  let cartQuantity = 0;
  cart.forEach((cartItem) => {
    cartQuantity += cartItem.quantity;
  })

  return (
    <div className="header">
      <div className="left-section">
        <Link to="/" className="header-link" aria-label="CartNest home">
          <BrandLogo className="logo" light />
          <BrandLogo className="mobile-logo" iconOnly light />
        </Link>
      </div>

      <div className="middle-section">
        <input className="search-bar" type="text" placeholder="Search" />

        <button className="search-button">
          <img className="search-icon" src="/media/icons/search-icon.png" />
        </button>
      </div>

      <div className="right-section">
        {user ? (
          <details
            className="account-dropdown"
            ref={accountMenuRef}
            onKeyDown={handleAccountKeyDown}
          >
            <summary className="account-trigger" aria-label={`Account options for ${user.username}`}>
              <span className="account-avatar account-trigger-avatar" aria-hidden="true">{accountInitial}</span>
              <span className="account-trigger-label">Account</span>
              <AccountIcon name="chevron" className="account-chevron" />
            </summary>
            <div className="account-dropdown-menu">
              <div className="account-menu-identity">
                <span className="account-avatar" aria-hidden="true">{accountInitial}</span>
                <div className="account-menu-user">
                  <strong title={user.username}>{user.username}</strong>
                  <span title={user.email}>{user.email || `${accountType} account`}</span>
                </div>
                <span className="account-role">{accountType}</span>
              </div>
              <nav className="account-menu-links" aria-label="Account navigation" onClick={closeAccountMenu}>
                <NavLink to="/profile" className={accountLinkClass}>
                  <AccountIcon name="profile" />
                  <span>My profile</span>
                </NavLink>
                {user.role === 'vendor' && (
                  <span className="account-dropdown-menu-link account-link-disabled" aria-disabled="true">
                    <AccountIcon name="dashboard" />
                    <span>Dashboard</span>
                    <span className="account-soon">Soon</span>
                  </span>
                )}
                <NavLink to="/orders" className={accountLinkClass}>
                  <AccountIcon name="orders" />
                  <span>Order history</span>
                </NavLink>
                <NavLink to="/recently-viewed" className={accountLinkClass}>
                  <AccountIcon name="recent" />
                  <span>Recently viewed</span>
                </NavLink>
                <NavLink to="/about" className={accountLinkClass}>
                  <AccountIcon name="about" />
                  <span>About CartNest</span>
                </NavLink>
              </nav>
              <div className="account-menu-footer">
                <Link to="/logout" className="account-dropdown-menu-link account-logout-link" onClick={closeAccountMenu}>
                  <AccountIcon name="logout" />
                  <span>Sign out</span>
                </Link>
              </div>
            </div>
          </details>
        ) : (
          <Link className="auth-link header-link" to="/login">
            Login
          </Link>
        )}

        <Link className="orders-link header-link" to="/orders">

          <span className="orders-text">Orders</span>
        </Link>

        <Link className="cart-link header-link" to="/checkout">
          <img className="cart-icon" src="/media/icons/cart-icon.png" />
          <div className="cart-quantity">{cartQuantity}</div>
          <div className="cart-text">Cart</div>
        </Link>
      </div>
    </div>
  );
}
