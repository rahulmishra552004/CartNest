export function VendorOrdersHeading({ pendingOrders }) {
  return (
    <header className="vendor-orders-heading">
      <div>
        <p className="vendor-orders-eyebrow">Vendor dashboard</p>
        <h1 id="vendor-orders-title">Orders</h1>
        <p>Review the orders placed for your products and update each delivery status.</p>
      </div>

      <div className="vendor-orders-total">
        <span>{pendingOrders}</span>
        <small>Pending Orders</small>
      </div>
    </header>
  );
}
