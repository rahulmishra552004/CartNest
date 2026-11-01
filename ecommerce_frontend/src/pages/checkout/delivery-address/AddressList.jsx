import { AddressDetails } from './AddressDetails.jsx';
import { AddAddressButton } from './AddAddressButton.jsx';
import { useState } from 'react';

export function AddressList({
  addresses,
  selectedAddressId,
  onAddAddress,
  onUseThisAddress,
  onCancel,
}) {
  const [draftId, setDraftId] = useState(selectedAddressId);

  return (
    <div className="address-list-view">
      <fieldset className="address-list">
        <legend className="address-view-title">Choose a delivery address</legend>
        {addresses.map((address) => (
          <label key={address.id} className="address-option">
            <input
              type="radio"
              name="delivery-address"
              value={address.id}
              checked={address.id === draftId}
              onChange={() => setDraftId(address.id)}
            />
            <AddressDetails address={address} />
          </label>
        ))}
      </fieldset>

      <div className="address-list-add">
        <AddAddressButton onClick={onAddAddress} />
      </div>

      <div className="address-actions">
        <button
          type="button"
          className="button-primary address-action"
          onClick={() => onUseThisAddress(draftId)}
          disabled={!draftId}
        >
          Use this address
        </button>
        <button type="button" className="button-secondary address-action" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
