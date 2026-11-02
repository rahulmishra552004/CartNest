import { STATS_RANGES } from '../statsRanges.js';

export function VendorStatsRangeFilter({ range }) {
  return (
    <div className="vendor-stats-range" role="group" aria-label="Time range">
      {STATS_RANGES.map((option) => (
        <button
          key={option.value}
          type="button"
          className="vendor-stats-range-option"
          aria-pressed={option.value === range}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
