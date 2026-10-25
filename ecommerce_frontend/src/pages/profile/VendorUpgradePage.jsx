import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import axios from 'axios';
import { AccountSettingsLayout } from './AccountSettingsLayout.jsx';
import { accountError, errorMessage } from './accountErrors.js';

export function VendorUpgradePage({ cart, user, onUserUpdated, onSessionExpired }) {
  const navigate = useNavigate();
  const [storeName, setStoreName] = useState('');
  const [error, setError] = useState('');
  const [storeError, setStoreError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    setError('');
    setStoreError('');
    setIsSubmitting(true);
    try {
      await axios.get('/api/auth/csrf/');
      const response = await axios.patch('/api/auth/register_vendor/', { store_name: storeName.trim() });
      onUserUpdated(response.data.user || { ...user, role: 'vendor', store_name: storeName.trim() });
      navigate('/profile', { replace: true, state: { profileMessage: 'You’re registered as a vendor. Welcome to selling on CartNest!' } });
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        onSessionExpired();
        return;
      }
      setStoreError(errorMessage(requestError.response?.data?.vendor?.store_name));
      setError(accountError(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AccountSettingsLayout cart={cart} user={user} title="Register as a vendor" description="Give your store a home on CartNest.">
      <form className="profile-card account-settings-card" onSubmit={handleSubmit} aria-busy={isSubmitting} aria-labelledby="upgrade-vendor-title">
        <h2 id="upgrade-vendor-title">Let’s set up your store</h2>
        <p className="profile-section-description">Your existing account will become a vendor account. Keep the same username, email, password, and order history.</p>
        <div className="account-current-user"><strong>{user.username}</strong><span>{user.email || 'Your existing CartNest account'}</span></div>
        {error && <div className="account-form-error" role="alert">{error}</div>}
        <fieldset className="account-form-fields" disabled={isSubmitting}>
          <legend className="account-visually-hidden">Your store details</legend>
          <div className="account-form-field">
            <label htmlFor="upgrade-store-name">Store name</label>
            <input id="upgrade-store-name" name="store_name" type="text" autoComplete="organization" value={storeName} onChange={(event) => setStoreName(event.target.value)} placeholder="Enter your store name" maxLength={100} required aria-invalid={Boolean(storeError)} aria-describedby={storeError ? 'upgrade-store-error' : undefined} />
            {storeError && <p className="account-field-error" id="upgrade-store-error">{storeError}</p>}
          </div>
          <div className="account-form-actions">
            <button className="button-primary account-action" type="submit">{isSubmitting ? 'Registering your store…' : 'Register as a vendor'}</button>
            <Link className="profile-contact-link" to="/profile/edit">Cancel</Link>
          </div>
        </fieldset>
      </form>
    </AccountSettingsLayout>
  );
}
