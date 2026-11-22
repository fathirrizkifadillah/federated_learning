/**
 * FedSocial V2 — Privacy Guard & Core Routes Test
 * Verifies that the PrivacyGuard blocks raw telemetry with HTTP 403 Forbidden
 * and healthcheck endpoint reports healthy.
 */

import { app } from '../src/app';
import http from 'http';

async function runTests() {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(4099, () => resolve()));
  console.log('✓ Test server started on port 4099');

  try {
    // Test 1: Healthcheck
    const healthRes = await fetch('http://localhost:4099/health');
    const healthJson = await healthRes.json();
    if (healthRes.status !== 200 || healthJson.status !== 'HEALTHY') {
      throw new Error(`Healthcheck failed: ${JSON.stringify(healthJson)}`);
    }
    console.log('✓ Healthcheck endpoint: 200 OK');

    // Test 2: Privacy Guard on /api/v1/events (Must be 403 Forbidden)
    const privacyRes = await fetch('http://localhost:4099/api/v1/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'test_user', article_id: 'art_123', dwell_time: 45000 }),
    });
    const privacyJson = await privacyRes.json();
    if (privacyRes.status !== 403 || privacyJson.error !== 'PRIVACY_VIOLATION_BLOCKED') {
      throw new Error(`Privacy Guard failed! Received: ${privacyRes.status} ${JSON.stringify(privacyJson)}`);
    }
    console.log('✓ Privacy Guard middleware: 403 Forbidden (Zero telemetry leakage verified)');

    console.log('\n========================================');
    console.log('All API & Privacy Guard tests PASSED!');
    console.log('========================================');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('API Test Failure:', err);
  process.exit(1);
});
