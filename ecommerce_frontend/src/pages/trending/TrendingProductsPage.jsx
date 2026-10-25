import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import axios from 'axios';
import { Header } from '../Header.jsx';
import { CatalogNavigation } from '../home/CatalogNavigation.jsx';
import { ProductsGrid } from '../home/ProductsGrid.jsx';
import { accountError } from '../profile/accountErrors.js';
import '../home/HomePage.css';
import './TrendingProductsPage.css';

export function TrendingProductsPage({ cart, user, getCartData }) {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadTrendingProducts() {
      setIsLoading(true);
      setError('');
      try {
        const response = await axios.get('/api/products/most-viewed/', { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!Array.isArray(response.data)) throw new Error('Unexpected product response');
        setProducts(response.data);
      } catch (requestError) {
        if (!controller.signal.aborted) setError(accountError(requestError));
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    loadTrendingProducts();
    return () => controller.abort();
  }, [retry]);

  return (
    <>
      <title>Trending products | CartNest</title>
      <Header cart={cart} user={user} />
      <main className="home-page trending-page">
        <div className="trending-content">
          <CatalogNavigation />
          <header className="trending-heading">
            <span className="trending-eyebrow">Popular today</span>
            <h1>Trending products</h1>
            <p>Discover the products shoppers are viewing most on CartNest today.</p>
          </header>
          {isLoading ? (
            <div className="trending-state" role="status">Loading trending products…</div>
          ) : error ? (
            <div className="trending-state">
              <p className="trending-error" role="alert">{error}</p>
              <button className="button-primary trending-action" onClick={() => setRetry((value) => value + 1)}>Try again</button>
            </div>
          ) : products.length === 0 ? (
            <section className="trending-state" aria-labelledby="trending-empty-title">
              <h2 id="trending-empty-title">Find something worth a closer look</h2>
              <p>Popular products will appear here as shoppers explore the store.</p>
              <Link className="button-primary trending-action" to="/">Browse all products</Link>
            </section>
          ) : (
            <section className="products-grid" aria-label="Trending products, most viewed first">
              <ProductsGrid products={products} getCartData={getCartData} user={user} />
            </section>
          )}
        </div>
      </main>
    </>
  );
}
