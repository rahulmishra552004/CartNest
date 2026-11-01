import { AddressDetails } from './AddressDetails.jsx';
import { AddAddressButton } from './AddAddressButton.jsx';

function MapPinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5h.01" />
    </svg>
  );
}

//the box shown in place of the address card when there is no address to show
function AddressNotice({ icon, title, text, isError = false, role, children }) {
  return (
    <div className={`primary-address-notice${isError ? ' primary-address-notice-error' : ''}`} role={role}>
      <span className="primary-address-notice-icon" aria-hidden="true">{icon}</span>
      <div className="primary-address-notice-copy">
        <p className="primary-address-notice-title">{title}</p>
        {text && <p className="primary-address-notice-text">{text}</p>}
        {children}
      </div>
    </div>
  );
}

//exactly one of these shows, checked in this order
function PrimaryAddressContent({ address, hasSavedAddresses, isLoading, loadError, onRetry }) {
  if (address) {
    return (
      <div className="primary-address-card">
        <span className="primary-address-check" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        </span>
        <div className="primary-address-copy">
          <p className="primary-address-status">Delivering to</p>
          <AddressDetails address={address} />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <AddressNotice
        icon={<span className="primary-address-spinner" />}
        title="Loading your saved addresses…"
        role="status"
      />
    );
  }

  if (loadError) {
    return (
      <AddressNotice
        icon={<AlertIcon />}
        title="We couldn't load your addresses"
        text={loadError}
        isError
        role="alert"
      >
        <button type="button" className="address-alert-retry" onClick={onRetry}>
          Try again
        </button>
      </AddressNotice>
    );
  }

  //e.g. none of the saved addresses is marked as the default
  if (hasSavedAddresses) {
    return (
      <AddressNotice
        icon={<MapPinIcon />}
        title="Choose a delivery address"
        text="Pick one of your saved addresses for this order."
      />
    );
  }

  return (
    <AddressNotice
      icon={<MapPinIcon />}
      title="You have no saved addresses"
      text="Add a delivery address to choose where your order goes."
    />
  );
}

export function PrimaryAddress({
  address,
  hasSavedAddresses,
  isLoading,
  loadError,
  onRetry,
  onSelectAnotherAddress,
  onAddAddress,
}) {
  return (
    <div className="primary-address">
      <PrimaryAddressContent
        address={address}
        hasSavedAddresses={hasSavedAddresses}
        isLoading={isLoading}
        loadError={loadError}
        onRetry={onRetry}
      />

      <div className="primary-address-actions">
        <button
          type="button"
          className="address-link-button"
          onClick={onSelectAnotherAddress}
          disabled={!hasSavedAddresses}
        >
          {address ? 'Select another address' : 'Choose an address'}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
        <AddAddressButton onClick={onAddAddress} />
      </div>
    </div>
  );
}
