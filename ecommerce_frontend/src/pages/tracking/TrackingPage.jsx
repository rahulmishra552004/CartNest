import './TrackingPage.css';
import axios from 'axios';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { CustomerHeader } from '../header/CustomerHeader.jsx';
import { formatCurrency } from '../../utils/money.js';

const DELIVERY_STEPS = [
  {
    status: 'preparing',
    title: 'Preparing',
    image: '/status-preparing.svg',
    imageAlt: 'An order being packed in a box',
    currentDescription: 'Your items are being packed for delivery.',
    completeDescription: 'Your items were packed and handed to the carrier.',
    upcomingDescription: 'Your items will be packed for delivery.',
  },
  {
    status: 'shipping',
    title: 'Shipping',
    image: '/status-shipping.svg',
    imageAlt: 'A delivery truck carrying the package',
    currentDescription: 'Your package is moving through the carrier network.',
    completeDescription: 'The carrier transported your package.',
    upcomingDescription: 'The carrier will transport your package.',
  },
  {
    status: 'delivered',
    title: 'Delivered',
    image: '/status-delivered.svg',
    imageAlt: 'A delivered package beside a front door',
    currentDescription: 'Your package arrived at the delivery address.',
    completeDescription: 'Your package arrived at the delivery address.',
    upcomingDescription: 'The carrier will leave the package at your address.',
  },
];

const STATUS_COPY = {
  preparing: {
    heading: 'We’re preparing your package',
    badge: 'Preparing',
  },
  shipping: {
    heading: 'Your package is on the way',
    badge: 'In transit',
  },
  delivered: {
    heading: 'Your package has been delivered',
    badge: 'Delivered',
  },
};

function getDeliveryMethod(deliveryDays) {
  if (deliveryDays === 0) return 'Same-day delivery';
  if (deliveryDays === 1) return '1-day delivery';
  return `${deliveryDays}-day delivery`;
}

function getCountryName(countryCode) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(countryCode) || countryCode;
  } catch {
    return countryCode;
  }
}

