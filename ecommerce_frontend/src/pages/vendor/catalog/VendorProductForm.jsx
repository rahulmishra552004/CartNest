import { Link, useNavigate } from 'react-router';
import { useState } from 'react';
import axios from 'axios';
import { accountError, errorMessage } from '../../profile/accountErrors.js';

function productRequestError(requestError) {
  const data = requestError.response?.data;

  if (requestError.response?.status === 400 && data && typeof data === 'object') {
    const fieldLabels = {
      name: 'Product name',
      priceCents: 'Price',
      inventoryStock: 'Available stock',
      image: 'Product image',
    };
    const fieldErrors = Object.entries(fieldLabels)
      .map(([field, label]) => {
        const message = errorMessage(data[field]);
        return message ? `${label}: ${message}` : '';
      })
      .filter(Boolean);

    if (fieldErrors.length) return fieldErrors.join(' ');
  }

  return accountError(requestError);
}

export function VendorProductForm({
  titleId,
  title,
  product,
  description,
  primaryActionLabel,
  showDeleteAction = false,
  onSubmit,
}) {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isBusy = isSubmitting || isDeleting;

  function prepareFormData(formElement) {
    const formData = new FormData(formElement);

    formData.set('name', formData.get('name').trim());
    formData.set('priceCents', Math.round(Number(formData.get('price')) * 100));
    formData.delete('price');
    if (!formData.get('image')?.size) formData.delete('image');

    return formData;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await onSubmit(prepareFormData(event.currentTarget));
    } catch (requestError) {
      setError(productRequestError(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(`Delete "${product.name}"? This action cannot be undone.`);
    if (!confirmed) return;

    setError('');
    setIsDeleting(true);

    try {
      await axios.delete(`/api/vendor/products/${product.id}/`);
      navigate('/vendor/catalog', {
        state: { successMessage: 'Product deleted successfully.' },
      });
    } catch (requestError) {
      setError(productRequestError(requestError));
      setIsDeleting(false);
    }
  }

  return (
    <form className="vendor-product-details-card" onSubmit={handleSubmit} aria-busy={isBusy}>
      <div className="vendor-details-image-panel">
        <div className="vendor-details-image-container">
          {product?.image ? (
            <img src={product.image} alt={product.name} />
          ) : (
            <div className="vendor-details-image-placeholder" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <circle cx="8.5" cy="9" r="1.5" />
                <path d="m4 17 4.5-4.5 3.5 3 2.5-2.5 5.5 5" />
              </svg>
              <span>Product image preview</span>
            </div>
          )}
        </div>

        <div className="vendor-details-image-field">
          <label htmlFor="vendor-product-image">Product image</label>
          <input
            id="vendor-product-image"
            name="image"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            required={!product}
          />
          <p>Choose a JPG, PNG, or WebP image.</p>
        </div>
      </div>

      <div className="vendor-details-copy">
        <p className="vendor-eyebrow">Catalog product</p>
        <h1 id={titleId}>{title}</h1>
        <p className="vendor-product-form-description">{description}</p>

        <div className="vendor-details-fields">
          <div className="vendor-details-field">
            <label htmlFor="vendor-product-name">Product name</label>
            <input
              id="vendor-product-name"
              name="name"
              type="text"
              placeholder="Enter a product name"
              defaultValue={product?.name ?? ''}
              required
            />
          </div>

          <div className="vendor-details-field">
            <label htmlFor="vendor-product-price">Price</label>
            <div className="vendor-price-input">
              <span aria-hidden="true">$</span>
              <input
                id="vendor-product-price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                inputMode="decimal"
                defaultValue={product ? (product.priceCents / 100).toFixed(2) : ''}
                required
              />
            </div>
          </div>

          <div className="vendor-details-field">
            <label htmlFor="vendor-product-stock">Available stock</label>
            <input
              id="vendor-product-stock"
              name="inventoryStock"
              type="number"
              min="0"
              placeholder="0"
              inputMode="numeric"
              defaultValue={product?.inventoryStock ?? ''}
              required
            />
          </div>
        </div>

        {error && (
          <p className="vendor-product-form-message vendor-product-form-error" role="alert">
            {error}
          </p>
        )}

        <div className="vendor-details-actions">
          <button className="vendor-update-button" type="submit" disabled={isBusy}>
            {isSubmitting ? 'Saving…' : primaryActionLabel}
          </button>
          {showDeleteAction && (
            <button
              className="vendor-delete-button"
              type="button"
              onClick={handleDelete}
              disabled={isBusy}
            >
              {isDeleting ? 'Deleting…' : 'Delete product'}
            </button>
          )}
          <Link className="vendor-product-form-cancel" to="/vendor/catalog">Cancel</Link>
        </div>
      </div>
    </form>
  );
}
