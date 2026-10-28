export function SearchInput({ value, onChange, placeholder = 'Search', ariaLabel = 'Search products' }) {
  return (
    <input
      className="search-bar"
      type="search"
      placeholder={placeholder}
      aria-label={ariaLabel}
      value={value}
      onChange={onChange}
    />
  );
}
