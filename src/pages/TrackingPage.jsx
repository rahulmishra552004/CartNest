import './TrackingPage.css';
import { Header } from './Header';

function getProduct(orders, orderId, productId){
  let matchingOrder;
  let matchingProduct;

  orders.forEach((order) => {
    if(order.id === orderId){
      matchingOrder = order;
      return;
    }
  })

  matchingOrder.products.forEach((orderedProduct) => {
    if(orderedProduct.product.id === productId){
      matchingProduct = orderedProduct;
      return;
    }
  })
  
  return matchingProduct;
}

export function TrackingPage({ cart, orders }) {
  if(orders.length === 0) 
    return;

  const urlParameters = new URLSearchParams(window.location.search);
  const orderId = urlParameters.get('orderId');
  const productId = urlParameters.get('productId');

  const product = getProduct(orders, orderId, productId);

  return (
    <>
      <Header cart={cart} />

      <div className="tracking-page">
        <div className="order-tracking">
          <a className="back-to-orders-link link-primary" href="/orders">
            View all orders
          </a>

          <div className="delivery-date">
            {product.estimatedDeliveryTimeMs}
          </div>

          <div className="product-info">
            {product.product.name}
          </div>

          <div className="product-info">
            Quantity: {product.quantity}
          </div>

          <img className="product-image" src={product.product.image} />

          <div className="progress-labels-container">
            <div className="progress-label">
              Preparing
            </div>
            <div className="progress-label current-status">
              Shipped
            </div>
            <div className="progress-label">
              Delivered
            </div>
          </div>

          <div className="progress-bar-container">
            <div className="progress-bar"></div>
          </div>
        </div>
      </div>
    </>
  )
}