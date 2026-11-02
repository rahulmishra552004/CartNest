import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { HeaderLayout } from './HeaderLayout.jsx';
import { HeaderSearch } from './components/HeaderSearch.jsx';
import { VendorAccountMenu } from './components/VendorAccountMenu.jsx';
import { AddProductLink } from './components/AddProductLink.jsx';
import { AlertsLink } from './components/AlertsLink.jsx';

export function VendorHeader({ user }) {
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

    //searching from the catalog keeps its sort, like the shop's search keeps the home page sort
    if (location.pathname === '/vendor/catalog') {
      const catalogSort = searchParams.get('sort');
      if (catalogSort) nextParams.set('sort', catalogSort);
    }

    const query = nextParams.toString();
    navigate({ pathname: '/vendor/catalog', search: query ? `?${query}` : '' });
  }

  return (
    <HeaderLayout
      search={(
        <HeaderSearch
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onSearch={handleSearch}
          placeholder="Search your catalog"
          ariaLabel="Search your catalog"
        />
      )}
    >
      {user ? (
        <>
          <AddProductLink />
          <AlertsLink />
          <VendorAccountMenu user={user} />
        </>
      ) : <Link className="auth-link header-link" to="/login">Login</Link>}
    </HeaderLayout>
  );
}