export function TrackingPage({ cart, user }) {
  const [orderItem, setOrderItem] = useState(null);
  const [error, setError] = useState('');
  const { orderId, productId } = useParams();

  useEffect(() => {
    //ignore is used to prevent older request from changing orderItem
    // when the component is unmounted, on unmount cleanup runs and
    //ignore becomes true
    let ignore = false;

    const fetchAndSetOrderItem = async () => {
      try {
        const { data } = await axios.get(
          `/api/orders/${orderId}/products/${productId}/tracking/`
        );

        if (!ignore) {
          setError('');
          setOrderItem(data);
        }
      } catch {
        if (!ignore) {
          setOrderItem(null);
          setError('We couldn’t load this shipment.');
        }
      }
    };

    fetchAndSetOrderItem();

    return () => {
      ignore = true;
    };
  }, [orderId, productId]);

  let trackingContent;

  if (error) {
    trackingContent = (
      <p className="tracking-request-state tracking-request-error" role="alert">{error}</p>
    );
  } else if (!orderItem) {
    trackingContent = (
      <p className="tracking-request-state" aria-live="polite">Loading shipment…</p>
    );
  } else {
    const {
      id: orderItemId,
      product,
      quantity,
      order,
      deliveryDays,
      estimatedDeliveryTimeMs,
      deliveryPriceCents,
      deliveryStatus,
      taxCents,
    } = orderItem;
    const currentStepIndex = DELIVERY_STEPS.findIndex(
      (step) => step.status === deliveryStatus
    );
    const safeCurrentStepIndex = currentStepIndex === -1 ? 0 : currentStepIndex;
    const statusCopy = STATUS_COPY[deliveryStatus] || STATUS_COPY.preparing;
    const productTotalCents = product.priceCents * quantity;
    const shipmentTotalCents = productTotalCents + deliveryPriceCents + taxCents;
    const cityLine = [order.deliveryCity, order.deliveryState]
      .filter(Boolean)
      .join(', ');

    trackingContent = (
      <>
        <header className="tracking-heading">
          <div>
            <p className="tracking-eyebrow">Order tracking</p>
            <h1>{statusCopy.heading}</h1>
            <p className="tracking-arrival">
              Estimated delivery {dayjs(estimatedDeliveryTimeMs).format('dddd, MMMM D')}
            </p>
          </div>
          <span className="tracking-status-badge">{statusCopy.badge}</span>
        </header>

        <section className="tracking-journey" aria-labelledby="delivery-progress-title">
          <div className="tracking-section-heading">
            <div>
              <p className="tracking-section-kicker">Delivery progress</p>
              <h2 id="delivery-progress-title">From our store to your door</h2>
            </div>
          </div>

          <div className="tracking-status-list">
            {DELIVERY_STEPS.map((step, index) => {
              const stepState = index < safeCurrentStepIndex
                ? 'complete'
                : index === safeCurrentStepIndex
                  ? 'current'
                  : 'upcoming';
              const description = stepState === 'complete'
                ? step.completeDescription
                : stepState === 'current'
                  ? step.currentDescription
                  : step.upcomingDescription;
              const label = stepState === 'complete'
                ? 'Completed'
                : stepState === 'current'
                  ? 'Current step'
                  : `Step ${index + 1}`;

              return (
                <article
                  className={`tracking-status-step status-${stepState}`}
                  key={step.status}
                >
                  <div className="status-image-frame">
                    <img src={step.image} alt={step.imageAlt} />
                  </div>
                  <div className="status-step-copy">
                    <span className="status-step-label">{label}</span>
                    <h3>{step.title}</h3>
                    <p>{description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <div className="tracking-details-grid">
          <section className="tracking-detail-card" aria-labelledby="order-details-title">
            <div className="tracking-card-heading">
              <span className="tracking-card-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M7 3h10a2 2 0 0 1 2 2v16l-3-2-4 2-4-2-3 2V5a2 2 0 0 1 2-2Z" />
                  <path d="M8 8h8M8 12h6" />
                </svg>
              </span>
              <h2 id="order-details-title">Order details</h2>
            </div>
            <dl className="tracking-detail-list">
              <div>
                <dt>Order ID</dt>
                <dd className="tracking-order-id">{order.id}</dd>
              </div>
              <div>
                <dt>Shipment ID</dt>
                <dd className="tracking-order-id">{orderItemId}</dd>
              </div>
              <div>
                <dt>Order placed</dt>
                <dd>{dayjs(order.orderTimeMs).format('MMMM D, YYYY')}</dd>
              </div>
              <div>
                <dt>Delivery method</dt>
                <dd>{getDeliveryMethod(deliveryDays)}</dd>
              </div>
            </dl>
          </section>

          <section className="tracking-detail-card" aria-labelledby="delivery-address-title">
            <div className="tracking-card-heading">
              <span className="tracking-card-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
              </span>
              <h2 id="delivery-address-title">Delivery address</h2>
            </div>
            <address className="tracking-address">
              <strong>{order.deliveryRecipientName}</strong>
              <span>{order.deliveryAddressLine1}</span>
              {order.deliveryAddressLine2 && <span>{order.deliveryAddressLine2}</span>}
              <span>{cityLine} {order.deliveryPostalCode}</span>
              <span>{getCountryName(order.deliveryCountryCode)}</span>
            </address>
          </section>
        </div>

        <section className="tracking-order-card" aria-labelledby="items-title">
          <div className="tracking-card-heading tracking-order-card-heading">
            <span className="tracking-card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="m4 7 8-4 8 4-8 4-8-4Z" />
                <path d="m4 7 8 4 8-4v10l-8 4-8-4V7Z" />
                <path d="M12 11v10" />
              </svg>
            </span>
            <h2 id="items-title">Item in this shipment</h2>
          </div>

          <div className="tracking-order-body">
            <div className="tracking-product">
              <div className="tracking-product-image">
                {product.image ? (
                  <img src={product.image} alt={product.name} />
                ) : (
                  <span>No image</span>
                )}
              </div>
              <div className="tracking-product-copy">
                <h3>{product.name}</h3>
                <div className="tracking-product-meta">
                  <span>Quantity: {quantity}</span>
                  <span>${formatCurrency(product.priceCents)} each</span>
                </div>
              </div>
            </div>

            <dl className="tracking-price-summary">
              <div>
                <dt>Product total</dt>
                <dd>${formatCurrency(productTotalCents)}</dd>
              </div>
              <div>
                <dt>Delivery</dt>
                <dd>${formatCurrency(deliveryPriceCents)}</dd>
              </div>
              <div>
                <dt>Tax</dt>
                <dd>${formatCurrency(taxCents)}</dd>
              </div>
              <div className="tracking-price-total">
                <dt>Shipment total</dt>
                <dd>${formatCurrency(shipmentTotalCents)}</dd>
              </div>
            </dl>
          </div>
        </section>

        <aside className="tracking-help">
          <div>
            <h2>Need help with this delivery?</h2>
            <p>Contact CartNest support and include the order ID shown above.</p>
          </div>
          <a href="mailto:support@cartnest.example">Contact support</a>
        </aside>
      </>
    );
  }

  return (
    <>
      <title>Track order | CartNest</title>

      <CustomerHeader cart={cart} user={user} />

      <main className="tracking-page">
        <div className="tracking-content">
          <Link className="back-to-orders-link" to="/orders">
            <span aria-hidden="true">&#8592;</span>
            View all orders
          </Link>

          {trackingContent}
        </div>
      </main>
    </>
  );
}
