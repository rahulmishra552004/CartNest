import dayjs from 'dayjs';
import { formatAxisDollars, formatDollars, formatDollarsWithCents } from '../formatStats.js';
import { getStatsRange } from '../statsRanges.js';

const TICK_COUNT = 4;
const MAX_X_LABELS = 6;

//rounds the axis up to a clean step: 1, 2, 2.5 or 5 × a power of ten
function getNiceStep(maxValue) {
  if (maxValue <= 0) {
    return 2500;
  }
  const roughStep = maxValue / TICK_COUNT;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  return [1, 2, 2.5, 5, 10].map((multiple) => multiple * magnitude).find((step) => step >= roughStep);
}

//graph: one { day: 'YYYY-MM-DD', revenue: cents } per UTC day, oldest first, days without sales included
export function VendorRevenueChart({ graph, range }) {
  const { label: rangeLabel } = getStatsRange(range);

  const maxRevenue = Math.max(0, ...graph.map((point) => point.revenue));
  const step = getNiceStep(maxRevenue);
  const axisMax = step * TICK_COUNT;
  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, index) => index * step);
  const peakIndex = maxRevenue > 0
    ? graph.findIndex((point) => point.revenue === maxRevenue)
    : -1;
  const labelEvery = Math.max(1, Math.ceil(graph.length / MAX_X_LABELS));
  const lastIndex = graph.length - 1;

  return (
    <section className="vendor-stats-card" aria-labelledby="vendor-revenue-title">
      <header className="vendor-stats-card-header">
        <h2 id="vendor-revenue-title">Revenue over time</h2>
        <p>Daily revenue · {rangeLabel}</p>
      </header>

      {/* a fixed range sends a bar for every day, so "no sales" can also mean all bars are 0 */}
      {maxRevenue === 0 ? (
        <p className="vendor-stats-empty">No sales in this period yet. Your daily revenue will show up here.</p>
      ) : (
        <>
          <div className="vendor-revenue-chart">
            <div className="vendor-revenue-y-axis" aria-hidden="true">
              {ticks.map((tick) => (
                <span key={tick} style={{ bottom: `${(tick / axisMax) * 100}%` }}>
                  {formatAxisDollars(tick)}
                </span>
              ))}
            </div>

            <div className="vendor-revenue-plot">
              <div className="vendor-revenue-gridlines" aria-hidden="true">
                {ticks.map((tick) => (
                  <span key={tick} style={{ bottom: `${(tick / axisMax) * 100}%` }} />
                ))}
              </div>

              <ol className="vendor-revenue-columns">
                {graph.map((point, index) => {
                  const dateLabel = dayjs(point.day).format('MMM D');
                  const tooltipAlign = index < 3 ? ' vendor-chart-tooltip-start'
                    : index > lastIndex - 3 ? ' vendor-chart-tooltip-end'
                    : '';

                  return (
                    <li
                      key={point.day}
                      className="vendor-revenue-slot"
                      style={{ '--height': `${(point.revenue / axisMax) * 100}%` }}
                      tabIndex={0}
                      aria-label={`${dateLabel}: ${formatDollarsWithCents(point.revenue)}`}
                    >
                      <span className="vendor-revenue-column" />

                      {index === peakIndex && (
                        <span className="vendor-revenue-peak" aria-hidden="true">{formatDollars(point.revenue)}</span>
                      )}

                      <span className={`vendor-chart-tooltip${tooltipAlign}`} aria-hidden="true">
                        <strong>{formatDollarsWithCents(point.revenue)}</strong>
                        <span>{dayjs(point.day).format('ddd, MMM D')}</span>
                      </span>

                      {index % labelEvery === 0 && (
                        <span className="vendor-revenue-x-label" aria-hidden="true">{dateLabel}</span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          <details className="vendor-chart-table">
            <summary>Show data table</summary>
            <div className="vendor-chart-table-scroll">
              <table>
                <caption className="vendor-stats-visually-hidden">Daily revenue, {rangeLabel.toLowerCase()}</caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {graph.map((point) => (
                    <tr key={point.day}>
                      <td>{dayjs(point.day).format('ddd, MMM D, YYYY')}</td>
                      <td>{formatDollarsWithCents(point.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
