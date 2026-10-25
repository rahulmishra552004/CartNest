import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import axios from 'axios';
import { Header } from '../Header.jsx';
import { Product } from './Product.jsx';
import { accountError } from '../profile/accountErrors.js';
import './HomePage.css';
import './ProductDetailsPage.css';

export function ProductDetailsPage({ cart, user, getCartData }) {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadProduct() {
      setIsLoading(true);
      setError('');
      setProduct(null);
      try {
        const response = await axios.get(`/api/products/${encodeURIComponent(productId)}/`, { signal: controller.signal });
        if (!controller.signal.aborted) setProduct(response.data);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setError(requestError.response?.status === 404 ? 'This product is no longer available.' : accountError(requestError));
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    loadProduct();
    return () => controller.abort();
  }, [productId, user?.id, retry]);

  return (
    <>
      <title>{product ? `${product.name} | CartNest` : 'Product details | CartNest'}</title>
      <Header cart={cart} user={user} />
      <main className="home-page product-details-page">
        <div className="product-details-content">
          <nav className="product-details-breadcrumb" aria-label="Breadcrumb"><Link to="/">Shop</Link><span aria-hidden="true">/</span><span aria-current="page">Product details</span></nav>
          {isLoading ? <div className="product-details-state" role="status">Loading product…</div> : error ? (
            <div className="product-details-state">
              <p role="alert">{error}</p>
              <button className="button-primary product-details-retry" onClick={() => setRetry((value) => value + 1)}>Try again</button>
            </div>
          ) : product && <Product key={product.id} product={product} getCartData={getCartData} user={user} linkToDetails={false} />}
          {user && <Link className="product-details-history" to="/recently-viewed">View recently viewed products</Link>}
        </div>
      </main>
    </>
  );
}
