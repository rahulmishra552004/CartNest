import { Header } from '../Header.jsx';
import './OrdersPage.css';
import { formatCurrency } from '../../utils/money.js';
import dayjs from 'dayjs';
import { OrderDetailsGrid } from './OrderDetailsGrid.jsx';

export function OrdersPage({ cart, orders, getCartData }) {
  return (
    <>
      <title>
        Orders
      </title>

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
                        <div>{dayjs(order.orderTimeMs).format('dddd, MMMM D')}</div>
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

                  <OrderDetailsGrid order={order} getCartData={getCartData}/>
                </div>
              );
            })
          }
        </div>
      </div>
    </>
  )
}