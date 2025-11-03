import { tokenMetricsService } from '../services/token-metrics.service';

// Update metrics every 5 minutes
const UPDATE_INTERVAL = 5 * 60 * 1000;

export function startMetricsUpdateJob() {
  console.log('Starting metrics update job...');
  
  // Initial update
  tokenMetricsService.updateAllTokens().catch(console.error);
  
  // Schedule regular updates
  setInterval(() => {
    tokenMetricsService.updateAllTokens().catch(console.error);
  }, UPDATE_INTERVAL);
  
  console.log(`Metrics will be updated every ${UPDATE_INTERVAL / 1000} seconds`);
}