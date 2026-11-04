//must match page_size in ecommerce_backend/config/pagination.py
export const PAGE_SIZE = 24;

export function getPage(searchParams) {
  return Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
}

export function withPage(searchParams, page) {
  const nextParams = new URLSearchParams(searchParams);
  if (page === 1) {
    nextParams.delete('page');
  } else {
    nextParams.set('page', String(page));
  }
  return nextParams;
}

export function isMissingPage(requestError, page) {
  return requestError?.response?.status === 404 && page > 1;
}
