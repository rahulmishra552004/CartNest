import { Header } from '../Header.jsx';
import './HomePage.css';
import axios from 'axios'
import { useEffect, useState } from 'react';
import { ProductsGrid } from './ProductsGrid.jsx';

export function HomePage({ cart, getCartData, user, onLogout }) {

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
        Ecommerce Website
      </title>

      <Header cart={cart} user={user} onLogout={onLogout} />

      <div className="home-page">
        <div className="products-grid">

          <ProductsGrid products={products} getCartData={getCartData}/>

        </div>
      </div>
    </>
  )
}
