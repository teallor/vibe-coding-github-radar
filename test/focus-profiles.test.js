const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SAMPLE = path.join(__dirname, '..', 'examples', 'focus_profiles.json');
const REQUIRED_IDS = ['codex-ai-coding', 'office-automation', 'oss-learning'];
const CURRENT_WEIGHT_KEYS = [
  'vibeCodingLearning',
  'officeAutomation',
  'monetizationPotential',
  'codexFriendly',
  'beginnerFriendly',
  'localFirst',
  'activity',
  'license'
];

test('focus profile sample is safe, complete, and maps to current scoring keys', () => {
  const catalog = JSON.parse(fs.readFileSync(SAMPLE, 'utf8'));

  assert.equal(catalog.formatVersion, 1);
  assert.equal(catalog.integrationStatus, 'sample-only');
  assert.deepEqual(catalog.profiles.map(profile => profile.id), REQUIRED_IDS);

  for (const profile of catalog.profiles) {
    assert.ok(profile.keywords.length >= 3, `${profile.id} needs useful keywords`);
    assert.ok(profile.exclude_keywords.length >= 3, `${profile.id} needs exclusions`);
    assert.ok(profile.preferred_evidence.length >= 3, `${profile.id} needs evidence guidance`);
    assert.ok(profile.report_focus.length >= 20, `${profile.id} needs report guidance`);
    assert.deepEqual(Object.keys(profile.scoring_weights), CURRENT_WEIGHT_KEYS);
    assert.equal(
      Object.values(profile.scoring_weights).reduce((total, value) => total + value, 0),
      100,
      `${profile.id} weights should total 100`
    );
  }

  const serialized = JSON.stringify(catalog).toLowerCase();
  for (const forbidden of ['api_key', 'apikey', 'token', 'webhook', 'cookie', 'password']) {
    assert.equal(serialized.includes(`"${forbidden}"`), false, `sample must not define ${forbidden}`);
  }
});
