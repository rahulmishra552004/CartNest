"""Default storefront workload. Explicit scenarios live in locust_scenarios.py."""
import json
import logging
import math
import os
from functools import lru_cache, wraps
from itertools import accumulate
from pathlib import Path
import random
from uuid import uuid4

from gevent.queue import Empty, Queue
from locust import FastHttpUser, constant, events, task
from locust.exception import StopUser

DATA = {}
ACCOUNTS = Queue()
DUMMY_DELIVERY_ADDRESS = '123 Demo Street, Test City'


class FlowFailure(Exception):
    def __init__(self, message, status=0):
        super().__init__(message)
        self.status = status


def flow(function):
    """Abort this iteration on failure while keeping the simulated user alive."""
    @wraps(function)
    def wrapped(self):
        try:
            return function(self)
        except FlowFailure as exc:
            logging.warning('%s: %s', type(self).__name__, exc)
    return wrapped


def check(condition, message):
    if not condition:
        raise ValueError(message)


@lru_cache(maxsize=8)
def product_cumulative_weights(count):
    """Discrete Gaussian spanning approximately -3 to +3 standard deviations."""
    center = (count - 1) / 2
    spread = max(count / 6, 1)
    return tuple(accumulate(
        math.exp(-0.5 * ((index - center) / spread) ** 2)
        for index in range(count)
    ))


def choose_product():
    products = DATA['product_ids']
    return random.choices(products, cum_weights=product_cumulative_weights(len(products)), k=1)[0]


@events.test_start.add_listener
def refill_accounts(environment, **kwargs):
    global DATA, ACCOUNTS
    # Each distributed worker must receive a different file via its environment.
    path = Path(os.environ.get('LOADTEST_DATA_PATH', Path(__file__).with_name('loadtest_data.json')))
    from locust.runners import MasterRunner
    if isinstance(environment.runner, MasterRunner):
        return
    try:
        DATA = json.loads(path.read_text(encoding='utf-8'))
        check(bool(DATA['product_ids']), 'No prepared products')
        check(len(set(DATA['product_ids'])) == len(DATA['product_ids']), 'Duplicate product IDs')
        # Stable ranks keep the same products hot across runs and worker files.
        DATA['product_ids'] = sorted(DATA['product_ids'])
        accounts = DATA['accounts']
        check(len({a['username'] for a in accounts}) == len(accounts), 'Duplicate accounts')
        check(bool(DATA['delivery_option_id']), 'Missing delivery option')
        for account in accounts:
            check(bool(account['username']) and bool(account['password']), 'Invalid credentials')
    except (OSError, ValueError, KeyError, TypeError) as exc:
        logging.error('Invalid load-test data: %s', exc)
        environment.process_exit_code = 1
        environment.runner.quit()
        return
    ACCOUNTS = Queue()
    for account in accounts:
        ACCOUNTS.put(account)


class IsolatedUser(FastHttpUser):
    abstract = True
    wait_time = constant(0)
    connection_timeout = 10
    network_timeout = 10
    insecure = False
    max_retries = 0

    def __init__(self, environment):
        super().__init__(environment)
        # FastHttpSession does not expose requests.Session.headers. Keep
        # mutable session headers on each simulated user and merge per request.
        self.headers = {}

    def request(self, method, path, expected=200, validate=None, require_isolation=False, **kwargs):
        failure = None
        headers = {**self.headers, **kwargs.pop('headers', {})}
        with self.client.request(method, path, headers=headers, catch_response=True, **kwargs) as response:
            if response.status_code != expected:
                failure = f'Expected {expected}, got {response.status_code}'
            elif require_isolation and response.headers.get('X-Loadtest-Database') != 'isolated':
                failure = 'Missing isolation marker; start Django with --settings=config.loadtest.'
            elif validate:
                try:
                    validate(response.json())
                except (ValueError, KeyError, TypeError, IndexError) as exc:
                    failure = f'Invalid response: {exc}'
            if failure:
                response.failure(failure)
            else:
                # Explicit expectations can include 4xx outcomes in validation
                # scenarios; override the client's default HTTP error marking.
                response.success()
        if failure:
            raise FlowFailure(f'{method} {path}: {failure}', response.status_code)
        return response

    def on_start(self):
        try:
            response = self.request('GET', '/api/auth/csrf/', require_isolation=True,
                                    validate=lambda data: check(bool(data['csrfToken']), 'Missing CSRF token'))
            self.headers['X-CSRFToken'] = response.json()['csrfToken']
        except FlowFailure as exc:
            logging.error('Startup failed: %s', exc)
            raise StopUser() from exc


class CatalogUser(IsolatedUser):
    weight = 95

    @task(65)
    @flow
    def browse_product(self):
        self.request('GET', '/api/products/', name='Catalog',
                     validate=lambda data: check(isinstance(data, list) and bool(data), 'Empty catalog'))

    @task(30)
    @flow
    def product_detail(self):
        product_id = choose_product()
        self.request('GET', f'/api/products/{product_id}/', name='/api/products/[id]/',
                     validate=lambda data: check(data['id'] == product_id, 'Wrong product'))

    @task(3)
    @flow
    def view_delivery_options(self):
        self.request('GET', '/api/delivery-options/', params={'expand': 'estimatedDeliveryTime'})

    @task(2)
    @flow
    def most_viewed(self):
        self.request('GET', '/api/products/most-viewed/', validate=validate_ranking)


def validate_ranking(data):
    check(isinstance(data, list) and len(data) <= 10, 'Expected at most ten products')
    ids = [product['id'] for product in data]
    check(len(set(ids)) == len(ids), 'Duplicate products')


