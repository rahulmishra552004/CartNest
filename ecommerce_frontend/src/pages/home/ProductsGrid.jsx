import { Product } from './Product.jsx';

export function ProductsGrid({ products, getCartData, user }) {
  return (
    products.map((product) => {
      return (
        <Product key={product.id} product={product} getCartData={getCartData} user={user} />
      );
    })
  );
}
