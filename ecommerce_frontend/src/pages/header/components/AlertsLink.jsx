import { NavLink } from 'react-router';

export function AlertsLink() {
  return (
    <NavLink className="vendor-header-link alerts-link header-link" to="/vendor/alerts">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </svg>
      <span className="vendor-header-link-label">Alerts</span>
    </NavLink>
  );
}
