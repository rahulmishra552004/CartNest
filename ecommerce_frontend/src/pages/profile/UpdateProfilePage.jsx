import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import axios from 'axios';
import { AccountSettingsLayout } from './AccountSettingsLayout.jsx';
import { accountError, errorMessage } from './accountErrors.js';

export function UpdateProfilePage({ cart, user, onUserUpdated, onSessionExpired }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email || '');
  const [storeName, setStoreName] = useState(user.store_name || '');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    setError('');
    setFieldErrors({});
    setIsSubmitting(true);
    const updates = { username: username.trim(), email: email.trim() };
    if (user.role === 'vendor') updates.store_name = storeName.trim();

    try {
      await axios.get('/api/auth/csrf/');
      const endpoint = user.role === 'vendor' ? 'register_vendor' : 'register_customer';
      const response = await axios.patch(`/api/auth/${endpoint}/`, updates);
      onUserUpdated(response.data.user || { ...user, ...updates });
      navigate('/profile', { replace: true, state: { profileMessage: 'Your profile has been updated.' } });
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        onSessionExpired();
        return;
      }
      const data = requestError.response?.data;
      setFieldErrors({
        username: errorMessage(data?.username) || errorMessage(data?.user?.username),
        email: errorMessage(data?.email) || errorMessage(data?.user?.email),
        store_name: errorMessage(data?.vendor?.store_name),
      });
      setError(accountError(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AccountSettingsLayout cart={cart} user={user} title="Update profile" description="Keep your account details up to date.">
      <form className="profile-card account-settings-card" onSubmit={handleSubmit} aria-busy={isSubmitting} aria-labelledby="update-profile-title">
        <div className="account-settings-card-heading">
          <h2 id="update-profile-title">Account details</h2>
          <span className="profile-role">{user.role === 'vendor' ? 'Vendor' : 'Customer'}</span>
        </div>
        <p className="profile-section-description">{user.role === 'vendor' ? 'Update your account details and store name.' : 'Update the name and email associated with your account.'}</p>
        {error && <div className="account-form-error" role="alert">{error}</div>}
        <fieldset className="account-form-fields" disabled={isSubmitting}>
          <legend className="account-visually-hidden">Edit account details</legend>
          <div className="account-form-field">
            <label htmlFor="profile-username">Username</label>
            <input id="profile-username" name="username" type="text" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} maxLength={150} required aria-invalid={Boolean(fieldErrors.username)} aria-describedby={fieldErrors.username ? 'profile-username-error' : undefined} />
            {fieldErrors.username && <p className="account-field-error" id="profile-username-error">{fieldErrors.username}</p>}
          </div>
          <div className="account-form-field">
            <label htmlFor="profile-email">Email address</label>
            <input id="profile-email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'profile-email-error' : undefined} />
            {fieldErrors.email && <p className="account-field-error" id="profile-email-error">{fieldErrors.email}</p>}
          </div>
          {user.role === 'vendor' && (
            <div className="account-form-field">
              <label htmlFor="profile-store-name">Store name</label>
              <input
                id="profile-store-name"
                name="store_name"
                type="text"
                autoComplete="organization"
                value={storeName}
                onChange={(event) => setStoreName(event.target.value)}
                maxLength={100}
                required
                aria-invalid={Boolean(fieldErrors.store_name)}
                aria-describedby={fieldErrors.store_name ? 'profile-store-name-error' : undefined}
              />
              {fieldErrors.store_name && <p className="account-field-error" id="profile-store-name-error">{fieldErrors.store_name}</p>}
            </div>
          )}
          <div className="account-form-actions">
            <button className="button-primary account-action" type="submit">{isSubmitting ? 'Saving changes…' : 'Save changes'}</button>
            <Link className="profile-contact-link" to="/profile">Cancel</Link>
          </div>
        </fieldset>
      </form>
      {user.role === 'customer' && (
        <section className="account-vendor-invitation" aria-labelledby="vendor-invitation-title">
          <div>
            <h2 id="vendor-invitation-title">Bring your store to CartNest</h2>
            <p>Register as a vendor using your existing account.</p>
          </div>
          <Link className="account-vendor-link" to="/profile/register-vendor">Register as a vendor <span aria-hidden="true">→</span></Link>
        </section>
      )}
    </AccountSettingsLayout>
  );
}
