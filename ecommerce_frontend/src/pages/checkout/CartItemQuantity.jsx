import { useState } from 'react';
import axios from 'axios';

//same limit as the quantity picker on the home page
const MAX_SELECTABLE_QUANTITY = 10;

function getQuantityErrorMessage(requestError) {
  if (!axios.isAxiosError(requestError) || !requestError.response) {
    return 'We couldn’t update the quantity. Check your connection and try again.';
  }

  //the select only offers allowed amounts, so a 400 here means the stock dropped since the page loaded,
  //e.g. { non_field_errors: ['quantity greater than inventory stock'] }
  if (requestError.response.status === 400) {
    return 'That many aren’t in stock any more. Pick a smaller amount.';
  }

  const detail = requestError.response.data?.detail;
  return typeof detail === 'string' && detail
    ? detail
    : 'We couldn’t update the quantity. Please try again.';
}

//1 up to the stock (at most 10), plus the current amount if it is already higher,
//so the select can always show what is in the cart
function getQuantityOptions(currentQuantity, stock) {
  const limit = Math.min(
    MAX_SELECTABLE_QUANTITY,
    Math.max(1, stock ?? MAX_SELECTABLE_QUANTITY),
  );
  const options = Array.from({ length: limit }, (_, index) => index + 1);

  if (currentQuantity > limit) {
    options.push(currentQuantity);
  }
  return options;
}

//the quantity picker and Delete button for one cart item; a new amount is saved as soon as it is picked
export function CartItemQuantity({ cartItem, getCartData, getPaymentSummary, onDelete }) {
  //the amount being saved right now; null means show what the cart says
  const [pendingQuantity, setPendingQuantity] = useState(null);
  const [error, setError] = useState('');

  const isSaving = pendingQuantity !== null;
  const selectId = `quantity-${cartItem.productId}`;
  const errorId = `${selectId}-error`;
  const options = getQuantityOptions(cartItem.quantity, cartItem.product.inventoryStock);

  async function handleQuantityChange(event) {
    //the select stays focusable while saving (a disabled one would drop keyboard focus),
    //so ignore changes until the current save finishes
    if (isSaving) return;

    const quantity = Number(event.target.value);
    if (quantity === cartItem.quantity) return;

    setPendingQuantity(quantity);
    setError('');

    try {
      await axios.put(`/api/cart-items/${cartItem.productId}/`, { quantity });
      //both report their own errors on the page, so a failed refresh needs no handling here
      await Promise.allSettled([getCartData(), getPaymentSummary()]);
    } catch (requestError) {
      //clearing pendingQuantity below puts the select back to the amount still in the cart
      setError(getQuantityErrorMessage(requestError));
    } finally {
      setPendingQuantity(null);
    }
  }

  return (
    <div className="product-quantity">
      <div className="quantity-row">
        <span className="quantity-field">
          <label htmlFor={selectId}>Quantity</label>
          <select
            id={selectId}
            className="quantity-select"
            value={pendingQuantity ?? cartItem.quantity}
            onChange={handleQuantityChange}
            aria-busy={isSaving}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
          >
            {options.map((quantity) => (
              <option key={quantity} value={quantity}>{quantity}</option>
            ))}
          </select>
        </span>
        <button
          type="button"
          className="delete-quantity-link link-primary"
          onClick={onDelete}
          aria-label={`Delete ${cartItem.product.name} from your cart`}
        >
          Delete
        </button>
      </div>
      {error && (
        <p id={errorId} className="quantity-error" role="alert">{error}</p>
      )}
    </div>
  );
}
