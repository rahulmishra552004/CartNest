import axios from 'axios';
import { formatCurrency } from '../../utils/money.js';
import { useState } from 'react';
import { Link } from 'react-router';
import { errorMessage } from '../profile/accountErrors.js';

export function Product({ product, getCartData, user, linkToDetails = true }) {
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState('');
  const productUrl = `/products/${encodeURIComponent(product.id)}`;
  const soldOut = product.inventory_stock === 0;
  const quantityLimit = Math.min(10, Math.max(1, product.inventory_stock ?? 10));
  const NameTag = linkToDetails ? 'div' : 'h1';

  async function addToCart() {
    if (isAdding || soldOut) return;
    setIsAdding(true);
    setAdded(false);
    setError('');
    try {
      await axios.get('/api/auth/csrf/');
      await axios.post('/api/cart-items/', { productId: product.id, quantity });
      setAdded(true);
      try {
        await getCartData();
      } catch {
        setError('Added to your cart, but the cart count could not refresh. Please reload the page.');
      }
    } catch (requestError) {
      const data = requestError.response?.data;
      setError(errorMessage(data?.detail) || errorMessage(data?.non_field_errors) || 'Unable to add this item. Please try again.');
    } finally {
      setIsAdding(false);
    }
  }
  return (
    <div className="product-container">
      <div className="product-image-container">
        {linkToDetails ? (
          <Link className="product-image-link" to={productUrl} aria-label={`View ${product.name}`}>
            <img className="product-image" src={product.image} alt={product.name} />
          </Link>
        ) : <img className="product-image" src={product.image} alt={product.name} />}
      </div>

      <NameTag className={`product-name${linkToDetails ? ' limit-text-to-2-lines' : ''}`}>
        {linkToDetails ? <Link className="product-name-link" to={productUrl}>{product.name}</Link> : product.name}
      </NameTag>

      <div className="product-rating-container">
        <img className="product-rating-stars"
          src={`/media/ratings/rating-${product.rating.stars * 10}.png`} alt={`${product.rating.stars} out of 5 stars`} />
        <div className="product-rating-count link-primary">
          {product.rating.count}
        </div>
      </div>

      <div className="product-price">
        ${formatCurrency(product.priceCents)}
      </div>

      {!linkToDetails && <p className="product-stock">{soldOut ? 'Currently out of stock' : `${product.inventory_stock} available`}</p>}

      <div className="product-spacer"></div>

      <div className="product-quantity-container">
        <select
          aria-label={`Quantity for ${product.name}`}
          value={quantity}
          disabled={soldOut || isAdding}
          onChange={(event) => {
            setQuantity(Number(event.target.value));
            setAdded(false);
          }}
        >
          {Array.from({ length: quantityLimit }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
        </select>
      </div>

      <div className="product-actions">
        <div className={`added-to-cart${added ? ' is-visible' : ''}`} role="status">
          {added && <><img src="/media/icons/checkmark.png" alt="" />Added to cart</>}
        </div>

        {user ? (
          <button className="add-to-cart-button button-primary" onClick={addToCart} disabled={isAdding || soldOut}>
            {soldOut ? 'Out of stock' : isAdding ? 'Adding…' : 'Add to Cart'}
          </button>
        ) : <Link className="add-to-cart-button button-primary" to="/login">Sign in to add to cart</Link>}
      </div>
      {error && <p className="product-error" role="alert">{error}</p>}
    </div>
  );
}
