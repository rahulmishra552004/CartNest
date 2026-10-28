import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router'
import './LogoutPage.css';
import { BrandLogo } from '../../components/BrandLogo.jsx';

export function LogoutPage({ onLogout }){
  const [isLoading, setIsLoading] = useState(true);
  const logoutStarted = useRef(false);

  useEffect(() => {
    if (logoutStarted.current) return;
    logoutStarted.current = true;

    async function logout() {
      await onLogout();
      setIsLoading(false);
    }

    logout();
  }, [onLogout]);

  if (!isLoading){
    return (
      <main className="logout-page">
        <title>Signed out | CartNest</title>
        <section className="logout-card" aria-labelledby="logout-title">
          <Link to="/" className="logout-logo-link" aria-label="CartNest home">
            <BrandLogo className="logout-logo" />
          </Link>
          <div className="logout-success-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="m6 12 4 4 8-8" />
            </svg>
          </div>
          <h1 id="logout-title">You’re signed out</h1>
          <p className="logout-description">
            Thanks for stopping by. Sign in again whenever you’re ready to keep shopping.
          </p>
          <Link to="/login" className="button-primary logout-login-link">
            Sign in again
          </Link>
        </section>
      </main>
    )
  } else {
    return (
      <main className="logout-page">
        <title>Signing out | CartNest</title>
        <section className="logout-card" role="status" aria-live="polite">
          <BrandLogo className="logout-logo" />
          <div className="logout-spinner" aria-hidden="true" />
          <h1>Signing you out…</h1>
          <p className="logout-description">Please wait while we finish signing you out.</p>
        </section>
      </main>
    )
  }
}
