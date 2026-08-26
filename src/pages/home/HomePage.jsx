import { Header } from '../Header.jsx';
import './HomePage.css';
import axios from 'axios'
import { useEffect, useState } from 'react';
import { ProductsGrid } from './ProductsGrid.jsx';

export function HomePage({ cart }) {

  const [products, setProducts] = useState([]);
  
  useEffect(() => {
    const getProductsData = async () => {
      const response = await axios('/api/products');
      setProducts(response.data);
    }
    
    getProductsData();
  }, []);

  return (
    <>
      <Header cart={cart} />

      <div className="home-page">
        <div className="products-grid">

          <ProductsGrid products={products} />
          
        </div>
      </div>
    </>
  )
}