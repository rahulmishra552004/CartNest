import axios from 'axios';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import './VendorCatalog.css';
import { VendorHeader } from '../../header/VendorHeader.jsx';
import { VendorCatalogNavigation } from './VendorCatalogNavigation.jsx';
import { VendorProductCard } from './VendorProductCard.jsx';
import { EmptyState } from '../../../components/EmptyState.jsx';
import { Pagination } from '../../../components/Pagination.jsx';
import { accountError } from '../../profile/accountErrors.js';
import { getPage, withPage, isMissingPage } from '../../../utils/pagination.js';
import { useState, useEffect } from 'react';

//the ?sort= values /api/vendor/products/ accepts; name_asc is also its default
const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Name: A–Z' },
  { value: 'name_desc', label: 'Name: Z–A' },
  { value: 'price_asc', label: 'Price: Low to high' },
  { value: 'price_desc', label: 'Price: High to low' },
  { value: 'rating_desc', label: 'Highest rated' },
];
const DEFAULT_SORT = 'name_asc';

export function VendorCatalogPage({ user }) {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [vendorProducts, setVendorProducts] = useState();
  //how many products match across every page, for "Page X of Y"
  const [count, setCount] = useState(0);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(state?.successMessage ?? '');
  const [searchParams, setSearchParams] = useSearchParams();

  //the sort lives in the URL like on the home page, so it survives a reload or the back button.
  //an unknown value (e.g. typed by hand) falls back to the default instead of failing the request
  const sortParam = searchParams.get('sort');
  const sort = SORT_OPTIONS.some((option) => option.value === sortParam) ? sortParam : DEFAULT_SORT;
  //set by the "Search your catalog" box in the vendor header
  const search = (searchParams.get('search') ?? '').trim();
  const page = getPage(searchParams);
  //"Clear search" keeps the chosen sort (and starts again from page 1)
  const clearSearchUrl = sort === DEFAULT_SORT ? '/vendor/catalog' : `/vendor/catalog?sort=${sort}`;

  function handleSortChange(value) {
    const nextParams = new URLSearchParams(searchParams);
    if (value === DEFAULT_SORT) {
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

  function handleProductDeleted(productId) {
    const remaining = vendorProducts.filter((product) => product.id !== productId);
    setVendorProducts(remaining);
    setCount((current) => current - 1);
    setSuccessMessage('Product deleted successfully.');
    //deleting the last product on a later page would leave an empty page with no controls
    if (remaining.length === 0 && page > 1) {
      goToPage(page - 1);
    }
  }

  useEffect(() => {
    if (state?.successMessage) {
      navigate('/vendor/catalog', { replace: true });
    }
  }, [navigate, state?.successMessage]);
  
  //reloads when the sort, search or page changes; the current list stays on screen until the new one arrives
  useEffect(() => {
    //a newer request cancels this one, so an older answer can't replace the newer list
    const controller = new AbortController();
    const getVendorProducts = async () => {
      setError('');
      try {
        const response = await axios.get('/api/vendor/products/', {
          signal: controller.signal,
          //like the home page, an empty search and page 1 aren't sent
          params: { sort, ...(search === '' ? {} : { search }), ...(page === 1 ? {} : { page }) },
        });
        if (controller.signal.aborted) return;
        setVendorProducts(response.data.results);
        setCount(response.data.count);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        //?page= past the last page (an old link, or products were deleted): go back to page 1
        if (isMissingPage(requestError, page)) {
          setSearchParams((params) => withPage(params, 1), { replace: true });
          return;
        }
        setError(accountError(requestError));
      }
    }
    getVendorProducts();
    return () => controller.abort();
  }, [sort, search, page, setSearchParams]);

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
              <div className="vendor-catalog-heading-actions">
                {!error && vendorProducts?.length > 0 && (
                  <label className="vendor-catalog-sort">
                    <span>Sort by</span>
                    <select name="sort" value={sort} onChange={(event) => handleSortChange(event.target.value)}>
                      {SORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                )}

                <Link id="add-product" className="vendor-add-product-button" to="/vendor/catalog/new">
                  <span aria-hidden="true">+</span>
                  Add new product
                </Link>
              </div>
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
            ) : search && vendorProducts?.length === 0 ? (
              <EmptyState
                eyebrow="No matches"
                title={`No products match “${search}”`}
                description="Check the spelling or try a shorter word. Search looks at your product names and keywords."
                primaryAction={{ label: 'Clear search', to: clearSearchUrl }}
              />
            ) : (
              <>
                <div className="vendor-products-grid">
                  {vendorProducts?.map((product) => (
                    <VendorProductCard
                      key={product.id}
                      product={product}
                      onDeleted={handleProductDeleted}
                    />
                  ))}
                </div>
                <Pagination page={page} count={count} onPageChange={goToPage} label="Catalog pages" />
              </>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
