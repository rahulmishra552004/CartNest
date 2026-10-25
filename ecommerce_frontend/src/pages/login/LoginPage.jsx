import { useState } from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';
import './LoginPage.css';
import { BrandLogo } from '../../components/BrandLogo.jsx';

export function LoginPage({ onLogin }){
	const navigate = useNavigate();

	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async(event) => {
		event.preventDefault();

		setError('');
		setIsSubmitting(true);

		try {
			await axios.get('/api/auth/csrf/');
			const response = await axios.post('/api/auth/login/', {
				username,
				password,
			});

			onLogin(response.data.user);
			navigate('/', { replace : true });
		} catch (requestError) {
			setError(
				requestError.response?.data?.detail
				?? 'Unable to login, please try again.'
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
	      <main className="login-page">
		<title>Sign in | CartNest</title>
		<form className="login-card" onSubmit={handleSubmit}>
			  <BrandLogo className="login-logo" />

		  <h1>Sign in</h1>

		  {error && (
		    <div className="login-error" role="alert">
		      {error}
		    </div>
		  )}

		  <label htmlFor="username">Username</label>

		  <input
		    id="username"
		    type="text"
		    autoComplete="username"
		    value={username}
		    onChange={(event) => setUsername(event.target.value)}
		    required
		  />

		  <label htmlFor="password">Password</label>

		  <input
		    id="password"
		    type="password"
		    autoComplete="current-password"
		    value={password}
		    onChange={(event) => setPassword(event.target.value)}
		    required
		  />

		  <button
		    className="button-primary login-button"
		    type="submit"
		    disabled={isSubmitting}
		  >
		    {isSubmitting ? 'Signing in...' : 'Sign in'}
		  </button>
		</form>
	      </main>
	    );
	  }
