import { SearchInput } from './SearchInput.jsx';
import { SearchButton } from './SearchButton.jsx';

export function HeaderSearch({ value, onChange, onSearch, placeholder, ariaLabel }) {
  return (
    <form
      className="middle-section"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(value);
      }}
    >
      <SearchInput
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        ariaLabel={ariaLabel}
      />
      <SearchButton ariaLabel={ariaLabel} />
    </form>
  );
}
