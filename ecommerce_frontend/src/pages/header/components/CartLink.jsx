import { Link } from 'react-router';

export function CartLink({ cart = [] }) {
  const cartQuantity = cart.reduce((total, cartItem) => total + cartItem.quantity, 0);

  return (
    <Link
      className="cart-link header-link"
      to="/checkout"
      aria-label={`Cart, ${cartQuantity} ${cartQuantity === 1 ? 'item' : 'items'}`}
    >
      <span className="cart-icon-wrap">
        {/* drawn to match the cart in the CartNest logo */}
        <svg className="cart-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M2 4.5h2.3a1 1 0 0 1 .96.73L8 15a1.5 1.5 0 0 0 1.44 1.1h8.16a1.5 1.5 0 0 0 1.43-1.05l2.27-6.75a.9.9 0 0 0-.86-1.17H5.8"
            stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
          />
          <path
            className="cart-icon-nest"
            d="M9.7 9.9q3.9 2.1 7.9 0M10.4 12.6q3.3 1.8 6.6 0"
            strokeWidth="1.5" strokeLinecap="round"
          />
          <circle cx="9.8" cy="19.6" r="1.55" fill="currentColor" />
          <circle cx="17.2" cy="19.6" r="1.55" fill="currentColor" />
        </svg>
        <span className="cart-quantity" aria-hidden="true">
          {cartQuantity > 99 ? '99+' : cartQuantity}
        </span>
      </span>
      <span className="cart-text" aria-hidden="true">Cart</span>
    </Link>
  );
}
