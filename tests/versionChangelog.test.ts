/**
 * Version changelog is intentionally disabled; never emit a release announcement.
 * Run: npx tsx tests/versionChangelog.test.ts
 */
import assert from 'node:assert/strict';
import { buildVersionAnnounceMessage, getVersionChangelogBody } from '../src/bot/versionChangelog';

for (const version of ['3.4.3', '99.99.99', '1.1.0']) {
    assert.equal(getVersionChangelogBody(version), null);
    assert.equal(buildVersionAnnounceMessage(version), null);
}

const previous = process.env.VERSION_CHANGELOG;
const previousFor = process.env.VERSION_CHANGELOG_FOR;
process.env.VERSION_CHANGELOG = 'Custom release note';
process.env.VERSION_CHANGELOG_FOR = '9.9.8';
assert.equal(getVersionChangelogBody('9.9.8'), null);
assert.equal(buildVersionAnnounceMessage('9.9.8'), null);

if (previous === undefined) delete process.env.VERSION_CHANGELOG;
else process.env.VERSION_CHANGELOG = previous;
if (previousFor === undefined) delete process.env.VERSION_CHANGELOG_FOR;
else process.env.VERSION_CHANGELOG_FOR = previousFor;

console.log('versionChangelog.test.ts: disabled announcement behavior verified');
