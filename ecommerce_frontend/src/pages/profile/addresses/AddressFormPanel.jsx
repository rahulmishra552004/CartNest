import { AddressForm } from './AddressForm.jsx';

export function AddressFormPanel(props) {
  return (
    <section className="saved-address-form-panel">
      <AddressForm {...props} />
    </section>
  );
}
