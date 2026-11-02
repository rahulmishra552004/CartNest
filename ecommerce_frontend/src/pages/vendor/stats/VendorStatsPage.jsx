import { useEffect, useState } from 'react';
import axios from 'axios';
import { VendorHeader } from '../../header/VendorHeader.jsx';
import { VendorCatalogNavigation } from '../catalog/VendorCatalogNavigation.jsx';
import { VendorStatsHeading } from './components/VendorStatsHeading.jsx';
import { VendorStatsRangeFilter } from './components/VendorStatsRangeFilter.jsx';
import { VendorStatTiles } from './components/VendorStatTiles.jsx';
import { VendorRevenueChart } from './components/VendorRevenueChart.jsx';
import { VendorTopProducts } from './components/VendorTopProducts.jsx';
import { VendorStatusBreakdown } from './components/VendorStatusBreakdown.jsx';
import { VendorLowStock } from './components/VendorLowStock.jsx';
import { getRequestErrorMessage } from '../../../utils/addressErrors.js';
import './VendorStatsPage.css';

const LOAD_ERROR_MESSAGE = "We couldn't load your stats. Please try again.";

export function VendorStatsPage({ user }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  //the stats endpoint returns all-time numbers until the range filter is built
  const range = 'all';

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await axios.get('/api/vendor/stats/');
        setStats(response.data);
      } catch (requestError) {
        setError(getRequestErrorMessage(requestError, LOAD_ERROR_MESSAGE));
      }
    };
    loadStats();
  }, []);

  return (
    <>
      <title>Vendor stats | CartNest</title>
      <VendorHeader user={user} />

      <main className="vendor-stats-page">
        <div className="vendor-stats-page-content">
          <VendorCatalogNavigation />

          <section className="vendor-stats" aria-labelledby="vendor-stats-title">
            <VendorStatsHeading />

            {error ? (
              <section className="vendor-stats-error" role="alert">
                <div className="vendor-stats-error-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 8v5" />
                    <path d="M12 17h.01" />
                    <path d="M10.3 3.7 2.5 17.2A2 2 0 0 0 4.2 20h15.6a2 2 0 0 0 1.7-2.8L13.7 3.7a2 2 0 0 0-3.4 0Z" />
                  </svg>
                </div>
                <div className="vendor-stats-error-copy">
                  <h2>We couldn’t load your stats</h2>
                  <p>{error}</p>
                </div>
              </section>
            ) : stats && (
              <>
                <VendorStatsRangeFilter range={range} />

                <VendorStatTiles summary={stats} range={range} />

                <VendorRevenueChart graph={stats.graph} range={range} />

                <div className="vendor-stats-row">
                  <VendorTopProducts products={stats.topProducts} range={range} />
                  <VendorStatusBreakdown summary={stats} />
                </div>

                <VendorLowStock products={stats.lowStockProducts} threshold={stats.lowStockThreshold} />
              </>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
