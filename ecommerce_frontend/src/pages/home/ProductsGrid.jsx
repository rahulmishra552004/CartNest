import { Product } from './Product.jsx';

export function ProductsGrid({ products, getCartData }) {
  return (
    products.map((product) => {
      return (
        <Product key={product.id} product={product} getCartData={getCartData} />
      );
    })
  );
}