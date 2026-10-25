export function errorMessage(value) {
  if (Array.isArray(value)) {
    return value.filter((message) => typeof message === 'string').join(' ');
  }
  return typeof value === 'string' ? value : '';
}

export function accountError(error) {
  const status = error.response?.status;
  const data = error.response?.data;
  if (!error.response) return 'Unable to reach the server. Check your connection and try again.';
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return errorMessage(data?.detail) || 'Your security check failed. Refresh the page and try again.';
  if (status === 409) return errorMessage(data?.detail) || 'Your account could not be updated. Please contact support.';
  if (status === 429) return 'Too many attempts. Please wait a moment and try again.';
  if (status === 400) {
    return errorMessage(data?.detail)
      || errorMessage(data?.non_field_errors)
      || errorMessage(data?.user?.non_field_errors)
      || errorMessage(data?.vendor?.non_field_errors)
      || 'Please check the highlighted fields and try again.';
  }
  return 'Unable to complete your request right now. Please try again later.';
}
