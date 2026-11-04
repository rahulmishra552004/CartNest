import './HomePage.css';
import { CustomerHeader } from '../header/CustomerHeader.jsx';
import axios from 'axios'
import { useEffect, useState } from 'react';
import { ProductsGrid } from './ProductsGrid.jsx';
import { Product } from './Product.jsx';
import { CatalogNavigation } from './CatalogNavigation.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { Pagination } from '../../components/Pagination.jsx';
import { accountError } from '../profile/accountErrors.js';
import { getPage, withPage, isMissingPage } from '../../utils/pagination.js';
import { useSearchParams } from 'react-router';

// Hidden card content reserves the same space as a normal product card.
const loadingProduct = {
  id: 'loading',
  name: '',
  priceCents: 0,
  rating: { stars: 0, count: 0 },
  inventoryStock: 0,
};

export function HomePage({ cart, getCartData, user }) {

  const [products, setProducts] = useState([]);
  //how many products match across every page, for "Page X of Y"
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('search') ?? '';
  const sort = searchParams.get('sort') ?? 'default';
  const page = getPage(searchParams);

  useEffect(() => {
    const controller = new AbortController();
    const getProductsData = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await axios.get('/api/products/', {
          signal: controller.signal,
          params: {
            ...(sort === 'default' ? {} : {sort}),
            ...(search === '' ? {} : {search}),
            //page 1 is sent without ?page=, so it uses the backend's cached first page
            ...(page === 1 ? {} : {page}),
          },
        });
        if (controller.signal.aborted) return;
        if (!Array.isArray(response.data?.results)) throw new Error('Unexpected product response');
        setProducts(response.data.results);
        setCount(response.data.count);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        //?page= past the last page (an old link, or fewer products now): go back to page 1
        if (isMissingPage(requestError, page)) {
          setSearchParams((params) => withPage(params, 1), { replace: true });
          return;
        }
        setError(accountError(requestError));
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    getProductsData();
    return () => controller.abort();
  }, [retry, sort, search, page, setSearchParams]);

  function handleSortChange(value) {
    const nextParams = new URLSearchParams(searchParams);

    if (value === 'default') {
      nextParams.delete('sort');
    } else {
      nextParams.set('sort', value);
    }
    //a new order starts again from its first page
    nextParams.delete('page');

    setSearchParams(nextParams);
  }

  function goToPage(nextPage) {
    setSearchParams(withPage(searchParams, nextPage));
    //start the new page at the top, not where the old one was scrolled to
    window.scrollTo(0, 0);
  }

  return (
    <>
      <title>
        CartNest
      </title>

      <CustomerHeader cart={cart} user={user} />

      <main className="home-page catalog-home-page">
        <div className="catalog-home-content">
          <CatalogNavigation sort={sort} onSortChange={handleSortChange}/>
          {isLoading ? (
            <>
              <span className="catalog-loading-status" role="status">Loading products</span>
              <div className="products-grid catalog-loading-grid" aria-hidden="true" inert>
                {Array.from({ length: products.length || 10 }, (_, index) => (
                  <Product
                    key={index}
                    product={products[index] ?? loadingProduct}
                    getCartData={getCartData}
                    user={user}
                  />
                ))}
              </div>
            </>
          ) : error ? (
            <EmptyState title="We couldn’t load the shop" description={error} role="alert" primaryAction={{ label: 'Try again', onClick: () => setRetry((value) => value + 1) }} secondaryAction={{ label: 'Contact us', to: '/about' }} />
          ) : products.length === 0 ? (
            <EmptyState eyebrow="Something good is on its way" title="Fresh finds are coming soon" description="There aren’t any products to browse right now. Check back soon to discover something you’ll love." primaryAction={{ label: 'Refresh products', onClick: () => setRetry((value) => value + 1) }} secondaryAction={{ label: 'Contact us', to: '/about' }} />
          ) : (
            <>
              <div className="products-grid catalog-products-ready">
                <ProductsGrid products={products} getCartData={getCartData} user={user} />
              </div>
              <Pagination page={page} count={count} onPageChange={goToPage} label="Product pages" />
            </>
          )}
        </div>
      </main>
    </>
  )
}
