const LABEL_OPTIONS = ['Home', 'Office', 'Other'];

//input names match the fields /api/addresses/ accepts
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

//error is { message, fields } from DeliveryAddress, or undefined.
//the form reads its own inputs and hands the parent FormData, so the parent
//never deals with the submit event or this form's markup
export function AddressForm({
  error,
  isSubmitting,
  onSave,
  onCancel,
}) {
  const fieldErrors = error?.fields ?? {};

  function handleSubmit(event) {
    event.preventDefault();
    onSave(new FormData(event.currentTarget));
  }

  return (
    <form className="address-form" onSubmit={handleSubmit}>
      <h3 className="address-view-title">Add a new address</h3>

      {error?.message && (
        <p className="address-form-error" role="alert">{error.message}</p>
      )}

      <div className="address-form-grid">
        <AddressField
          id="address-recipient-name" label="Full name" name="recipientName"
          autoComplete="name" maxLength={150} required autoFocus
          error={fieldErrors.recipientName}
        />
        <AddressField
          id="address-phone-number" label="Phone number" name="phoneNumber"
          type="tel" autoComplete="tel" maxLength={20} placeholder="+91 98765 43210"
          hint="Include your country code." required
          error={fieldErrors.phoneNumber}
        />
        <AddressField
          id="address-line1" label="Address line 1" name="line1" wide
          autoComplete="address-line1" maxLength={200}
          placeholder="Flat or house no., building, street" required
          error={fieldErrors.line1}
        />
        <AddressField
          id="address-line2" label="Address line 2" name="line2" wide optional
          autoComplete="address-line2" maxLength={200} placeholder="Area, locality or landmark"
          error={fieldErrors.line2}
        />
        <AddressField
          id="address-city" label="City" name="city"
          autoComplete="address-level2" maxLength={100} required
          error={fieldErrors.city}
        />
        <AddressField
          id="address-state" label="State" name="state"
          autoComplete="address-level1" maxLength={100} required
          error={fieldErrors.state}
        />
        <AddressField
          id="address-postal-code" label="PIN code" name="postalCode"
          autoComplete="postal-code" inputMode="numeric" maxLength={20} required
          error={fieldErrors.postalCode}
        />
        <div className="address-form-field">
          <label htmlFor="address-country">Country</label>
          <select
            id="address-country" name="countryCode" autoComplete="country" defaultValue="IN"
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
          {LABEL_OPTIONS.map((option) => (
            <label key={option} className="address-label-chip">
              <input type="radio" name="label" value={option} defaultChecked={option === 'Home'} />
              <span>{option}</span>
            </label>
          ))}
        </div>
        {fieldErrors.label && (
          <p id="address-label-error" className="address-field-error">{fieldErrors.label}</p>
        )}
      </fieldset>

      <label className="address-default-checkbox">
        <input type="checkbox" name="isDefault" />
        Make this my default address
      </label>

      <div className="address-actions">
        <button type="submit" className="button-primary address-action" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save address'}
        </button>
        <button type="button" className="button-secondary address-action" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
