const assert = require('assert');
const { once } = require('events');
const { createServer } = require('../workers/feishu-feedback-cloud-run');

(async () => {
  const server = createServer({ FEISHU_VERIFICATION_TOKEN: 'verify-token' });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();

  try {
    const health = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { ok: true, service: 'feishu-feedback-worker' });

    const challenge = await fetch(`http://127.0.0.1:${port}/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'url_verification', token: 'verify-token', challenge: 'cloud-run-ok' }),
    });
    assert.equal(challenge.status, 200);
    assert.deepEqual(await challenge.json(), { challenge: 'cloud-run-ok' });
  } finally {
    server.close();
    await once(server, 'close');
  }

  console.log('PASS: Cloud Run adapter health and Feishu challenge');
})().catch(error => { console.error(error); process.exit(1); });
