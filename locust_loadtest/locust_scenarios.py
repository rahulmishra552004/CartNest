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
    """Measure shared-IP admission and rejection, respecting Retry-After.

    Guests share one bucket per IP: a burst of 20, then 20 per minute. At one search
    every 20-25 s per user, a single generator starts seeing 429s from about eight users.
    """
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
                    storefront.check(storefront.is_page(response.json()), 'Expected a page of search results')
                except ValueError as exc:
                    response.failure(str(exc))
            else:
                response.failure(f'Unexpected search status {response.status_code}')
        if retry_after > 0 and math.isfinite(retry_after):
            sleep(retry_after)


class AuthSearchUser(storefront.AuthenticatedUser):
    """Successful search capacity under the account limit (a burst of 30, then 30 per minute).

    One search every 2.5-3.5 s averages 20 per minute per account, safely under the refill.
    """
    wait_time = between(2.5, 3.5)

    @task
    @storefront.flow
    def search(self):
        self.request('GET', '/api/products/', params={'search': 'shirt'}, name='Signed-in search',
                     validate=lambda data: storefront.check(storefront.is_page(data), 'Expected a page of results'))


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
