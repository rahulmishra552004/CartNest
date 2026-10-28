import { AccountMenu, AccountMenuLink } from './AccountMenu.jsx';

export function CustomerAccountMenu({ user }) {
  return (
    <AccountMenu user={user}>
      <AccountMenuLink to="/" icon="home" end>Home</AccountMenuLink>
      <AccountMenuLink to="/profile" icon="profile">My profile</AccountMenuLink>
      {user.role === 'vendor' && (
        <AccountMenuLink to="/vendor/catalog" icon="dashboard">Dashboard</AccountMenuLink>
      )}
      <AccountMenuLink to="/orders" icon="orders">Order history</AccountMenuLink>
      <AccountMenuLink to="/recently-viewed" icon="recent">Recently viewed</AccountMenuLink>
      <AccountMenuLink to="/about" icon="about">About CartNest</AccountMenuLink>
    </AccountMenu>
  );
}
