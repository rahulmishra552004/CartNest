"""Select scenarios by class name; see LOAD_TESTING.md."""
import json
import logging
import math
from pathlib import Path
import random

from gevent.queue import Queue, Empty
from locust import HttpUser, between, events, task
from locust.exception import StopUser

DATA_PATH = Path(__file__).resolve().parent / 'loadtest_data.json'
DATA = {}
ACCOUNTS = Queue()


def choose_product():
    """Favor the middle of the saved product list with Gaussian weights."""
    products = DATA['product_ids']
    center = (len(products) - 1) / 2
    spread = max(len(products) / 6, 1)
    weights = [
        math.exp(-0.5 * ((index - center) / spread) ** 2)
        for index in range(len(products))
    ]
    return random.choices(products, weights=weights, k=1)[0]


@events.test_start.add_listener
def refill_accounts(environment, **kwargs):
    global DATA, ACCOUNTS
    DATA = json.loads(DATA_PATH.read_text(encoding='utf-8'))
    ACCOUNTS = Queue()
    for account in DATA['accounts']:
        ACCOUNTS.put(account)


class IsolatedUser(HttpUser):
    abstract = True
    wait_time = between(1, 3)

    def request(self, method, path, expected=200, require_isolation=False, **kwargs):
        failure = None
        with self.client.request(method, path, timeout=10, catch_response=True, **kwargs) as response:
            if response.status_code != expected:
                failure = f'Expected {expected}, got {response.status_code}'
            elif require_isolation and response.headers.get('X-Loadtest-Database') != 'isolated':
                failure = (
                    'Missing load-test isolation marker. Restart Django with '
                    '--settings=config.loadtest_postgres (or config.loadtest for SQLite).'
                )
            if failure:
                response.failure(failure)
        if failure:
            logging.error('%s %s: %s', method, path, failure)
            raise StopUser()
        return response

    def on_start(self):
        response = self.request('GET', '/api/auth/csrf/', require_isolation=True)
        self.client.headers['X-CSRFToken'] = response.json()['csrfToken']


class CatalogUser(IsolatedUser):
    weight = 5

    @task(5)
    def browse_product(self):
        self.request('GET', '/api/products/', name='Catalog')

    @task(2)
    def search_product(self):
        self.request('GET', '/api/products/', params={'search': 'shirt'}, name='Product search')

    @task(1)
    def product_detail(self):
        product_id = choose_product()
        self.request('GET', f'/api/products/{product_id}/', name='/api/products/[id]/')

    @task(1)
    def view_delivery_options(self):
        self.request('GET', '/api/delivery-options/', params={'expand': 'estimatedDeliveryTime'})


class AuthenticatedUser(IsolatedUser):
    abstract = True

    def on_start(self):
        super().on_start()
        try:
            self.account = ACCOUNTS.get_nowait()
        except Empty:
            logging.error('No unused accounts; prepare more users or reduce the user count.')
            raise StopUser()
        self.product_id = choose_product()
        self.login()

    def login(self):
        response = self.request('POST', '/api/auth/login/', json=self.account)
        self.client.headers['X-CSRFToken'] = response.json()['csrfToken']

    def add_item(self):
        self.request('POST', '/api/cart-items/', json={
            'productId': self.product_id, 'quantity': 1,
            'deliveryOptionId': DATA['delivery_option_id'],
        })


class CustomerUser(AuthenticatedUser):
    weight = 3

    @task(3)
    def cart(self):
        self.request('GET', '/api/cart-items/', params={'expand': 'product'})

    @task(2)
    def payment_summary(self):
        self.request('GET', '/api/payment-summary/')

    @task(1)
    def orders(self):
        orders = self.request('GET', '/api/orders/', params={'expand': 'products'}).json()
        if orders:
            order_id = random.choice(orders)['id']
            self.request('GET', f'/api/orders/{order_id}/', name='/api/orders/[id]/')

    @task(1)
    def profile(self):
        self.request('GET', '/api/auth/me/')


class CartUser(AuthenticatedUser):
    weight = 1

    @task
    def cart_lifecycle(self):
        self.add_item()
        path = f'/api/cart-items/{self.product_id}/'
        name = '/api/cart-items/[productId]/'
        self.request('GET', path, name=name)
        self.request('PATCH', path, name=name, json={'quantity': 2})
        self.request('PUT', path, name=name, json={'quantity': 1})
        self.request('GET', '/api/payment-summary/')
        self.request('DELETE', path, expected=204, name=name)


class CheckoutUser(AuthenticatedUser):
    weight = 1

    @task
    def checkout(self):
        self.add_item()
        self.request('GET', '/api/payment-summary/')
        order_id = self.request('POST', '/api/orders/', expected=201, json={}).json()['id']
        self.request('GET', f'/api/orders/{order_id}/', name='/api/orders/[id]/')
        self.request('GET', '/api/cart-items/')


class AuthSessionUser(AuthenticatedUser):
    """Explicitly select this scenario to measure repeated login/logout."""
    weight = 1

    @task
    def session_cycle(self):
        self.request('GET', '/api/auth/me/')
        self.request('POST', '/api/auth/logout/', json={})
        token = self.request('GET', '/api/auth/csrf/').json()['csrfToken']
        self.client.headers['X-CSRFToken'] = token
        self.login()
