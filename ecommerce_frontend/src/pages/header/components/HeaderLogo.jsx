import { Link } from 'react-router';
import { BrandLogo } from '../../../components/BrandLogo.jsx';

export function HeaderLogo({ to = '/' }) {
  return (
    <Link to={to} className="header-link" aria-label="CartNest home">
      <BrandLogo className="logo" light />
      <BrandLogo className="mobile-logo" iconOnly light />
    </Link>
  );
}
