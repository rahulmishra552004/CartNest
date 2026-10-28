import { Link, useLocation, useNavigate } from 'react-router';
import axios from 'axios';
import { VendorHeader } from '../../header/VendorHeader.jsx';
import { VendorCatalogNavigation } from './VendorCatalogNavigation.jsx';
import { VendorProductForm } from './VendorProductForm.jsx';
import './VendorCatalog.css';

export function VendorProductDetailsPage({ user }) {
  const { state } = useLocation();
  const product = state?.product;
  const navigate = useNavigate();

  async function handleUpdateProduct(formData) {
    await axios.patch(`/api/vendor/products/${product.id}/`, formData);
    navigate('/vendor/catalog', {
      state: { successMessage: 'Product updated successfully.' },
    });
  }

  return (
    <>
      <title>Edit product | Vendor catalog | CartNest</title>
      <VendorHeader user={user} />

      <main className="vendor-page vendor-product-details-page">
        <div className="vendor-page-content">
          <VendorCatalogNavigation />

          <section className="vendor-product-details" aria-labelledby="vendor-product-title">
            <nav className="vendor-breadcrumb" aria-label="Breadcrumb">
              <Link to="/vendor/catalog">Catalog</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">Product details</span>
            </nav>

            {product ? (
              <VendorProductForm
                titleId="vendor-product-title"
                title="Edit product"
                product={product}
                description="Update this product’s catalog information."
                primaryActionLabel="Save changes"
                showDeleteAction
                onSubmit={handleUpdateProduct}
              />
            ) : (
              <div className="vendor-product-form-message vendor-product-form-error" role="alert">
                Product details are unavailable. Return to the catalog and select the product again.
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
