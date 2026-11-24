/**
 * FedSocial V3 — Privacy Guard, Browser-Native FL Aggregator & Zero-Knowledge E2EE Tests
 */

import http from 'http';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';

async function runTests() {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(4099, () => resolve()));
  console.log('✓ Test server started on port 4099');

  try {
    // 1. Healthcheck
    const healthRes = await fetch('http://localhost:4099/health');
    const healthJson = await healthRes.json();
    if (healthRes.status !== 200 || healthJson.status !== 'HEALTHY') {
      throw new Error(`Healthcheck failed: ${JSON.stringify(healthJson)}`);
    }
    console.log('✓ Healthcheck endpoint: 200 OK');

    // 2. Privacy Guard on /api/v1/events
    const privacyRes = await fetch('http://localhost:4099/api/v1/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'test_user', article_id: 'art_123', dwell_time: 45000 }),
    });
    const privacyJson = await privacyRes.json();
    if (privacyRes.status !== 403 || privacyJson.error !== 'PRIVACY_VIOLATION_BLOCKED') {
      throw new Error(`Privacy Guard failed: ${privacyRes.status}`);
    }
    console.log('✓ Privacy Guard /events: 403 PRIVACY_VIOLATION_BLOCKED');

    // 3. FL Firewall rejects raw telemetry or userEmbedding in /fl/submit-delta
    const leakDeltaRes = await fetch('http://localhost:4099/api/v1/fl/submit-delta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseRound: 1,
        sampleCount: 5,
        localLoss: 0.42,
        categoryWeightsDelta: Array.from({ length: 3 }, () => Array(16).fill(0.01)),
        categoryBiasDelta: [0.01, 0, -0.01],
        userEmbedding: Array(16).fill(0.5),
      }),
    });
    const leakDeltaJson = await leakDeltaRes.json();
    if (leakDeltaRes.status !== 403 || leakDeltaJson.error !== 'PRIVACY_VIOLATION_BLOCKED') {
      throw new Error(`FL Firewall failed to block userEmbedding: ${leakDeltaRes.status} ${JSON.stringify(leakDeltaJson)}`);
    }
    console.log('✓ FL Firewall /fl/submit-delta blocks userEmbedding: 403 PRIVACY_VIOLATION_BLOCKED');

    // 4. FL Poisoning Norm Protection (> 5.0 L2 norm rejected)
    const poisonRes = await fetch('http://localhost:4099/api/v1/fl/submit-delta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseRound: 1,
        sampleCount: 5,
        localLoss: 0.42,
        categoryWeightsDelta: Array.from({ length: 3 }, () => Array(16).fill(10.0)),
        categoryBiasDelta: [0, 0, 0],
      }),
    });
    const poisonJson = await poisonRes.json();
    if (poisonRes.status !== 400 || poisonJson.error !== 'DELTA_NORM_EXCEEDED') {
      throw new Error(`FL Norm Guard failed: ${poisonRes.status} ${JSON.stringify(poisonJson)}`);
    }
    console.log('✓ FL Norm Clipping Guard blocks poisoning delta: 400 DELTA_NORM_EXCEEDED');

    // 5. Valid Browser-Native Bilingual FL Aggregation Round
    const gmBefore = await (await fetch('http://localhost:4099/api/v1/fl/global-model')).json();
    const startRound = gmBefore.data.roundNumber;

    const validDeltaRes = await fetch('http://localhost:4099/api/v1/fl/submit-delta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseRound: startRound,
        sampleCount: 4,
        localLoss: 0.4821,
        categoryWeightsDelta: Array.from({ length: 3 }, () => Array(16).fill(0.01)),
        categoryBiasDelta: [0.02, -0.01, 0.0],
        languageWeightsDelta: Array.from({ length: 2 }, () => Array(16).fill(0.01)),
        languageBiasDelta: [0.015, -0.015],
        dpNoiseSigma: 0.01,
        clientDigest: 'test-suite-worker',
      }),
    });
    const validDeltaJson = await validDeltaRes.json();
    if (
      validDeltaRes.status !== 200 ||
      validDeltaJson.data.roundNumber !== startRound + 1 ||
      validDeltaJson.data.sharedDeltaBytes !== 340 ||
      validDeltaJson.data.rawLeakageBytes !== 0
    ) {
      throw new Error(`Valid FL submission failed: ${validDeltaRes.status} ${JSON.stringify(validDeltaJson)}`);
    }
    console.log(`✓ Valid Browser-Native Bilingual FL Aggregation: Round #${startRound} -> #${validDeltaJson.data.roundNumber} (340B delta, 0B raw leakage)`);

    // 6. E2EE Account Sync Security Tests (unauth 401, plaintext rejected 400, valid ciphertext 200)
    const unauthRes = await fetch('http://localhost:4099/api/v1/fl/e2ee-profile');
    if (unauthRes.status !== 401) {
      throw new Error(`Expected 401 on unauthenticated E2EE GET, got ${unauthRes.status}`);
    }
    console.log('✓ E2EE Account Vault requires auth: 401 Unauthorized');

    const loginRes = await fetch('http://localhost:4099/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'fathir@fedsocial.local', password: 'password123' }),
    });
    const loginJson = await loginRes.json();
    const jwtToken = loginJson.token;
    if (!jwtToken) throw new Error('Demo login failed in test suite');

    // Preserve any existing live E2EE vault before running test round-trip
    const existingE2ee = await (
      await fetch('http://localhost:4099/api/v1/fl/e2ee-profile', {
        headers: { Authorization: `Bearer ${jwtToken}` },
      })
    ).json();

    const plaintextRes = await fetch('http://localhost:4099/api/v1/fl/e2ee-profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({
        encryptedProfileBlob: '{"topicWeights":{"ai":0.9}}',
        encryptionIv: 'MTIzNDU2Nzg5MDEy',
        encryptionSalt: 'MTIzNDU2Nzg5MDEyMzQ1Ng==',
      }),
    });
    const plaintextJson = await plaintextRes.json();
    if (plaintextRes.status !== 400 || plaintextJson.error !== 'PLAINTEXT_REJECTED') {
      throw new Error(`E2EE failed to reject plaintext JSON: ${plaintextRes.status} ${JSON.stringify(plaintextJson)}`);
    }
    console.log('✓ E2EE Zero-Knowledge Guard rejects plaintext JSON: 400 PLAINTEXT_REJECTED');

    const fakeCipher = Buffer.from('opaque-aes-256-gcm-authenticated-ciphertext-payload').toString('base64');
    const saveE2eeRes = await fetch('http://localhost:4099/api/v1/fl/e2ee-profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({
        encryptedProfileBlob: fakeCipher,
        encryptionIv: 'MTIzNDU2Nzg5MDEy',
        encryptionSalt: 'MTIzNDU2Nzg5MDEyMzQ1Ng==',
      }),
    });
    if (saveE2eeRes.status !== 200) {
      throw new Error(`E2EE valid ciphertext save failed: ${saveE2eeRes.status}`);
    }
    const readE2eeJson = await (
      await fetch('http://localhost:4099/api/v1/fl/e2ee-profile', {
        headers: { Authorization: `Bearer ${jwtToken}` },
      })
    ).json();
    if (!readE2eeJson.data.hasEncryptedProfile || readE2eeJson.data.encryptedProfileBlob !== fakeCipher) {
      throw new Error('E2EE round-trip mismatch!');
    }
    // Verify GDPR Right to Erasure endpoint
    const delRes = await fetch('http://localhost:4099/api/v1/fl/e2ee-profile', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${jwtToken}` },
    });
    if (delRes.status !== 200) throw new Error('E2EE GDPR erasure failed');

    // Restore user's prior encrypted vault if it existed before the test run
    if (existingE2ee?.data?.hasEncryptedProfile && existingE2ee.data.encryptedProfileBlob) {
      await fetch('http://localhost:4099/api/v1/fl/e2ee-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({
          encryptedProfileBlob: existingE2ee.data.encryptedProfileBlob,
          encryptionIv: existingE2ee.data.encryptionIv,
          encryptionSalt: existingE2ee.data.encryptionSalt,
        }),
      });
    }
    console.log('✓ E2EE AES-GCM Ciphertext Save + Cross-Device Fetch + GDPR Erasure: 200 OK');

    console.log('\n=====================================================');
    console.log('All API, Privacy Guard, FL & E2EE Tests PASSED! (6/6)');
    console.log('=====================================================');
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error('API Test Failure:', err);
  process.exit(1);
});
