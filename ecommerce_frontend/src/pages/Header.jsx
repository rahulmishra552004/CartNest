import './Header.css';
import { Link } from 'react-router';
import { BrandLogo } from '../components/BrandLogo.jsx';

export function Header({ cart, user }) {
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
          <div className="account-dropdown">
	          Account {"\u25BE"}
              <div className="account-dropdown-menu">
                <Link to="/profile" className="account-dropdown-menu-link">
                  Profile
                </Link>
                {
                  user.role==="vendor" && 
                    (
                      <div className="account-dropdown-menu-link">
                        Dashboard
                      </div>
                    )
                }
                <div className="account-dropdown-menu-link">
                  History
                </div>
                <Link to="/logout" className="account-dropdown-menu-link">
                  Logout
                </Link>
                <Link to="/about" className="account-dropdown-menu-link">
                  About
                </Link>
              </div>
	        </div>
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
