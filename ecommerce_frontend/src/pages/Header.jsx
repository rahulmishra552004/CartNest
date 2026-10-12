import './Header.css';
import { Link } from 'react-router';

export function Header({ cart, user, onLogout }) {
  let cartQuantity = 0;
  cart.forEach((cartItem) => {
    cartQuantity += cartItem.quantity;
  })

  return (
    <div className="header">
      <div className="left-section">
        <Link to="/" className="header-link">
          <img className="logo"
            src="/media/logo-white.png" />
          <img className="mobile-logo"
            src="/media/mobile-logo-white.png" />
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
          <button
            type="button"
            className="auth-link header-link"
            onClick={onLogout}
          >
            Logout
          </button>
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
