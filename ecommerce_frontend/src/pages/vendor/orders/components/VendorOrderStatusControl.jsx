import { useState } from 'react';
import axios from 'axios';
import { getRequestErrorMessage } from '../../../../utils/addressErrors.js';

const STATUSES = [
  { value: 'preparing', label: 'Preparing' },
  { value: 'shipping', label: 'Shipping' },
  { value: 'delivered', label: 'Delivered' },
];

const UPDATE_ERROR_MESSAGE = "We couldn't update this status. Please try again.";

//a rejected status comes back as a 400 like { deliveryStatus: ['order status can only move one step forward'] }
function getStatusErrorMessage(requestError) {
  const statusMessage = requestError?.response?.data?.deliveryStatus?.[0];
  return statusMessage ?? getRequestErrorMessage(requestError, UPDATE_ERROR_MESSAGE);
}

export function VendorOrderStatusControl({ orderId, status, setPendingOrders }) {
  const [currentIndex, setCurrentIndex] = useState(
    STATUSES.findIndex((s) => s.value === status)
  );
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleChange(event) {
    const newStatus = event.target.value;
    try {
      setLoading(true);
      setError(null);
      await axios.patch(`/api/vendor/orders/${orderId}/`,
        {'deliveryStatus' : newStatus});
      setCurrentIndex(currentIndex+1);
      if (newStatus === 'delivered') {
        setPendingOrders((pendingOrders) => pendingOrders-1);
      }
    } catch (requestError) {
      setError(getStatusErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <fieldset className="vendor-order-status-control">
        <legend className="vendor-visually-hidden">Delivery status for order {orderId}</legend>
        {STATUSES.map((option, index) => (
          <label key={option.value} className={`vendor-status-option vendor-status-option-${option.value}`}>
            <input
              type="radio"
              name={`status-${orderId}`}
              value={option.value}
              checked={index === currentIndex}
              disabled={loading || index !== currentIndex+1}
              onChange={handleChange}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>

      {error && (
        <p className="vendor-order-status-error" role="alert">{error}</p>
      )}
    </>
  );
}
