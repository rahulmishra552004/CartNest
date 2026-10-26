import { Header } from '../Header.jsx';
import './HomePage.css';
import axios from 'axios'
import { useEffect, useState } from 'react';
import { ProductsGrid } from './ProductsGrid.jsx';
import { CatalogNavigation } from './CatalogNavigation.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { accountError } from '../profile/accountErrors.js';

export function HomePage({ cart, getCartData, user }) {

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [sort, setSort] = useState('default');

  useEffect(() => {
    const controller = new AbortController();
    const getProductsData = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await axios.get('/api/products/', {
          signal: controller.signal,
          params: sort === 'default' ? {} : {sort},
        });
        if (controller.signal.aborted) return;
        if (!Array.isArray(response.data)) throw new Error('Unexpected product response');
        setProducts(response.data);
      } catch (requestError) {
        if (!controller.signal.aborted) setError(accountError(requestError));
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    getProductsData();
    return () => controller.abort();
  }, [retry, sort]);

  return (
    <>
      <title>
        CartNest
      </title>

      <Header cart={cart} user={user} />

      <main className="home-page catalog-home-page">
        <div className="catalog-home-content">
          <CatalogNavigation sort={sort} onSortChange={setSort} />
          {isLoading ? (
            <EmptyState title="Finding your next favorite" description="Loading products from the shop…" role="status" />
          ) : error ? (
            <EmptyState title="We couldn’t load the shop" description={error} role="alert" primaryAction={{ label: 'Try again', onClick: () => setRetry((value) => value + 1) }} secondaryAction={{ label: 'Contact us', to: '/about' }} />
          ) : products.length === 0 ? (
            <EmptyState eyebrow="Something good is on its way" title="Fresh finds are coming soon" description="There aren’t any products to browse right now. Check back soon to discover something you’ll love." primaryAction={{ label: 'Refresh products', onClick: () => setRetry((value) => value + 1) }} secondaryAction={{ label: 'Contact us', to: '/about' }} />
          ) : (
            <div className="products-grid">
              <ProductsGrid products={products} getCartData={getCartData} user={user} />
            </div>
          )}
        </div>
      </main>
    </>
  )
}
