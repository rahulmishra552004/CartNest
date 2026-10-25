import { Link } from 'react-router';
import { Header } from '../Header.jsx';
import './ProfilePage.css';
import './AccountSettings.css';

export function AccountSettingsLayout({ cart, user, title, description, children }) {
  return (
    <>
      <title>{title} | CartNest</title>
      <Header cart={cart} user={user} />
      <main className="profile-page">
        <div className="profile-content account-settings-content">
          <nav className="profile-breadcrumb" aria-label="Breadcrumb">
            <Link to="/profile">My profile</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{title}</span>
          </nav>
          <div className="profile-heading">
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          {children}
        </div>
      </main>
    </>
  );
}
