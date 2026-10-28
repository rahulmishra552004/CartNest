import './Header.css';
import { HeaderLogo } from './components/HeaderLogo.jsx';

export function HeaderLayout({ search, children, logoTo = '/' }) {
  return (
    <header className="header">
      <div className="left-section">
        <HeaderLogo to={logoTo} />
      </div>

      {search}

      <div className="right-section">
        {children}
      </div>
    </header>
  );
}
