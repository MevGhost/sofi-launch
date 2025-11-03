"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startMetricsUpdateJob = startMetricsUpdateJob;
const token_metrics_service_1 = require("../services/token-metrics.service");
// Update metrics every 5 minutes
const UPDATE_INTERVAL = 5 * 60 * 1000;
function startMetricsUpdateJob() {
    console.log('Starting metrics update job...');
    // Initial update
    token_metrics_service_1.tokenMetricsService.updateAllTokens().catch(console.error);
    // Schedule regular updates
    setInterval(() => {
        token_metrics_service_1.tokenMetricsService.updateAllTokens().catch(console.error);
    }, UPDATE_INTERVAL);
    console.log(`Metrics will be updated every ${UPDATE_INTERVAL / 1000} seconds`);
}
//# sourceMappingURL=update-metrics.job.js.map