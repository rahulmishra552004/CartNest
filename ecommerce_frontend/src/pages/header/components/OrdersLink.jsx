import { Link } from 'react-router';

export function OrdersLink() {
  return (
    <Link className="orders-link header-link" to="/orders">
      <span className="orders-text">Orders</span>
    </Link>
  );
}
