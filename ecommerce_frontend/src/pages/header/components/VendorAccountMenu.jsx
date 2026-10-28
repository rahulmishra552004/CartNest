import { AccountMenu, AccountMenuLink } from './AccountMenu.jsx';

export function VendorAccountMenu({ user }) {
  return (
    <AccountMenu user={user}>
      <AccountMenuLink to="/" icon="home" end>Home</AccountMenuLink>
      <AccountMenuLink to="/vendor/profile" icon="profile">My profile</AccountMenuLink>
      <AccountMenuLink to="/vendor/catalog" icon="dashboard">Dashboard</AccountMenuLink>
      <AccountMenuLink to="/vendor/about" icon="about">About CartNest</AccountMenuLink>
    </AccountMenu>
  );
}
