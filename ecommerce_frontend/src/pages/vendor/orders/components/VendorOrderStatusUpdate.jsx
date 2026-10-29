export function VendorOrderStatusUpdate({ orderId, statusValue }) {
  return (
    <div className="vendor-order-update">
      <label htmlFor={`status-${orderId}`}>Delivery status</label>
      <div>
        <select id={`status-${orderId}`} defaultValue={statusValue}>
          <option value="processing">Processing</option>
          <option value="packed">Packed</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
        </select>
        <button type="button">Update status</button>
      </div>
      <p>Static control — connect this to your API when the delivery status field is ready.</p>
    </div>
  );
}
