import { PAGE_SIZE } from '../utils/pagination.js';
import './Pagination.css';

//Previous / Page X of Y / Next under any paginated list; shows nothing when everything fits on one page
export function Pagination({ page, count, onPageChange, label = 'Pages' }) {
  const totalPages = Math.ceil(count / PAGE_SIZE);
  if (totalPages <= 1) return null;

  return (
    <nav className="pagination" aria-label={label}>
      <button type="button" className="button-secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Previous
      </button>
      <span aria-live="polite">Page {page} of {totalPages}</span>
      <button type="button" className="button-secondary" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Next
      </button>
    </nav>
  );
}
