import './AddressDetails.css';

function getCountryName(countryCode) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(countryCode) || countryCode;
  } catch {
    return countryCode;
  }
}

export function AddressDetails({ address }) {
  const streetLine = [address.line1, address.line2].filter(Boolean).join(', ');
  const cityLine = [address.city, address.state].filter(Boolean).join(', ');

  return (
    <div className="address-details">
      <div className="address-details-recipient">
        <span className="address-details-name">{address.recipientName}</span>
        {address.label && <span className="address-tag">{address.label}</span>}
        {address.isDefault && <span className="address-tag address-tag-default">Default</span>}
      </div>

      <address className="address-details-lines">
        <span>{streetLine}</span>
        <span>
          {cityLine} {address.postalCode}, {getCountryName(address.countryCode)}
        </span>
      </address>

      {address.phoneNumber && (
        <span className="address-details-phone">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
          </svg>
          <span className="address-visually-hidden">Phone: </span>
          {address.phoneNumber}
        </span>
      )}
    </div>
  );
}