class AuthenticatedUser(IsolatedUser):
    abstract = True

    def on_start(self):
        super().on_start()
        try:
            self.account = ACCOUNTS.get_nowait()
        except Empty:
            logging.error('Account pool exhausted; prepare more users. Active load will be reduced.')
            raise StopUser()
        self.product_id = choose_product()
        try:
            self.login()
        except FlowFailure as exc:
            logging.error('Login failed: %s', exc)
            raise StopUser() from exc

    def login(self):
        response = self.request('POST', '/api/auth/login/', json=self.account,
                                validate=lambda data: check(bool(data['csrfToken']), 'Missing CSRF token'))
        self.headers['X-CSRFToken'] = response.json()['csrfToken']

    def clean_cart(self):
        items = self.request('GET', '/api/cart-items/', name='Recovery: cart').json()
        for item in items:
            self.request('DELETE', f"/api/cart-items/{item['productId']}/", expected=204,
                         name='Recovery: delete cart item')

    def add_item(self):
        self.request('POST', '/api/cart-items/', json={
            'productId': self.product_id, 'quantity': 1,
            'deliveryOptionId': DATA['delivery_option_id'],
        }, validate=lambda data: check(data['quantity'] == 1, 'Expected exactly one item'))


class CustomerUser(AuthenticatedUser):
    weight = 3

    def on_start(self):
        super().on_start()
        try:
            self.clean_cart()
            self.add_item()
        except FlowFailure as exc:
            logging.warning('Could not seed customer cart: %s', exc)

    @task(3)
    @flow
    def cart(self):
        self.request('GET', '/api/cart-items/', params={'expand': 'product'})

    @task(2)
    @flow
    def payment_summary(self):
        self.request('GET', '/api/payment-summary/')

    @task(1)
    @flow
    def orders(self):
        orders = self.request('GET', '/api/orders/', params={'expand': 'products'}).json()
        if orders:
            order_id = random.choice(orders)['id']
            self.request('GET', f'/api/orders/{order_id}/', name='/api/orders/[id]/')

    @task(1)
    @flow
    def profile(self):
        self.request('GET', '/api/auth/me/')

    @task(2)
    @flow
    def recent_history(self):
        product_id = choose_product()
        self.request('GET', f'/api/products/{product_id}/', name='Signed-in product detail')
        def validate(data):
            validate_ranking(data)
            check(bool(data) and data[0]['id'] == product_id, 'Latest product missing from history')
        self.request('GET', '/api/products/recently-viewed/', validate=validate)


class CartUser(AuthenticatedUser):
    weight = 1
    dirty = True

    @task
    @flow
    def cart_lifecycle(self):
        if self.dirty:
            self.clean_cart()
        self.dirty = True
        self.product_id = choose_product()
        self.add_item()
        path = f'/api/cart-items/{self.product_id}/'
        name = '/api/cart-items/[productId]/'
        self.request('GET', path, name=name)
        self.request('PATCH', path, name=name, json={'quantity': 2},
                     validate=lambda data: check(data['quantity'] == 2, 'Quantity not updated'))
        self.request('PUT', path, name=name, json={'quantity': 1},
                     validate=lambda data: check(data['quantity'] == 1, 'Quantity not restored'))
        self.request('GET', '/api/payment-summary/')
        self.request('DELETE', path, expected=204, name=name)
        self.dirty = False


class CheckoutUser(AuthenticatedUser):
    weight = 1
    pending = None
    replay = False

    @task
    @flow
    def checkout(self):
        if self.pending is None:
            self.clean_cart()
            self.product_id = choose_product()
            self.add_item()
            summary = self.request('GET', '/api/payment-summary/',
                                   validate=lambda data: check(data['totalItems'] == 1, 'Unexpected cart quantity')).json()
            self.pending = {'key': str(uuid4()), 'product': self.product_id,
                            'total': summary['totalCostCents'], 'order_id': None,
                            'submitted': False}
        pending = self.pending

        def validate(data):
            check(bool(data['id']), 'Missing order ID')
            check(data['totalCostCents'] == pending['total'], 'Order total differs from summary')
            check(len(data['products']) == 1, 'Unexpected order products')
            item = data['products'][0]
            check(item['productId'] == pending['product'] and item['quantity'] == 1,
                  'Order differs from cart')
            if pending['order_id']:
                check(data['id'] == pending['order_id'], 'Retry created a different order')

        try:
            name = 'Checkout: resolve pending' if pending['submitted'] else 'Checkout: submit'
            pending['submitted'] = True
            response = self.request('POST', '/api/orders/', expected=201,
                                    json={'deliveryAddress': DUMMY_DELIVERY_ADDRESS},
                                    headers={'Idempotency-Key': pending['key']},
                                    name=name,
                                    validate=validate)
        except FlowFailure as exc:
            # A timeout/5xx can occur after commit. Keep the key and cart untouched.
            if 400 <= exc.status < 500 and exc.status not in (408, 409, 429):
                self.pending = None
            raise
        pending['order_id'] = response.json()['id']
        if self.replay:
            self.request('POST', '/api/orders/', expected=201,
                         json={'deliveryAddress': DUMMY_DELIVERY_ADDRESS},
                         headers={'Idempotency-Key': pending['key']},
                         name='Checkout: replay', validate=validate)
        self.request('GET', f"/api/orders/{pending['order_id']}/", name='/api/orders/[id]/', validate=validate)
        self.request('GET', '/api/cart-items/',
                     validate=lambda data: check(data == [], 'Cart not cleared after checkout'))
        self.pending = None
