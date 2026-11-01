import '../../checkout/delivery-address/AddressForm.css';
import { useState } from 'react';
import axios from 'axios';
import { getFormError } from '../../../utils/addressErrors.js';

const LABEL_OPTIONS = ['Home', 'Office', 'Other'];

function getLabelOptions(currentLabel) {
  return currentLabel && !LABEL_OPTIONS.includes(currentLabel)
    ? [...LABEL_OPTIONS, currentLabel]
    : LABEL_OPTIONS;
}

function AddressField({ id, label, optional = false, hint, error, wide = false, ...inputProps }) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ');

  return (
    <div className={`address-form-field${wide ? ' address-form-field-wide' : ''}`}>
      <label htmlFor={id}>
        {label}
        {optional && <span className="address-form-optional"> (optional)</span>}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy || undefined}
        {...inputProps}
      />
      {hint && <p id={`${id}-hint`} className="address-form-hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="address-field-error">{error}</p>}
    </div>
  );
}

export function AddressForm({ address, onAddressSave, onCancel }) {
  const isEditing = Boolean(address);
  const selectedLabel = isEditing ? address.label : 'Home';
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fieldErrors = error?.fields ?? {};

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    const formData = new FormData(event.currentTarget);
    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing) {
        await axios.patch(`/api/addresses/${address.id}/`, formData);
      } else {
        await axios.post('/api/addresses/', formData);
      }
    } catch (requestError) {
      setError(getFormError(requestError));
      setIsSubmitting(false);
      return;
    }

    try {
      await onAddressSave();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="address-form" onSubmit={handleSubmit} aria-busy={isSubmitting}>
      <h3 className="address-view-title">{isEditing ? 'Edit address' : 'Add a new address'}</h3>

      {error?.message && (
        <p className="address-form-error" role="alert">{error.message}</p>
      )}

      <div className="address-form-grid">
        <AddressField
          id="address-recipient-name" label="Full name" name="recipientName"
          autoComplete="name" maxLength={150} required autoFocus
          error={fieldErrors.recipientName} defaultValue={address?.recipientName}
        />
        <AddressField
          id="address-phone-number" label="Phone number" name="phoneNumber"
          type="tel" autoComplete="tel" maxLength={20} placeholder="+91 98765 43210"
          hint="Include your country code." required
          error={fieldErrors.phoneNumber} defaultValue={address?.phoneNumber}
        />
        <AddressField
          id="address-line1" label="Address line 1" name="line1" wide
          autoComplete="address-line1" maxLength={200}
          placeholder="Flat or house no., building, street" required
          error={fieldErrors.line1} defaultValue={address?.line1}
        />
        <AddressField
          id="address-line2" label="Address line 2" name="line2" wide optional
          autoComplete="address-line2" maxLength={200} placeholder="Area, locality or landmark"
          error={fieldErrors.line2} defaultValue={address?.line2}
        />
        <AddressField
          id="address-city" label="City" name="city"
          autoComplete="address-level2" maxLength={100} required
          error={fieldErrors.city} defaultValue={address?.city}
        />
        <AddressField
          id="address-state" label="State" name="state"
          autoComplete="address-level1" maxLength={100} required
          error={fieldErrors.state} defaultValue={address?.state}
        />
        <AddressField
          id="address-postal-code" label="PIN code" name="postalCode"
          autoComplete="postal-code" inputMode="numeric" maxLength={20} required
          error={fieldErrors.postalCode} defaultValue={address?.postalCode}
        />
        <div className="address-form-field">
          <label htmlFor="address-country">Country</label>
          <select
            id="address-country" name="countryCode" autoComplete="country"
            defaultValue={address?.countryCode || 'IN'}
            aria-invalid={Boolean(fieldErrors.countryCode)}
            aria-describedby={fieldErrors.countryCode ? 'address-country-error' : undefined}
          >
            <option value="IN">India</option>
            <option value="AE">United Arab Emirates</option>
            <option value="GB">United Kingdom</option>
            <option value="US">United States</option>
          </select>
          {fieldErrors.countryCode && (
            <p id="address-country-error" className="address-field-error">{fieldErrors.countryCode}</p>
          )}
        </div>
      </div>

      <fieldset
        className="address-label-options"
        aria-describedby={fieldErrors.label ? 'address-label-error' : undefined}
      >
        <legend className="address-form-legend">Save as</legend>
        <div className="address-label-chips">
          {getLabelOptions(selectedLabel).map((option) => (
            <label key={option} className="address-label-chip">
              <input type="radio" name="label" value={option} defaultChecked={option === selectedLabel} />
              <span>{option}</span>
            </label>
          ))}
        </div>
        {fieldErrors.label && (
          <p id="address-label-error" className="address-field-error">{fieldErrors.label}</p>
        )}
      </fieldset>

      {!address?.isDefault && (
        <label className="address-default-checkbox">
          <input type="checkbox" name="isDefault" />
          Make this my default address
        </label>
      )}

      <div className="address-actions">
        <button type="submit" className="button-primary address-action" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : isEditing ? 'Save changes' : 'Save address'}
        </button>
        <button
          type="button"
          className="button-secondary address-action"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
