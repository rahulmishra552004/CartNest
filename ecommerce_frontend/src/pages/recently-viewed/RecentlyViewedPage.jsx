import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import axios from 'axios';
import { Header } from '../Header.jsx';
import { ProductsGrid } from '../home/ProductsGrid.jsx';
import { accountError } from '../profile/accountErrors.js';
import '../home/HomePage.css';
import './RecentlyViewedPage.css';

export function RecentlyViewedPage({ cart, user, getCartData, onSessionExpired }) {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadProducts() {
      setIsLoading(true);
      setError('');
      try {
        const response = await axios.get('/api/products/recently-viewed/', { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!Array.isArray(response.data)) throw new Error('Unexpected product response');
        setProducts(response.data);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        if ([401, 403].includes(requestError.response?.status)) {
          onSessionExpired();
          return;
        }
        setError(accountError(requestError));
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    loadProducts();
    return () => controller.abort();
  }, [user.id, refresh, onSessionExpired]);

  return (
    <>
      <title>Recently viewed | CartNest</title>
      <Header cart={cart} user={user} />
      <main className="home-page recently-viewed-page">
        <div className="recently-viewed-content">
          <nav className="recently-viewed-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Recently viewed</span>
          </nav>
          <div className="recently-viewed-heading">
            <div><h1>Recently viewed</h1><p>Pick up where you left off. Your most recent finds, all in one place.</p></div>
            {!isLoading && !error && products.length > 0 && <span className="recently-viewed-count">{products.length} {products.length === 1 ? 'product' : 'products'}</span>}
          </div>
          {isLoading ? (
            <div className="recently-viewed-state" role="status">Loading your recently viewed products…</div>
          ) : error ? (
            <div className="recently-viewed-state">
              <p className="recently-viewed-error" role="alert">{error}</p>
              <button className="button-primary recently-viewed-action" onClick={() => setRefresh((value) => value + 1)}>Try again</button>
            </div>
          ) : products.length === 0 ? (
            <section className="recently-viewed-state" aria-labelledby="recently-viewed-empty-title">
              <svg className="recently-viewed-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
              <h2 id="recently-viewed-empty-title">Your next favorite is waiting</h2>
              <p>Open a product from the shop and it will appear here, ready for another look.</p>
              <Link className="button-primary recently-viewed-action" to="/">Explore products</Link>
            </section>
          ) : (
            <section className="products-grid" aria-label="Recently viewed products, newest first">
              <ProductsGrid products={products} getCartData={getCartData} user={user} />
            </section>
          )}
        </div>
      </main>
    </>
  );
}
