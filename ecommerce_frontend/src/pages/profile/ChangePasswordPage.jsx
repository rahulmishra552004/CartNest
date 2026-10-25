import { useState } from 'react';
import { Link } from 'react-router';
import axios from 'axios';
import { AccountSettingsLayout } from './AccountSettingsLayout.jsx';
import { accountError } from './accountErrors.js';

export function ChangePasswordPage({ cart, user, onSessionExpired }) {
  const [passwords, setPasswords] = useState({ password: '', new_password: '', confirm_password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setPasswords((current) => ({ ...current, [name]: value }));
    setSuccess(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    setError('');
    setSuccess(false);
    if (passwords.new_password !== passwords.confirm_password) {
      setError('The new passwords do not match. Please enter them again.');
      return;
    }
    setIsSubmitting(true);
    try {
      await axios.get('/api/auth/csrf/');
      await axios.post('/api/auth/change_password/', {
        password: passwords.password,
        new_password: passwords.new_password,
      });
      setPasswords({ password: '', new_password: '', confirm_password: '' });
      setSuccess(true);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        onSessionExpired();
        return;
      }
      setError(accountError(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  const fields = [
    { name: 'password', label: 'Current password', autoComplete: 'current-password' },
    { name: 'new_password', label: 'New password', autoComplete: 'new-password', minLength: 8 },
    { name: 'confirm_password', label: 'Confirm new password', autoComplete: 'new-password', minLength: 8 },
  ];

  return (
    <AccountSettingsLayout cart={cart} user={user} title="Change password" description="Choose a strong password to keep your account secure.">
      <form className="profile-card account-settings-card" onSubmit={handleSubmit} aria-busy={isSubmitting} aria-labelledby="change-password-title">
        <h2 id="change-password-title">Password &amp; security</h2>
        <p className="profile-section-description">Enter your current password to choose a new one.</p>
        {error && <div className="account-form-error" role="alert">{error}</div>}
        {success && <div className="account-form-success" role="status">Your password has been updated. You’re still signed in on this device.</div>}
        <fieldset className="account-form-fields" disabled={isSubmitting}>
          <legend className="account-visually-hidden">Change your password</legend>
          {fields.map((field) => (
            <div className="account-form-field" key={field.name}>
              <label htmlFor={`change-${field.name}`}>{field.label}</label>
              <input id={`change-${field.name}`} name={field.name} type="password" autoComplete={field.autoComplete} value={passwords[field.name]} onChange={handleChange} minLength={field.minLength} required aria-describedby={field.name === 'new_password' ? 'new-password-hint' : undefined} />
              {field.name === 'new_password' && <p className="account-form-hint" id="new-password-hint">Use at least 8 characters. Avoid common passwords and passwords similar to your account details.</p>}
            </div>
          ))}
          <div className="account-form-actions">
            <button className="button-primary account-action" type="submit">{isSubmitting ? 'Updating password…' : 'Update password'}</button>
            <Link className="profile-contact-link" to="/profile">Back to profile</Link>
          </div>
        </fieldset>
      </form>
    </AccountSettingsLayout>
  );
}
