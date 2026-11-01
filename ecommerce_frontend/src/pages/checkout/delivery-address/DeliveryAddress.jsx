import './DeliveryAddress.css';
import { PrimaryAddress } from './PrimaryAddress.jsx';
import { AddressList } from './AddressList.jsx';
import { AddressForm } from './AddressForm.jsx';
import { useState, useEffect } from 'react';
import axios from 'axios';

//shown after "We couldn't load your addresses", so it doesn't repeat that
const LOAD_ERROR_MESSAGE = 'Something went wrong. Please try again.';
const SAVE_ERROR_MESSAGE = "We couldn't save this address. Please try again.";

//turns a failed request into one sentence the user can act on
function getRequestErrorMessage(requestError, fallbackMessage) {
  if (!axios.isAxiosError(requestError)) {
    return fallbackMessage;
  }

  if (!requestError.response) {
    return "We couldn't reach the server. Check your connection and try again.";
  }

  //e.g. the 10 address limit, or "Authentication credentials were not provided."
  const detail = requestError.response.data?.detail;
  if (typeof detail === 'string' && detail) {
    return detail;
  }

  return fallbackMessage;
}

//a 400 from /api/addresses/ maps field names (the same as the form's input names)
//to lists of messages, e.g. { phoneNumber: ['enter phone number with country code'] }
function getFormError(requestError) {
  const response = axios.isAxiosError(requestError) ? requestError.response : undefined;
  const data = response?.data;
  const fields = {};

  if (response?.status === 400 && data && typeof data === 'object' && !Array.isArray(data)) {
    for (const [name, messages] of Object.entries(data)) {
      if (name !== 'detail') {
        fields[name] = Array.isArray(messages) ? messages[0] : String(messages);
      }
    }
  }

  const message = Object.keys(fields).length > 0
    ? 'Please fix the highlighted fields.'
    : getRequestErrorMessage(requestError, SAVE_ERROR_MESSAGE);

  return { message, fields };
}

//keeps the current selection if that address still exists, otherwise picks the default.
//the selection lives in CheckoutPage, so it survives this section being unmounted and loaded again
function resolveSelectedAddressId(currentId, addressList) {
  if (addressList.some((address) => address.id === currentId)) {
    return currentId;
  }
  return addressList.find((address) => address.isDefault)?.id;
}

export function DeliveryAddress({
  selectedAddressId,
  setSelectedAddressId,
}) {
  const [addresses, setAddresses] = useState([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [view, setView] = useState('primary');
  const [formReturnView, setFormReturnView] = useState('primary');
  const [formError, setFormError] = useState();
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  useEffect(() => {
    const initialFetch = async () => {
      const data = await fetchAddresses();
      if (data) {
        setSelectedAddressId((currentId) => resolveSelectedAddressId(currentId, data));
      }
      setIsLoadingAddresses(false);
    };
    initialFetch();
    //setSelectedAddressId is CheckoutPage's useState setter, which never changes, so this still runs once per mount
  }, [setSelectedAddressId]);

  const fetchAddresses = async () => {
    try {
      const response = await axios.get('/api/addresses/');
      setAddresses(response.data);
      setLoadError('');
      return response.data;
    } catch (requestError) {
      setLoadError(getRequestErrorMessage(requestError, LOAD_ERROR_MESSAGE));
    }
  };

  function getSelectedAddress() {
    return addresses.find((address) => address.id === selectedAddressId);
  }

  //keeps the current selection, e.g. the address that was just saved
  async function handleRetryLoad() {
    setIsLoadingAddresses(true);
    const data = await fetchAddresses();
    if (data) {
      setSelectedAddressId((currentId) => resolveSelectedAddressId(currentId, data));
    }
    setIsLoadingAddresses(false);
  }

  //with nothing loaded, the primary view shows the error in place of the address card;
  //otherwise it goes in a banner above whatever is on screen
  const isLoadErrorInPrimaryView = view === 'primary' && addresses.length === 0;

  function handleSelectAnotherAddress() {
    setView('list');
  }

  //the form only opens from the primary view or the list, and Cancel goes back to whichever it was
  function handleAddAddress() {
    setFormReturnView(view);
    setFormError(undefined);
    setView('form');
  }

  async function handleSaveAddress(formData) {
    setIsFormSubmitting(true);
    setFormError(undefined);

    try {
      const postResponse = await axios.post('/api/addresses/', formData);
      const postedAddressId = postResponse.data.id;
      await fetchAddresses();
      setSelectedAddressId(postedAddressId);
      setView('list');
    } catch (requestError) {
      setFormError(getFormError(requestError));
    } finally {
      setIsFormSubmitting(false);
    }
  }

  function handleFormCancel() {
    setView(formReturnView);
  }

  function handleListCancel() {
    setView('primary');
  }

  function handleUseThisAddress(addressId) {
    setSelectedAddressId(addressId);
    setView('primary');
  }

  return (
    <section className="checkout-section delivery-address" aria-labelledby="delivery-address-title">
      <div className="checkout-section-heading">
        <h2 id="delivery-address-title">Delivery address</h2>
      </div>

      <div className="checkout-section-body">
        {loadError && !isLoadErrorInPrimaryView && (
          <div className="address-alert" role="alert">
            <p><strong>We couldn't load your addresses.</strong> {loadError}</p>
            <button
              type="button"
              className="address-alert-retry"
              onClick={handleRetryLoad}
              disabled={isLoadingAddresses}
            >
              Try again
            </button>
          </div>
        )}

        {view === 'primary' && (
          <PrimaryAddress
            address={getSelectedAddress()}
            hasSavedAddresses={addresses.length > 0}
            isLoading={isLoadingAddresses}
            loadError={isLoadErrorInPrimaryView ? loadError : ''}
            onRetry={handleRetryLoad}
            onSelectAnotherAddress={handleSelectAnotherAddress}
            onAddAddress={handleAddAddress}
          />
        )}

        {view === 'list' && (
          <AddressList
            addresses={addresses}
            selectedAddressId={selectedAddressId}
            onAddAddress={handleAddAddress}
            onUseThisAddress={handleUseThisAddress}
            onCancel={handleListCancel}
          />
        )}

        {view === 'form' && (
          <AddressForm
            error={formError}
            isSubmitting={isFormSubmitting}
            onSave={handleSaveAddress}
            onCancel={handleFormCancel}
          />
        )}
      </div>
    </section>
  );
}
