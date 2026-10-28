import { NavLink } from 'react-router';
import './VendorCatalogNavigation.css';

export function VendorCatalogNavigation() {
  const linkClass = ({ isActive }) => `vendor-navigation-link${isActive ? ' vendor-navigation-link-active' : ''}`;

  return (
    <nav className="vendor-navigation" aria-label="Vendor dashboard">
      <NavLink className={linkClass} to="/vendor/catalog">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
        Catalog
      </NavLink>

      <NavLink className={linkClass} to="/vendor/orders">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 3.5h12a2 2 0 0 1 2 2v15l-3-2-2.5 2-2.5-2-2.5 2-2.5-2-3 2v-15a2 2 0 0 1 2-2Z" />
          <path d="M8 8h8M8 12h8" />
        </svg>
        Orders
      </NavLink>
    </nav>
  );
}
