import axios from 'axios';
import { Link, useNavigate } from 'react-router';
import { VendorHeader } from '../../header/VendorHeader.jsx';
import { VendorCatalogNavigation } from './VendorCatalogNavigation.jsx';
import { VendorProductForm } from './VendorProductForm.jsx';
import './VendorCatalog.css';

export function VendorAddProductPage({ user }) {
  const navigate = useNavigate();

  async function handleAddProduct(formData) {
    await axios.post('/api/vendor/products/', formData);
    navigate('/vendor/catalog', {
      state: { successMessage: 'Product added successfully.' },
    });
  }

  return (
    <>
      <title>Add product | Vendor catalog | CartNest</title>
      <VendorHeader user={user} />

      <main className="vendor-page">
        <div className="vendor-page-content">
          <VendorCatalogNavigation />

          <section className="vendor-product-details" aria-labelledby="vendor-add-product-title">
            <nav className="vendor-breadcrumb" aria-label="Breadcrumb">
              <Link to="/vendor/catalog">Catalog</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">Add product</span>
            </nav>

            <VendorProductForm
              titleId="vendor-add-product-title"
              title="Add a new product"
              description="Enter the product information that will appear in your catalog."
              primaryActionLabel="Add product"
              onSubmit={handleAddProduct}
            />
          </section>
        </div>
      </main>
    </>
  );
}
