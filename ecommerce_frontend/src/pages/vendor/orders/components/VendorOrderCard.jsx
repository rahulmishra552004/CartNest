import dayjs from 'dayjs';
import { AddressDetails } from '../../../checkout/delivery-address/AddressDetails.jsx';
import { VendorOrderStatusControl } from './VendorOrderStatusControl.jsx';
import { formatCurrency } from '../../../../utils/money.js';

export function VendorOrderCard({ order, setPendingOrders }) {
  const { id, product, quantity, deliveryStatus, estimatedDeliveryTimeMs } = order;
  // `order` is one order item; `order.order` is the customer order it belongs to.
  const placedOrder = order.order;

  const address = {
    recipientName: placedOrder.deliveryRecipientName,
    label: placedOrder.deliveryLabel,
    phoneNumber: placedOrder.deliveryPhoneNumber,
    line1: placedOrder.deliveryAddressLine1,
    line2: placedOrder.deliveryAddressLine2,
    city: placedOrder.deliveryCity,
    state: placedOrder.deliveryState,
    postalCode: placedOrder.deliveryPostalCode,
    countryCode: placedOrder.deliveryCountryCode,
  };

  return (
    <article className="vendor-order-card">
      <div className="vendor-order-main">
        <div className="vendor-order-product-image">
          <img src={product.image} alt={product.name} />
        </div>

        <div className="vendor-order-text">
          <h2 className="vendor-order-product-name">{product.name}</h2>
          <p className="vendor-order-meta">
            Quantity {quantity} · ${formatCurrency(product.priceCents * quantity)}
          </p>
          <p className="vendor-order-meta-muted">
            Order #{placedOrder.id} · Placed {dayjs(placedOrder.orderTimeMs).format('MMMM D, YYYY')}
          </p>
        </div>

        <VendorOrderStatusControl orderId={id} status={deliveryStatus} setPendingOrders={setPendingOrders}/>
      </div>

      <div className="vendor-order-shipping">
        <div className="vendor-order-ship-to">
          <p className="vendor-order-label">Ship to</p>
          <AddressDetails address={address} />
        </div>

        <p className="vendor-order-eta">
          <span>Estimated delivery</span>
          <strong>{dayjs(estimatedDeliveryTimeMs).format('dddd, MMMM D')}</strong>
        </p>
      </div>
    </article>
  );
}
