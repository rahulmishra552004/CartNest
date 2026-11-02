const dollars = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const dollarsWithCents = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const compactDollars = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const counts = new Intl.NumberFormat('en-US');

//$12,850
export function formatDollars(cents) {
  return dollars.format(cents / 100);
}

//$12,849.50
export function formatDollarsWithCents(cents) {
  return dollarsWithCents.format(cents / 100);
}

//axis ticks: in full under $10,000 ($2,500), compact above ($25K)
export function formatAxisDollars(cents) {
  const amount = cents / 100;
  return amount >= 10000 ? compactDollars.format(amount) : dollars.format(amount);
}

//1,284
export function formatCount(count) {
  return counts.format(count);
}

//0.876 -> 88%
export function formatShare(fraction) {
  return `${Math.round(fraction * 100)}%`;
}

//12.4 -> +12.4%, -2.3 -> −2.3%
export function formatChange(percent) {
  const sign = percent > 0 ? '+' : percent < 0 ? '−' : '';
  return `${sign}${Math.abs(percent).toFixed(1)}%`;
}
