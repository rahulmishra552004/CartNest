import { AddressDetails } from '../../checkout/delivery-address/AddressDetails.jsx';
import { useState } from 'react';
import axios from 'axios';
import { getRequestErrorMessage } from '../../../utils/addressErrors.js';

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 10.5 9-7 9 7" />
      <path d="M5 9.5V20h14V9.5M10 20v-6h4v6" />
    </svg>
  );
}

function OfficeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function LabelIcon({ label }) {
  const name = label?.toLowerCase();
  if (name === 'home') return <HomeIcon />;
  if (name === 'office' || name === 'work') return <OfficeIcon />;
  return <PinIcon />;
}

export function SavedAddressRow({ address, loadAddresses, onEdit }) {
  const description = `the ${address.label || 'saved'} address for ${address.recipientName}`;
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleDelete(addressId) {
    setIsLoading(true);
    setError('');
    try {
      await axios.delete(`/api/addresses/${addressId}/`);
      await loadAddresses();
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, "We couldn't remove this address. Please try again."));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSetDefault() {
    setIsLoading(true);
    setError('');
    try {
      await axios.patch(`/api/addresses/${address.id}/`, { isDefault: true });
      await loadAddresses();
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, "We couldn't make this your default address. Please try again."));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <li
      className={`saved-address-row${address.isDefault ? ' saved-address-row-default' : ''}`}
      aria-busy={isLoading}
    >
      <span className="saved-address-icon" aria-hidden="true">
        <LabelIcon label={address.label} />
      </span>

      <AddressDetails address={address} />

      <div className="saved-address-actions">
        {!address.isDefault && (
          <button
            type="button"
            className="saved-address-action saved-address-action-link"
            aria-label={`Make ${description} your default`}
            onClick={handleSetDefault}
            disabled={isLoading}
          >
            Set as default
          </button>
        )}

        <button
          type="button"
          className="saved-address-action"
          aria-label={`Edit ${description}`}
          onClick={() => onEdit(address)}
          disabled={isLoading}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          Edit
        </button>

        <button
          type="button"
          className="saved-address-action saved-address-action-danger"
          aria-label={`Remove ${description}`}
          onClick={() => handleDelete(address.id)}
          disabled={isLoading}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
          </svg>
          Remove
        </button>
      </div>

      {error && <p className="saved-address-error" role="alert">{error}</p>}
    </li>
  );
}
