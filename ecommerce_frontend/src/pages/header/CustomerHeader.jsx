import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { HeaderLayout } from './HeaderLayout.jsx';
import { HeaderSearch } from './components/HeaderSearch.jsx';
import { CustomerAccountMenu } from './components/CustomerAccountMenu.jsx';
import { OrdersLink } from './components/OrdersLink.jsx';
import { CartLink } from './components/CartLink.jsx';

export function CustomerHeader({ cart = [], user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState('');
  const searchSearchParam = searchParams.get('search');

  useEffect(() => setSearchInput(searchSearchParam ?? ''), [searchSearchParam]);

  function handleSearch(value) {
    const nextParams = new URLSearchParams();
    const search = value.trim();

    if (search) nextParams.set('search', search);

    if (location.pathname === '/') {
      const productSort = searchParams.get('sort');
      if (productSort) nextParams.set('sort', productSort);
    }

    const query = nextParams.toString();
    navigate({ pathname: '/', search: query ? `?${query}` : '' });
  }

  return (
    <HeaderLayout
      search={(
        <HeaderSearch
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onSearch={handleSearch}
          placeholder="Search"
          ariaLabel="Search products"
        />
      )}
    >
      <CartLink cart={cart} />
      <OrdersLink />
      {user ? <CustomerAccountMenu user={user} /> : <Link className="auth-link header-link" to="/login">Login</Link>}
    </HeaderLayout>
  );
}
