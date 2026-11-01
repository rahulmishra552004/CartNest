import { Link } from 'react-router';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { CustomerHeader } from '../../header/CustomerHeader.jsx';
import { EmptyState } from '../../../components/EmptyState.jsx';
import { getRequestErrorMessage } from '../../../utils/addressErrors.js';
import { SavedAddressRow } from './SavedAddressRow.jsx';
import { AddressFormPanel } from './AddressFormPanel.jsx';
import '../ProfilePage.css';
import './ManageAddresses.css';

const MAX_ADDRESSES = 10;
const LOAD_ERROR_MESSAGE = 'Something went wrong. Please try again.';

function AddAddressButton({ onAddAddress }) {
  return (
    <button type="button" className="button-primary saved-addresses-add" onClick={onAddAddress}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
      Add new address
    </button>
  );
}

export function ManageAddressesPage({ cart, user }) {
  const [addresses, setAddresses] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [view, setView] = useState('list');
  const [editingAddress, setEditingAddress] = useState(null);

  useEffect(() => {
    loadAddresses();
  }, []);

  async function loadAddresses() {
    try {
      const response = await axios.get('/api/addresses/');
      setAddresses(response.data);
      setLoadError('');
    } catch (requestError) {
      setLoadError(getRequestErrorMessage(requestError, LOAD_ERROR_MESSAGE));
    }
  }

  function handleRetry() {
    setLoadError('');
    loadAddresses();
  }

  async function handleAddressSave() {
    setView('list');
    await loadAddresses();
  }

  function handleEdit(address) {
    setEditingAddress(address);
    setView('form');
  }

  function handleAddAddress() {
    setEditingAddress(null);
    setView('form');
  }

  function handleCancel() {
    setView('list');
  }

  function renderContent() {
    if (addresses === null) {
      return loadError ? (
        <EmptyState
          icon="address"
          title="We couldn't load your addresses"
          description={loadError}
          role="alert"
          primaryAction={{ label: 'Try again', onClick: handleRetry }}
        />
      ) : (
        <p className="saved-addresses-loading" role="status">Loading your addresses…</p>
      );
    }

    if (view === 'form') {
      return (
        <AddressFormPanel
          key={editingAddress?.id ?? 'new'}
          address={editingAddress}
          onAddressSave={handleAddressSave}
          onCancel={handleCancel}
        />
      );
    }

    return (
      <>
        {loadError && (
          <div className="saved-addresses-alert" role="alert">
            <p><strong>We couldn't refresh your addresses.</strong> {loadError}</p>
            <button type="button" className="saved-addresses-retry" onClick={handleRetry}>
              Try again
            </button>
          </div>
        )}

        {addresses.length === 0 ? (
          <EmptyState
            icon="address"
            eyebrow="No saved addresses"
            title="Add your first address"
            description="Save a delivery address once and pick it at checkout every time."
            primaryAction={{ label: 'Add new address', onClick: handleAddAddress }}
          />
        ) : (
          <section aria-labelledby="saved-addresses-title">
            <div className="saved-addresses-toolbar">
              <div>
                <h2 id="saved-addresses-title" className="saved-addresses-title">Saved addresses</h2>
                <p className="saved-addresses-count">
                  <strong>{addresses.length}</strong> of {MAX_ADDRESSES} saved
                </p>
              </div>
              <AddAddressButton onAddAddress={handleAddAddress} />
            </div>

            <ul className="saved-addresses-list">
              {addresses.map((address) => (
                <SavedAddressRow
                  key={address.id}
                  address={address}
                  loadAddresses={loadAddresses}
                  onEdit={handleEdit}
                />
              ))}
            </ul>
          </section>
        )}
      </>
    );
  }

  return (
    <>
      <title>Manage addresses | CartNest</title>
      <CustomerHeader cart={cart} user={user} />

      <main className="profile-page">
        <div className="profile-content">
          <nav className="profile-breadcrumb" aria-label="Breadcrumb">
            <Link to="/profile">My profile</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Manage addresses</span>
          </nav>

          <div className="profile-heading">
            <h1>Manage addresses</h1>
            <p>
              Save the places you ship to. Your default address is selected for you at checkout.
            </p>
          </div>

          {renderContent()}
        </div>
      </main>
    </>
  );
}
