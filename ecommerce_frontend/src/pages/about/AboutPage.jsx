import { Link } from 'react-router';
import { CustomerHeader } from '../header/CustomerHeader.jsx';
import { VendorHeader } from '../header/VendorHeader.jsx';
import './AboutPage.css';

export function AboutPage({ cart, user, headerVariant = 'customer' }) {
  return (
    <>
      <title>About us | CartNest</title>
      {headerVariant === 'vendor'
        ? <VendorHeader user={user} />
        : <CustomerHeader cart={cart} user={user} />}

      <main className="about-page">
        <div className="about-content">
          <nav className="about-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">About us</span>
          </nav>

          <div className="about-layout">
            <section className="about-intro" aria-labelledby="about-title">
              <span className="about-eyebrow">ABOUT OUR STORE</span>
              <h1 id="about-title">Shopping made simple.</h1>
              <p>
                Discover products, find your next favorite, and keep track of your
                orders in one place. We’re building a straightforward shopping
                experience that’s easy to explore.
              </p>
              <p>
                Have a question about the store or feedback to share? We’d love
                to hear from you.
              </p>
              <Link to="/" className="button-primary about-shop-link">
                Explore products
              </Link>
            </section>

            <section className="about-contact-card" aria-labelledby="about-contact-title">
              <h2 id="about-contact-title">Get in touch</h2>
              <p className="about-contact-description">
                Reach out by phone or email.
              </p>

              <address className="about-contact-details">
                <a className="about-contact-link" href="tel:7206489985">
                  <span className="about-contact-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2.1Z" />
                    </svg>
                  </span>
                  <span className="about-contact-text">
                    <span className="about-contact-label">Phone</span>
                    <span>7206489985</span>
                  </span>
                </a>

                <a className="about-contact-link" href="mailto:rahulmishra552004@gmail.com">
                  <span className="about-contact-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="m3 6 9 7 9-7" />
                    </svg>
                  </span>
                  <span className="about-contact-text">
                    <span className="about-contact-label">Email</span>
                    <span>rahulmishra552004@gmail.com</span>
                  </span>
                </a>
              </address>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
