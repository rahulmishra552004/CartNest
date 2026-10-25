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

export function CustomerRegistrationPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
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
      await axios.post('/api/auth/register_customer/', {
        username: username.trim(),
        password,
        email: email.trim(),
        role: 'customer',
      });
      setSuccess(true);
      setPassword('');
    } catch (requestError) {
      const status = requestError.response?.status;
      const data = requestError.response?.data;

      if (status === 400 && data && typeof data === 'object') {
        const errors = {
          username: errorMessage(data.username),
          email: errorMessage(data.email),
          password: errorMessage(data.password),
        };
        setFieldErrors(errors);
        setError(
          errorMessage(data.non_field_errors)
          || errorMessage(data.detail)
          || (Object.values(errors).some(Boolean)
            ? 'Please check the highlighted fields.'
            : 'Unable to create your account. Please check your details.')
        );
      } else if (status === 403) {
        setError('Your security check failed. Refresh the page and try again.');
      } else if (status === 429) {
        setError('Too many attempts. Please wait a moment and try again.');
      } else if (!requestError.response) {
        setError('Unable to reach the server. Check your connection and try again.');
      } else {
        setError('Unable to create your account right now. Please try again later.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <main className="registration-page">
        <title>Account created | CartNest</title>
        <section className="registration-card registration-success" aria-labelledby="registration-title">
          <Link to="/" className="registration-brand" aria-label="CartNest home">
            <BrandLogo className="registration-logo" />
          </Link>
          <div className="registration-success-icon" aria-hidden="true">✓</div>
          <h1 id="registration-title">Your account is ready</h1>
          <p role="status">Account created successfully. Sign in to start shopping.</p>
          <Link className="button-primary registration-button" to="/login">Sign in</Link>
          <Link className="registration-link" to="/">Back to the store</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="registration-page">
      <title>Create account | CartNest</title>
      <form className="registration-card" onSubmit={handleSubmit} aria-labelledby="registration-title" aria-busy={isSubmitting}>
        <Link to="/" className="registration-brand" aria-label="CartNest home">
          <BrandLogo className="registration-logo" />
        </Link>
        <header className="registration-heading">
          <h1 id="registration-title">Create your account</h1>
          <p>Join us and find your next favorite.</p>
        </header>

        {error && <div className="registration-error" role="alert">{error}</div>}

        <fieldset className="registration-fields" disabled={isSubmitting}>
          <legend className="registration-visually-hidden">Account details</legend>
          <div className="registration-field">
            <label htmlFor="registration-username">Username</label>
            <input
              id="registration-username"
              name="username"
              onChange={(event) => setUsername(event.target.value)}
              value={username}
              placeholder="Choose a username"
              type="text"
              autoComplete="username"
              maxLength={150}
              required
              aria-invalid={Boolean(fieldErrors.username)}
              aria-describedby={fieldErrors.username ? 'registration-username-error' : undefined}
            />
            {fieldErrors.username && <p className="registration-field-error" id="registration-username-error">{fieldErrors.username}</p>}
          </div>
          <div className="registration-field">
            <label htmlFor="registration-email">Email address</label>
            <input
              id="registration-email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              value={email}
              placeholder="you@example.com"
              type="email"
              autoComplete="email"
              required
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'registration-email-error' : undefined}
            />
            {fieldErrors.email && <p className="registration-field-error" id="registration-email-error">{fieldErrors.email}</p>}
          </div>
          <div className="registration-field">
            <label htmlFor="registration-password">Password</label>
            <input
              id="registration-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              value={password}
              placeholder="Create a password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={`registration-password-hint${fieldErrors.password ? ' registration-password-error' : ''}`}
            />
            <p className="registration-hint" id="registration-password-hint">Use at least 8 characters. Avoid common or entirely numeric passwords.</p>
            {fieldErrors.password && <p className="registration-field-error" id="registration-password-error">{fieldErrors.password}</p>}
          </div>
          <button className="button-primary registration-button" type="submit">
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </fieldset>
        <div className="registration-footer">
          <p>Already have an account? <Link className="registration-link" to="/login">Sign in</Link></p>
          <p>Want to sell? <Link className="registration-link" to="/vendor_registration">Create a vendor account</Link></p>
        </div>
      </form>
    </main>
  );
}
