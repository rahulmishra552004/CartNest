import { Header } from '../Header.jsx';
import './HomePage.css';
import axios from 'axios'
import { useEffect, useState } from 'react';
import { ProductsGrid } from './ProductsGrid.jsx';
import { CatalogNavigation } from './CatalogNavigation.jsx';

export function HomePage({ cart, getCartData, user }) {

  const [products, setProducts] = useState([]);

  useEffect(() => {
    const getProductsData = async () => {
      const response = await axios('/api/products/');
      setProducts(response.data);
    }

    getProductsData();
  }, []);

  return (
    <>
      <title>
        CartNest
      </title>

      <Header cart={cart} user={user} />

      <main className="home-page catalog-home-page">
        <div className="catalog-home-content">
          <CatalogNavigation />
          <div className="products-grid">
            <ProductsGrid products={products} getCartData={getCartData} user={user} />
          </div>
        </div>
      </main>
    </>
  )
}
