export function VendorOrdersSummary() {
  return (
    <div className="vendor-orders-summary" aria-label="Order summary">
      <article>
        <span className="vendor-summary-icon vendor-summary-icon-new" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 8v4l2.5 1.5" />
            <circle cx="12" cy="12" r="8.5" />
          </svg>
        </span>
        <div>
          <strong>1</strong>
          <p>Processing</p>
        </div>
      </article>

      <article>
        <span className="vendor-summary-icon vendor-summary-icon-shipped" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h11v11H3zM14 10h3l4 4v3h-7z" />
            <circle cx="7" cy="18" r="2" />
            <circle cx="18" cy="18" r="2" />
          </svg>
        </span>
        <div>
          <strong>1</strong>
          <p>Shipped</p>
        </div>
      </article>

      <article>
        <span className="vendor-summary-icon vendor-summary-icon-delivered" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="8.5" />
            <path d="m8 12 2.5 2.5L16.5 9" />
          </svg>
        </span>
        <div>
          <strong>1</strong>
          <p>Delivered</p>
        </div>
      </article>
    </div>
  );
}
