"""Explicit scenarios: select class names; see LOAD_TESTING.md."""
import math

from gevent import sleep
from locust import between, task

# Import the module, not its concrete user classes, so discovery stays explicit.
import locustfile as storefront


class CheckoutReplayUser(storefront.CheckoutUser):
    """New order followed by a same-key replay and body validation."""
    replay = True


class GuestSearchUser(storefront.IsolatedUser):
    """Measure shared-IP admission and rejection, respecting Retry-After."""
    wait_time = between(20, 25)

    @task
    @storefront.flow
    def search(self):
        retry_after = 0
        with self.client.get('/api/products/', params={'search': 'shirt'}, headers=self.headers,
                             catch_response=True, name='Search: accepted') as response:
            if response.status_code == 429:
                response.request_meta['name'] = 'Search: throttled (429)'
                try:
                    retry_after = float(response.headers['Retry-After'])
                    storefront.check(math.isfinite(retry_after) and retry_after > 0,
                                     'Invalid Retry-After')
                    response.success()
                except (ValueError, KeyError) as exc:
                    response.failure(str(exc))
            elif response.status_code == 200:
                try:
                    storefront.check(isinstance(response.json(), list), 'Expected search result list')
                except ValueError as exc:
                    response.failure(str(exc))
            else:
                response.failure(f'Unexpected search status {response.status_code}')
        if retry_after > 0 and math.isfinite(retry_after):
            sleep(retry_after)


class AuthSearchUser(storefront.AuthenticatedUser):
    """Successful search capacity under the five-per-minute account limit."""
    wait_time = between(13, 17)

    @task
    @storefront.flow
    def search(self):
        self.request('GET', '/api/products/', params={'search': 'shirt'}, name='Signed-in search',
                     validate=lambda data: storefront.check(isinstance(data, list), 'Expected result list'))


class AuthSessionUser(storefront.AuthenticatedUser):
    """Repeated session creation, separate from the default storefront mix."""
    logged_in = True

    @task
    @storefront.flow
    def session_cycle(self):
        if self.logged_in:
            # Logout may have completed even if its response was lost.
            self.logged_in = False
            self.request('GET', '/api/auth/me/')
            self.request('POST', '/api/auth/logout/', json={})
        token = self.request('GET', '/api/auth/csrf/').json()['csrfToken']
        self.headers['X-CSRFToken'] = token
        self.login()
        self.logged_in = True
