//the time ranges the filter offers; comparisonLabel is what the % changes are measured against
export const STATS_RANGES = [
  { value: '7d', label: 'Last 7 days', comparisonLabel: 'previous 7 days' },
  { value: '30d', label: 'Last 30 days', comparisonLabel: 'previous 30 days' },
  { value: '90d', label: 'Last 90 days', comparisonLabel: 'previous 90 days' },
  //no previous period to compare against
  { value: 'all', label: 'All time', comparisonLabel: null },
];

export function getStatsRange(value) {
  return STATS_RANGES.find((range) => range.value === value) ?? STATS_RANGES[1];
}
