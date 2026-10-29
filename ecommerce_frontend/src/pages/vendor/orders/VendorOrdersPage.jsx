import { VendorHeader } from '../../header/VendorHeader.jsx';
import { VendorCatalogNavigation } from '../catalog/VendorCatalogNavigation.jsx';
import { VendorOrderCard } from './components/VendorOrderCard.jsx';
import { VendorOrdersHeading } from './components/VendorOrdersHeading.jsx';
import { VendorOrdersSummary } from './components/VendorOrdersSummary.jsx';
import './VendorOrdersPage.css';

export function VendorOrdersPage({ user }) {
  return (
    <>
      <title>Vendor orders | CartNest</title>
      <VendorHeader user={user} />

      <main className="vendor-orders-page">
        <div className="vendor-orders-page-content">
          <VendorCatalogNavigation />

          <section className="vendor-orders" aria-labelledby="vendor-orders-title">
            <VendorOrdersHeading />
            <VendorOrdersSummary />

            <div className="vendor-orders-list">
              <VendorOrderCard
                orderId="8f4d2a91"
                status="Processing"
                statusValue="processing"
                productImage="/media/products/men-cozy-fleece-hoodie-light-teal.jpg"
                productImageAlt="Men's cozy fleece hoodie in light teal"
                productName="Men's Fleece Hoodie - Light Teal"
                productId="bc2847e9"
                orderDate="October 28, 2026"
                quantity="2"
                orderTotal="$83.60"
                estimatedDelivery="October 31, 2026"
              />

              <VendorOrderCard
                orderId="27b6c845"
                status="Shipped"
                statusValue="shipped"
                productImage="/media/products/2-slot-toaster-white.jpg"
                productImageAlt="White two-slot toaster"
                productName="2 Slot Toaster - White"
                productId="54e0eccd"
                orderDate="October 26, 2026"
                quantity="1"
                orderTotal="$20.89"
                estimatedDelivery="October 30, 2026"
              />

              <VendorOrderCard
                orderId="b19a73e0"
                status="Delivered"
                statusValue="delivered"
                productImage="/media/products/sky-leaf-branch-earrings.jpg"
                productImageAlt="Sky blue leaf branch earrings"
                productName="Sterling Silver Leaf Branch Earrings"
                productId="e4f64a65"
                orderDate="October 20, 2026"
                quantity="1"
                orderTotal="$74.79"
                estimatedDelivery="October 24, 2026"
              />
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
