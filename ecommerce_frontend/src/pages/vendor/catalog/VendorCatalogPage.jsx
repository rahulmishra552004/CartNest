import axios from 'axios';
import { Link, useLocation, useNavigate } from 'react-router';
import './VendorCatalog.css';
import { VendorHeader } from '../../header/VendorHeader.jsx';
import { VendorCatalogNavigation } from './VendorCatalogNavigation.jsx';
import { VendorProductCard } from './VendorProductCard.jsx';
import { accountError } from '../../profile/accountErrors.js';
import { useState, useEffect } from 'react';

export function VendorCatalogPage({ user }) {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [vendorProducts, setVendorProducts] = useState();
  const [error, setError] = useState('');
  const [successMessage] = useState(state?.successMessage ?? '');

  useEffect(() => {
    if (state?.successMessage) {
      navigate('/vendor/catalog', { replace: true });
    }
  }, [navigate, state?.successMessage]);
  
  useEffect(() => {
    const getVendorProducts = async () => {
      setError('');
      try {
        const response = await axios.get('/api/vendor/products/');
        const data = response.data;
        setVendorProducts(data);
      } catch (requestError) {
        setError(accountError(requestError));
      }
    }
    getVendorProducts();
  }, []);

  return (
    <>
      <title>Vendor catalog | CartNest</title>
      <VendorHeader user={user} />

      <main className="vendor-page">
        <div className="vendor-page-content">
          <VendorCatalogNavigation />

          <section className="vendor-catalog" aria-labelledby="vendor-catalog-title">
            <header className="vendor-catalog-heading">
              <div>
                <p className="vendor-eyebrow">Vendor dashboard</p>
                <h1 id="vendor-catalog-title">Your catalog</h1>
                <p>Review your products and keep their available quantities up to date.</p>
              </div>
              <Link id="add-product" className="vendor-add-product-button" to="/vendor/catalog/new">
                <span aria-hidden="true">+</span>
                Add new product
              </Link>
            </header>

            {successMessage && (
              <div className="vendor-catalog-success" role="status" aria-live="polite">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m5 12 4 4L19 6" />
                </svg>
                <span>{successMessage}</span>
              </div>
            )}

            {error ? (
              <section className="vendor-catalog-error" role="alert" aria-live="assertive">
                <div className="vendor-catalog-error-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 8v5" />
                    <path d="M12 17h.01" />
                    <path d="M10.3 3.7 2.5 17.2A2 2 0 0 0 4.2 20h15.6a2 2 0 0 0 1.7-2.8L13.7 3.7a2 2 0 0 0-3.4 0Z" />
                  </svg>
                </div>
                <div className="vendor-catalog-error-copy">
                  <p className="vendor-catalog-error-eyebrow">Catalog unavailable</p>
                  <h2>We couldn’t load your products</h2>
                  <p>{error}</p>
                  <Link className="vendor-catalog-error-link" to="/vendor/about">Contact support</Link>
                </div>
              </section>
            ) : (
              <div className="vendor-products-grid">
                {vendorProducts?.map((product) => (
                  <VendorProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
