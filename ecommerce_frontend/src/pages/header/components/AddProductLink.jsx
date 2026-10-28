import { Link } from 'react-router';

export function AddProductLink() {
  return (
    <Link
      className="vendor-header-link vendor-add-product-link header-link"
      to="/vendor/catalog/new"
      aria-label="Add product"
    >
      <svg className="vendor-plus-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
      <span>Add</span>
    </Link>
  );
}
