export function SearchButton({ ariaLabel = 'Search' }) {
  return (
    <button className="search-button" type="submit" aria-label={ariaLabel}>
      <img className="search-icon" src="/media/icons/search-icon.png" alt="" />
    </button>
  );
}
