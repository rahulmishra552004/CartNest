import { NavLink } from 'react-router';
import './CatalogNavigation.css';

export function CatalogNavigation({ sort, onSortChange }) {
  const linkClass = ({ isActive }) => `catalog-navigation-link${isActive ? ' catalog-navigation-link-active' : ''}`;

  return (
    <nav className="catalog-navigation" aria-label="Browse products">
      <div className="catalog-navigation-links">
        <NavLink className={linkClass} to="/" end>All products</NavLink>
        <NavLink className={linkClass} to="/trending">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 17 6-6 4 4L21 5M15 5h6v6" /></svg>
          Trending products
        </NavLink>
        <NavLink className={linkClass} to="/recently-viewed">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
          Recently viewed
        </NavLink>
      </div>
      {onSortChange && (
        <label className="catalog-sort">
          <span>Sort by</span>
          <select name="sort" value={sort} onChange={(event) => onSortChange(event.target.value)}>
            <option value="default">Default</option>
            <option value="price_asc">Price: Low to high</option>
            <option value="price_desc">Price: High to low</option>
            <option value="rating_desc">Highest rated</option>
            <option value="name_asc">Name: A–Z</option>
            <option value="name_desc">Name: Z–A</option>
          </select>
        </label>
      )}
    </nav>
  );
}
