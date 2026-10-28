import { Link } from 'react-router';

export function CartLink({ cart = [] }) {
  const cartQuantity = cart.reduce((total, cartItem) => total + cartItem.quantity, 0);

  return (
    <Link className="cart-link header-link" to="/checkout">
      <img className="cart-icon" src="/media/icons/cart-icon.png" alt="" />
      <span className="cart-quantity">{cartQuantity}</span>
      <span className="cart-text">Cart</span>
    </Link>
  );
}
