import { Link } from 'react-router';
import { formatCount, formatShare } from '../formatStats.js';

//in delivery order, so the bar reads left to right as progress.
//countKey is the field in the stats response that holds each status's order item count
const STATUSES = [
  { key: 'preparing', label: 'Preparing', countKey: 'preparingItemsCount' },
  { key: 'shipping', label: 'Shipping', countKey: 'shippingItemsCount' },
  { key: 'delivered', label: 'Delivered', countKey: 'deliveredItemsCount' },
];

export function VendorStatusBreakdown({ summary }) {
  const getCount = (status) => summary[status.countKey];
  const total = STATUSES.reduce((sum, status) => sum + getCount(status), 0);
  const pending = summary.preparingItemsCount + summary.shippingItemsCount;
  const overdueCount = summary.overdueItemsCount;
  const getShare = (count) => (total === 0 ? 0 : count / total);

  const barLabel = STATUSES
    .map((status) => `${status.label} ${getCount(status)} (${formatShare(getShare(getCount(status)))})`)
    .join(', ');

  return (
    <section className="vendor-stats-card" aria-labelledby="vendor-status-title">
      <header className="vendor-stats-card-header">
        <h2 id="vendor-status-title">Delivery status</h2>
        {/* not tied to the time range: pending and overdue items need attention however old they are */}
        <p>All orders · {formatCount(total)} order items · {formatCount(pending)} pending</p>
      </header>

      <div className="vendor-status-bar" role="img" aria-label={barLabel}>
        {STATUSES.filter((status) => getCount(status) > 0).map((status) => (
          <span
            key={status.key}
            className={`vendor-status-segment vendor-status-color-${status.key}`}
            style={{ flexGrow: getCount(status) }}
          />
        ))}
      </div>

      <ul className="vendor-status-list">
        {STATUSES.map((status) => (
          <li key={status.key} className="vendor-status-row">
            <span className={`vendor-status-swatch vendor-status-color-${status.key}`} aria-hidden="true" />
            <span className="vendor-status-name">{status.label}</span>
            <span className="vendor-status-count">{formatCount(getCount(status))}</span>
            <span className="vendor-status-share">{formatShare(getShare(getCount(status)))}</span>
          </li>
        ))}
      </ul>

      {overdueCount > 0 && (
        <div className="vendor-status-overdue">
          <svg className="vendor-alert-icon vendor-alert-icon-critical" viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="10" cy="10" r="9" />
            <path d="M10 5.5v5.5M10 14.2v.3" />
          </svg>
          <p>
            <strong>{formatCount(overdueCount)} overdue</strong>
            <span>Past their estimated delivery date</span>
          </p>
          <Link className="vendor-stats-link" to="/vendor/orders">View orders</Link>
        </div>
      )}
    </section>
  );
}
