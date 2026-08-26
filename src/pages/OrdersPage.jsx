import { Header } from './Header.jsx';
import './OrdersPage.css';
import { useState, useEffect, Fragment } from 'react';
import axios from 'axios';
import { formatCurrency } from '../utils/money.js';

export function OrdersPage({ cart }) {
  const [orders, setOrders] = useState([]);
  useEffect(() => {
    axios('/api/orders?expand=products')
      .then((response) => {
        setOrders(response.data);
      })
  }, []);

  return (
    <>
      <Header cart={cart} />

      <div className="orders-page">
        <div className="page-title">Your Orders</div>

        <div className="orders-grid">
          {
            orders.map((order) => {
              return (
                <div 
                key={order.id}
                className="order-container">

                  <div className="order-header">
                    <div className="order-header-left-section">
                      <div className="order-date">
                        <div className="order-header-label">Order Placed:</div>
                        <div>{order.orderTimeMs}</div>
                      </div>
                      <div className="order-total">
                        <div className="order-header-label">Total:</div>
                        <div>${formatCurrency(order.totalCostCents)}</div>
                      </div>
                    </div>

                    <div className="order-header-right-section">
                      <div className="order-header-label">Order ID:</div>
                      <div>{order.id}</div>
                    </div>
                  </div>

                  <div className="order-details-grid">
                    {
                      order.products.map((orderedProduct) => {
                        return (
                          <Fragment key={orderedProduct.productId}>
                            <div className="product-image-container">
                              <img src={orderedProduct.product.image} />
                            </div>

                            <div className="product-details">
                              <div className="product-name">
                                {orderedProduct.product.name}
                              </div>
                              <div className="product-delivery-date">
                                Arriving on: {orderedProduct.estimatedDeliveryTimeMs}
                              </div>
                              <div className="product-quantity">
                                Quantity: {orderedProduct.quantity}
                              </div>
                              <button className="buy-again-button button-primary">
                                <img className="buy-again-icon" src="images/icons/buy-again.png" />
                                <span className="buy-again-message">Add to Cart</span>
                              </button>
                            </div>

                            <div className="product-actions">
                              <a href="/tracking">
                                <button className="track-package-button button-secondary">
                                  Track package
                                </button>
                              </a>
                            </div>
                          </Fragment>
                        )
                      })
                    }
                  </div>
                </div>
              );
            })
          }
        </div>
      </div>
    </>
  )
}