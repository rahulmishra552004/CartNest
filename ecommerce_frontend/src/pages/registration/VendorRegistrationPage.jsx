import { Link } from 'react-router';
import { useState } from 'react';
import axios from 'axios';
import './CustomerRegistrationPage.css';
import { BrandLogo } from '../../components/BrandLogo.jsx';

function errorMessage(value) {
  if (Array.isArray(value)) {
    return value.filter((message) => typeof message === 'string').join(' ');
  }
  return typeof value === 'string' ? value : '';
}

export function VendorRegistrationPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    setError('');
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await axios.get('/api/auth/csrf/');
      await axios.post('/api/auth/register_vendor/', {
        username: username.trim(),
        email: email.trim(),
        password,
        store_name: storeName.trim(),
      });
      setSuccess(true);
      setPassword('');
    } catch (requestError) {
      const status = requestError.response?.status;
      const data = requestError.response?.data;

      if (status === 400 && data && typeof data === 'object') {
        const errors = {
          username: errorMessage(data.user?.username),
          email: errorMessage(data.user?.email),
          password: errorMessage(data.user?.password),
          store_name: errorMessage(data.vendor?.store_name),
        };
        setFieldErrors(errors);
        setError(
          errorMessage(data.user?.non_field_errors)
          || errorMessage(data.vendor?.non_field_errors)
          || errorMessage(data.non_field_errors)
          || (Object.values(errors).some(Boolean)
            ? 'Please check the highlighted fields.'
            : errorMessage(data.detail) || 'Unable to create your vendor account. Please check your details.')
        );
      } else if (status === 403) {
        setError('Your security check failed. Refresh the page and try again.');
      } else if (status === 429) {
        setError('Too many attempts. Please wait a moment and try again.');
      } else if (!requestError.response) {
        setError('Unable to reach the server. Check your connection and try again.');
      } else {
        setError('Unable to create your vendor account right now. Please try again later.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <main className="registration-page">
        <title>Vendor account created | CartNest</title>
        <section className="registration-card registration-success" aria-labelledby="vendor-registration-title">
          <Link to="/" className="registration-brand" aria-label="CartNest home">
            <BrandLogo className="registration-logo" />
          </Link>
          <div className="registration-success-icon" aria-hidden="true">✓</div>
          <h1 id="vendor-registration-title">Your vendor account is ready</h1>
          <p role="status">Your account for {storeName.trim()} was created successfully. You can now sign in.</p>
          <Link className="button-primary registration-button" to="/login">Sign in</Link>
          <Link className="registration-link" to="/">Back to the store</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="registration-page">
      <title>Create vendor account | CartNest</title>
      <form className="registration-card" onSubmit={handleSubmit} aria-labelledby="vendor-registration-title" aria-busy={isSubmitting}>
        <Link to="/" className="registration-brand" aria-label="CartNest home">
          <BrandLogo className="registration-logo" />
        </Link>
        <header className="registration-heading">
          <h1 id="vendor-registration-title">Create your vendor account</h1>
          <p>Bring your store to CartNest.</p>
        </header>

        {error && <div className="registration-error" role="alert">{error}</div>}

        <fieldset className="registration-fields" disabled={isSubmitting}>
          <legend className="registration-visually-hidden">Vendor account details</legend>
          <div className="registration-field">
            <label htmlFor="vendor-store-name">Store name</label>
            <input
              id="vendor-store-name"
              name="store_name"
              type="text"
              autoComplete="organization"
              value={storeName}
              onChange={(event) => setStoreName(event.target.value)}
              placeholder="Enter your store name"
              maxLength={100}
              required
              aria-invalid={Boolean(fieldErrors.store_name)}
              aria-describedby={fieldErrors.store_name ? 'vendor-store-name-error' : undefined}
            />
            {fieldErrors.store_name && <p className="registration-field-error" id="vendor-store-name-error">{fieldErrors.store_name}</p>}
          </div>
          <div className="registration-field">
            <label htmlFor="vendor-username">Username</label>
            <input
              id="vendor-username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Choose a username"
              maxLength={150}
              required
              aria-invalid={Boolean(fieldErrors.username)}
              aria-describedby={fieldErrors.username ? 'vendor-username-error' : undefined}
            />
            {fieldErrors.username && <p className="registration-field-error" id="vendor-username-error">{fieldErrors.username}</p>}
          </div>
          <div className="registration-field">
            <label htmlFor="vendor-email">Email address</label>
            <input
              id="vendor-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              maxLength={254}
              required
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'vendor-email-error' : undefined}
            />
            {fieldErrors.email && <p className="registration-field-error" id="vendor-email-error">{fieldErrors.email}</p>}
          </div>
          <div className="registration-field">
            <label htmlFor="vendor-password">Password</label>
            <input
              id="vendor-password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Create a password"
              minLength={8}
              required
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={`vendor-password-hint${fieldErrors.password ? ' vendor-password-error' : ''}`}
            />
            <p className="registration-hint" id="vendor-password-hint">Use at least 8 characters. Avoid common or entirely numeric passwords.</p>
            {fieldErrors.password && <p className="registration-field-error" id="vendor-password-error">{fieldErrors.password}</p>}
          </div>
          <button className="button-primary registration-button" type="submit">
            {isSubmitting ? 'Creating account…' : 'Create vendor account'}
          </button>
        </fieldset>
        <div className="registration-footer">
          <p>Already have an account? <Link className="registration-link" to="/login">Sign in</Link></p>
          <p>Here to shop? <Link className="registration-link" to="/customer_registration">Create a customer account</Link></p>
        </div>
      </form>
    </main>
  );
}
