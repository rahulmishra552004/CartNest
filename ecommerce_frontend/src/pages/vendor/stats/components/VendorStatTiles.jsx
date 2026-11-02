import { formatChange, formatCount, formatDollars, formatDollarsWithCents } from '../formatStats.js';
import { getStatsRange } from '../statsRanges.js';

const ICONS = {
  revenue: (
    <>
      <path d="M12 3v18" />
      <path d="M16.5 7.5c-.6-1.4-2.3-2.3-4.5-2.3-2.6 0-4.3 1.3-4.3 3.1 0 4.4 9 2.4 9 7 0 1.9-1.9 3.3-4.7 3.3-2.4 0-4.2-1-4.8-2.6" />
    </>
  ),
  units: (
    <>
      <path d="m3.5 7.5 8.5-4.5 8.5 4.5v9L12 21l-8.5-4.5Z" />
      <path d="m3.5 7.5 8.5 4.5 8.5-4.5M12 12v9" />
    </>
  ),
  orders: (
    <>
      <path d="M6 3.5h12a2 2 0 0 1 2 2v15l-3-2-2.5 2-2.5-2-2.5 2-2.5-2-3 2v-15a2 2 0 0 1 2-2Z" />
      <path d="M8 8h8M8 12h8" />
    </>
  ),
  average: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
};

function StatChange({ change, comparisonLabel }) {
  const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';

  return (
    <p className={`vendor-stat-change vendor-stat-change-${direction}`}>
      {direction !== 'flat' && (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {direction === 'up' ? <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" /> : <path d="M8 3v10M3.5 8.5 8 13l4.5-4.5" />}
        </svg>
      )}
      <span className="vendor-stat-change-value">{formatChange(change)}</span>
      <span className="vendor-stat-change-period">vs {comparisonLabel}</span>
    </p>
  );
}

export function VendorStatTiles({ summary, range }) {
  const { comparisonLabel } = getStatsRange(range);

  //add a `change` (% vs the previous period) to a tile once the endpoint sends one
  const tiles = [
    {
      label: 'Total revenue',
      value: formatDollars(summary.totalRevenueCents),
      icon: 'revenue',
    },
    {
      label: 'Units sold',
      value: formatCount(summary.unitsSold),
      icon: 'units',
    },
    {
      label: 'Orders',
      value: formatCount(summary.ordersCount),
      icon: 'orders',
    },
    {
      label: 'Average order value',
      value: formatDollarsWithCents(summary.avgOrderValue),
      icon: 'average',
    },
  ];

  return (
    <ul className="vendor-stat-tiles">
      {tiles.map((tile) => (
        <li key={tile.label} className="vendor-stat-tile">
          <div className="vendor-stat-tile-top">
            <p className="vendor-stat-label">{tile.label}</p>
            <span className="vendor-stat-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                {ICONS[tile.icon]}
              </svg>
            </span>
          </div>

          <p className="vendor-stat-value">{tile.value}</p>

          {tile.change != null && comparisonLabel && (
            <StatChange change={tile.change} comparisonLabel={comparisonLabel} />
          )}
        </li>
      ))}
    </ul>
  );
}
